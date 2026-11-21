/*
  GLOWRIST front end
  Talks to GloomEuro (ERC-20) and GlowristPreorder (ERC-721 + escrow)
*/

const G = {
  cfg: null,
  euro: null, pre: null,        // read contracts
  euroW: null, preW: null,      // write contracts (signer)
  owner: null, verifier: null,
  batches: [],
  reserveBatchId: null
};

const STATUS = ["Open", "Arrived", "Cancelled"];
const MILESTONES = ["Planted & growing", "Harvested & shipped", "Arrived in Dublin"];
const MS_PCT = [30, 40, 30];

const SAMPLE_BATCHES = [
  { id: 1, name: "Valentine Red Roses", origin: "Naivasha, Kenya", totalStems: 10000n, reservedStems: 6200n, pricePerStem: 150n, growerCostPerStem: 50n, deliveryDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 40), grower: "0x0000000000000000000000000000000000000000", milestonesPaid: 1, escrowBalance: 780000n, growerPaid: 150000n, status: 0 },
  { id: 2, name: "Blush Wedding Peonies", origin: "Aalsmeer, Netherlands", totalStems: 3000n, reservedStems: 1150n, pricePerStem: 320n, growerCostPerStem: 120n, deliveryDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 75), grower: "0x0000000000000000000000000000000000000000", milestonesPaid: 0, escrowBalance: 368000n, growerPaid: 0n, status: 0 },
  { id: 3, name: "Mother's Day Tulips", origin: "Co. Wexford, Ireland", totalStems: 5000n, reservedStems: 5000n, pricePerStem: 110n, growerCostPerStem: 35n, deliveryDeadline: BigInt(Math.floor(Date.now() / 1000) + 86400 * 4), grower: "0x0000000000000000000000000000000000000000", milestonesPaid: 3, escrowBalance: 0n, growerPaid: 175000n, status: 1 }
];

/* ---------------- boot ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  G.cfg = getConfig();
  const swag = $("#swag");
  const redraw = () => drawSwag(swag, { swags: Math.max(2, Math.round(window.innerWidth / 330)), depth: 34 });
  redraw();
  window.addEventListener("resize", () => { clearTimeout(window._sw); window._sw = setTimeout(redraw, 150); });

  $("#btn-connect").onclick = () => Wallet.connect();
  $("#btn-settings").onclick = openSettings;
  $("#notice-settings").onclick = (e) => { e.preventDefault(); openSettings(); };
  $("#btn-switch").onclick = () => Wallet.switchNetwork();
  $("#btn-refresh").onclick = refreshAll;
  $("#st-save").onclick = saveSettingsForm;
  $("#st-reset").onclick = () => { clearSettings(); toast("Settings reset", "success"); setTimeout(() => location.reload(), 600); };
  $("#rv-stems").oninput = updateReserveTotal;
  $("#rv-go").onclick = doReserve;

  setupOfficeForms();
  fillCidPickers();

  Wallet.onChange(onWallet);
  await Wallet.init();
});

function contractsReady() {
  return ethers.isAddress(G.cfg.glowrist.gloomEuro || "") && ethers.isAddress(G.cfg.glowrist.preorder || "");
}

async function onWallet() {
  const btn = $("#btn-connect");
  $("#net-name").textContent = G.cfg.network.name;

  if (Wallet.account) {
    btn.textContent = fmt.short(Wallet.account);
    btn.classList.add("connected");
    $("#rb-account").textContent = fmt.short(Wallet.account);
    $("#rb-network").textContent = Wallet.isRightNetwork() ? G.cfg.network.name : "Wrong network (" + Wallet.chainId + ")";
    $("#network-notice").classList.toggle("hidden", Wallet.isRightNetwork());
  }

  $("#setup-notice").classList.toggle("hidden", contractsReady());

  if (contractsReady() && Wallet.provider && (!Wallet.account || Wallet.isRightNetwork())) {
    G.euro = contractAt(G.cfg.glowrist.gloomEuro, ABIS.GloomEuro);
    G.pre = contractAt(G.cfg.glowrist.preorder, ABIS.GlowristPreorder);
    G.euroW = contractAt(G.cfg.glowrist.gloomEuro, ABIS.GloomEuro, true);
    G.preW = contractAt(G.cfg.glowrist.preorder, ABIS.GlowristPreorder, true);
  }
  await refreshAll();
}

async function refreshAll() {
  if (!G.pre) {
    renderBatches(SAMPLE_BATCHES, true);
    return;
  }
  try {
    [G.owner, G.verifier] = await Promise.all([G.pre.owner(), G.pre.verifier()]);
    const total = Number(await G.pre.totalBatches());
    const list = [];
    for (let i = 1; i <= total; i++) {
      const b = await G.pre.getBatch(i);
      list.push(batchObj(i, b));
    }
    G.batches = list;
    renderBatches(list, false);
    await renderRoles();
    await renderGarden();
  } catch (e) {
    console.error(e);
    $("#batch-grid").innerHTML = `<p class="empty">Could not read the contract. Check the address and network in Settings.<br><small>${fmt.esc(errorText(e))}</small></p>`;
  }
}

function batchObj(id, b) {
  return {
    id, name: b.name, origin: b.origin, totalStems: b.totalStems, reservedStems: b.reservedStems,
    pricePerStem: b.pricePerStem, growerCostPerStem: b.growerCostPerStem, deliveryDeadline: b.deliveryDeadline,
    grower: b.grower, milestonesPaid: Number(b.milestonesPaid), escrowBalance: b.escrowBalance, growerPaid: b.growerPaid,
    status: Number(b.status), reservationCID: b.reservationCID, keepsakeCID: b.keepsakeCID
  };
}

function isLate(b) { return b.status === 0 && Number(b.deliveryDeadline) * 1000 < Date.now(); }
const eur = (c) => fmt.cents(c, "€");

/* ---------------- batches ---------------- */

function statusTag(b, sample) {
  if (sample) return `<span class="packet-tag sample">Sample</span>`;
  if (b.status === 1) return `<span class="packet-tag arrived">Arrived · collect</span>`;
  if (b.status === 2) return `<span class="packet-tag cancelled">Cancelled · refunds</span>`;
  if (isLate(b)) return `<span class="packet-tag late">Late · refunds open</span>`;
  if (b.reservedStems >= b.totalStems) return `<span class="packet-tag">Fully reserved</span>`;
  return `<span class="packet-tag">Open</span>`;
}

function vine(b) {
  let html = `<div class="vine">`;
  for (let i = 0; i < 3; i++) {
    const done = b.milestonesPaid > i;
    if (i > 0) html += `<div class="stem ${done ? "done" : ""}"></div>`;
    html += `<div class="node ${done ? "done" : ""}"><div class="dot">${done ? "✓" : ""}</div><small>${MILESTONES[i]}<br>${MS_PCT[i]}%</small></div>`;
  }
  return html + `</div>`;
}

function renderBatches(list, sample) {
  const grid = $("#batch-grid");
  if (!list.length) {
    grid.innerHTML = `<p class="empty">No harvest batches yet. The shop owner can create one in the Shop Office.</p>`;
    return;
  }
  grid.innerHTML = list.map(b => {
    const left = b.totalStems - b.reservedStems;
    const pct = Number(b.reservedStems * 100n / (b.totalStems || 1n));
    const canReserve = !sample && b.status === 0 && !isLate(b) && b.milestonesPaid < 2 && left > 0n;
    return `
    <article class="packet">
      <div class="packet-top">
        <span class="packet-no">No. ${String(b.id).padStart(3, "0")}</span>
        ${statusTag(b, sample)}
        ${bouquetSVG(flowerFor(b.name), 150)}
      </div>
      <div class="packet-body">
        <h3>${fmt.esc(b.name)}</h3>
        <div class="origin">grown in ${fmt.esc(b.origin)}</div>
        <div class="facts">
          <div><span>Price</span><b>${eur(b.pricePerStem)} / stem</b></div>
          <div><span>Deadline</span><b>${fmt.date(b.deliveryDeadline)}</b></div>
          <div><span>Escrow</span><b>${eur(b.escrowBalance)}</b></div>
          <div><span>Grower paid</span><b>${eur(b.growerPaid)}</b></div>
        </div>
        <div class="stock-bar"><i style="width:${pct}%"></i></div>
        <div class="stock-text"><span>${Number(b.reservedStems).toLocaleString()} reserved</span><span>${Number(left).toLocaleString()} stems left</span></div>
        ${vine(b)}
        <button class="btn btn-rose" ${canReserve ? "" : "disabled"} onclick="openReserve(${b.id})">${sample ? "Sample batch" : canReserve ? "Reserve stems" : b.status === 1 ? "Arrived in Dublin" : "Not taking orders"}</button>
      </div>
    </article>`;
  }).join("");

  // owner "manage" dropdown
  const sel = $("#manage-batch");
  if (sel && !sample) sel.innerHTML = list.map(b => `<option value="${b.id}">#${b.id} ${fmt.esc(b.name)} (${STATUS[b.status]})</option>`).join("");
}

/* ---------------- reserve ---------------- */

function openReserve(id) {
  if (!Wallet.account) { Wallet.connect(); return; }
  const b = G.batches.find(x => x.id === id);
  if (!b) return;
  G.reserveBatchId = id;
  $("#rv-title").textContent = b.name;
  $("#rv-sub").textContent = `${b.origin} · ${eur(b.pricePerStem)} per stem · ${Number(b.totalStems - b.reservedStems).toLocaleString()} stems left`;
  $("#rv-stems").max = Number(b.totalStems - b.reservedStems);
  $("#rv-step1").className = ""; $("#rv-step2").className = "";
  updateReserveTotal();
  openModal("modal-reserve");
}

function updateReserveTotal() {
  const b = G.batches.find(x => x.id === G.reserveBatchId);
  if (!b) return;
  const stems = BigInt(Math.max(0, parseInt($("#rv-stems").value || "0", 10)));
  $("#rv-total").textContent = eur(stems * b.pricePerStem);
}

async function doReserve() {
  const b = G.batches.find(x => x.id === G.reserveBatchId);
  const stems = BigInt(parseInt($("#rv-stems").value || "0", 10));
  if (!b || stems <= 0n) return toast("Enter the number of stems.", "error");
  const cost = stems * b.pricePerStem;
  const bal = await G.euro.balanceOf(Wallet.account);
  if (bal < cost) return toast(`Not enough GloomEuro. You have ${eur(bal)}, need ${eur(cost)}. Ask the shop for test funds.`, "error", 9000);

  const btn = $("#rv-go");
  btn.disabled = true;
  try {
    const allowance = await G.euro.allowance(Wallet.account, G.cfg.glowrist.preorder);
    $("#rv-step1").className = "active";
    if (allowance < cost) {
      const r1 = await sendTx("Approve GloomEuro", () => G.euroW.approve(G.cfg.glowrist.preorder, cost));
      if (!r1) return;
    }
    $("#rv-step1").className = "done"; $("#rv-step2").className = "active";
    const r2 = await sendTx(`Reserve ${stems} stems`, () => G.preW.reserve(b.id, stems));
    if (!r2) return;
    $("#rv-step2").className = "done";
    closeModal("modal-reserve");
    toast("🌹 Reserved! Your NFT is in <b>My Garden</b>.", "success");
    await refreshAll();
    location.hash = "#garden";
  } finally {
    btn.disabled = false;
  }
}

/* ---------------- my garden ---------------- */

async function renderGarden() {
  const body = $("#garden-body");
  if (!Wallet.account) return;
  const ids = await G.pre.tokensOf(Wallet.account);
  const reservations = [], keepsakes = [];
  for (const idBig of ids) {
    const id = Number(idBig);
    const kind = Number(await G.pre.tokenKind(id));
    if (kind === 0) {
      const r = await G.pre.getReservation(id);
      reservations.push({ id, batchId: Number(r.batchId), stems: r.stems, amountPaid: r.amountPaid });
    } else {
      keepsakes.push({ id, batchId: Number(await G.pre.keepsakeBatch(id)) });
    }
  }

  const ticketHTML = reservations.length ? reservations.map(r => {
    const b = G.batches.find(x => x.id === r.batchId) || {};
    let status = `<span class="ticket-status wait">Growing · stage ${b.milestonesPaid}/3</span>`, action = "";
    if (b.status === 1) {
      status = `<span class="ticket-status ready">Ready to collect in store</span>`;
      action = `<button class="btn btn-sage btn-sm" onclick="collect(${r.id})">Collect flowers</button>`;
    } else if (b.status === 2 || isLate(b)) {
      status = `<span class="ticket-status refund">${b.status === 2 ? "Batch cancelled" : "Deadline passed"} · refund available</span>`;
      action = `<button class="btn btn-danger btn-sm" onclick="refund(${r.id})">Claim refund ${eur(r.amountPaid)}</button>`;
    }
    return `
      <div class="ticket">
        <div class="ticket-stub"><b>${Number(r.stems).toLocaleString()}</b><span>stems</span></div>
        <div class="ticket-main">
          <h4>${fmt.esc(b.name || "Batch #" + r.batchId)}</h4>
          <p>Reservation NFT #${r.id} · ${fmt.esc(b.origin || "")}</p>
          <p>Paid into escrow: <b>${eur(r.amountPaid)}</b> · deadline ${fmt.date(b.deliveryDeadline)}</p>
          ${status}
          <div>${action}</div>
        </div>
      </div>`;
  }).join("") : `<p class="muted"><i>No reservations yet. Choose a harvest batch above.</i></p>`;

  const keepHTML = keepsakes.length ? keepsakes.map(k => {
    const b = G.batches.find(x => x.id === k.batchId) || {};
    return `<div class="polaroid" data-cid="${fmt.esc(b.keepsakeCID || "")}" data-flower="${flowerFor(b.name)}">
      <div class="pic">${bouquetSVG(flowerFor(b.name), 120)}</div>
      <p>${fmt.esc(b.name || "Keepsake")}</p>
      <small>NFT #${k.id} · ${fmt.esc(b.origin || "")}</small>
    </div>`;
  }).join("") : `<p class="muted"><i>Collect a reservation to receive a keepsake NFT of your flowers.</i></p>`;

  body.innerHTML = `
    <div class="garden-cols">
      <div><h3 class="col-title">Reservations</h3>${ticketHTML}</div>
      <div><h3 class="col-title">Keepsakes</h3><div class="keepsakes">${keepHTML}</div></div>
    </div>`;

  // load keepsake pictures from Pinata
  $all(".polaroid[data-cid]").forEach(async el => {
    const cid = el.dataset.cid;
    if (!cid) return;
    const meta = await loadFromCID(cid);
    if (meta && meta.image && !meta.failed) {
      el.querySelector(".pic").innerHTML = `<img src="${meta.image}" alt="Keepsake flower" onerror="this.remove()">`;
    }
  });
}

async function collect(id) {
  const r = await sendTx(`Collect flowers (NFT #${id})`, () => G.preW.collectFlowers(id));
  if (r) { toast("💐 Enjoy your flowers! A keepsake NFT has been added to your garden.", "success"); refreshAll(); }
}
async function refund(id) {
  const r = await sendTx(`Refund reservation #${id}`, () => G.preW.claimRefund(id));
  if (r) refreshAll();
}

/* ---------------- roles: owner / verifier / grower ---------------- */

async function renderRoles() {
  const me = (Wallet.account || "").toLowerCase();
  const isOwner = me && G.owner && me === G.owner.toLowerCase();
  const isVerifier = me && G.verifier && me === G.verifier.toLowerCase();
  const myBatches = G.batches.filter(b => me && b.grower.toLowerCase() === me);
  const isGrower = myBatches.length > 0;

  $("#office").classList.toggle("hidden", !isOwner);
  $("#verifier").classList.toggle("hidden", !isVerifier);
  $("#grower").classList.toggle("hidden", !isGrower);
  $all(".role-link").forEach(a => {
    const r = a.dataset.role;
    a.classList.toggle("hidden", !((r === "owner" && isOwner) || (r === "verifier" && isVerifier) || (r === "grower" && isGrower)));
  });
  $("#rb-roles").innerHTML =
    (isOwner ? `<span class="role-badge">Shop owner</span>` : "") +
    (isVerifier ? `<span class="role-badge gold">Verifier</span>` : "") +
    (isGrower ? `<span class="role-badge sage">Grower</span>` : "") +
    (!isOwner && !isVerifier && !isGrower && me ? `<span class="role-badge sage">Customer</span>` : "");
  $("#current-verifier").textContent = G.verifier || "-";

  if (Wallet.account && G.euro) {
    $("#rb-balance").textContent = eur(await G.euro.balanceOf(Wallet.account));
  }

  if (isVerifier) {
    const open = G.batches.filter(b => b.status === 0 && b.milestonesPaid < 3);
    $("#verifier-body").innerHTML = open.length ? open.map(b => {
      const next = b.milestonesPaid + 1;
      const commitment = b.totalStems * b.growerCostPerStem;
      const amount = next === 3 ? commitment - b.growerPaid : commitment * BigInt(MS_PCT[next - 1]) / 100n;
      const short = b.escrowBalance < amount;
      return `<div class="verify-row">
        <div><h4>#${b.id} ${fmt.esc(b.name)}</h4>
          <p>Next: <b>Stage ${next} — ${MILESTONES[next - 1]}</b> releases ${eur(amount)} to grower ${fmt.short(b.grower)}.
          Escrow holds ${eur(b.escrowBalance)}${short ? ' <b style="color:#8B2A2A">(too low – shop must top up)</b>' : ""}.</p></div>
        <button class="btn btn-sage btn-sm" onclick="verifyStage(${b.id})">Verify stage ${next}</button>
      </div>`;
    }).join("") : `<p class="empty">No batches are waiting for a check.</p>`;
  }

  if (isGrower) {
    $("#grower-body").innerHTML = `<table class="ledger"><thead><tr><th>Batch</th><th>Commitment</th><th>Stages done</th><th>Paid to you</th><th>Status</th></tr></thead><tbody>
      ${myBatches.map(b => `<tr><td>#${b.id} ${fmt.esc(b.name)}</td><td>${eur(b.totalStems * b.growerCostPerStem)}</td><td>${b.milestonesPaid} / 3</td><td><b>${eur(b.growerPaid)}</b></td><td>${STATUS[b.status]}</td></tr>`).join("")}
    </tbody></table>`;
  }
}

async function verifyStage(id) {
  const r = await sendTx(`Verify milestone for batch #${id}`, () => G.preW.verifyMilestone(id));
  if (r) refreshAll();
}

/* ---------------- shop office ---------------- */

function fillCidPickers() {
  const opts = `<option value="">— choose from Pinata list —</option>` +
    (G.cfg.glowrist.flowerCIDs || []).filter(c => c.cid).map(c => `<option value="${fmt.esc(c.cid)}">${fmt.esc(c.label)}</option>`).join("");
  $all(".cid-pick").forEach(sel => {
    sel.innerHTML = opts;
    sel.onchange = () => { sel.form.elements[sel.dataset.target].value = sel.value; };
  });
}

function setupOfficeForms() {
  const fb = $("#form-batch");
  const d = new Date(Date.now() + 30 * 86400000);
  fb.elements.deadline.value = d.toISOString().slice(0, 10);
  const calc = () => {
    const stems = BigInt(fb.elements.stems.value || 0);
    const price = fmt.toCents(fb.elements.price.value), cost = fmt.toCents(fb.elements.cost.value);
    const commit = stems * cost;
    fb.querySelector("#batch-calc").innerHTML =
      `Grower commitment <b>${eur(commit)}</b> · stage payments ${eur(commit * 30n / 100n)} / ${eur(commit * 40n / 100n)} / ${eur(commit - commit * 30n / 100n - commit * 40n / 100n)} · full sale value ${eur(stems * price)}`;
  };
  ["stems", "price", "cost"].forEach(n => fb.elements[n].addEventListener("input", calc));
  calc();

  fb.onsubmit = async (e) => {
    e.preventDefault();
    if (!G.preW) return toast("Contracts not set. Open Settings.", "error");
    const f = fb.elements;
    if (!ethers.isAddress(f.grower.value.trim())) return toast("Grower wallet is not a valid address.", "error");
    // deadline = end of chosen day (23:59 UTC)
    const deadline = fmt.toUnix(f.deadline.value) + 86399;
    const r = await sendTx("Create batch", () => G.preW.createBatch(
      f.name.value.trim(), f.origin.value.trim(), BigInt(f.stems.value),
      fmt.toCents(f.price.value), fmt.toCents(f.cost.value), deadline,
      f.grower.value.trim(), f.resCid.value.trim(), f.keepCid.value.trim()));
    if (r) { fb.reset(); setupOfficeFormsDefaults(); refreshAll(); }
  };

  $("#form-funds").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    if (!ethers.isAddress(f.to.value.trim())) return toast("Not a valid wallet address.", "error");
    const r = await sendTx("Issue test GloomEuro", () => G.euroW.issueTestFunds(f.to.value.trim(), fmt.toCents(f.amount.value)));
    if (r) refreshAll();
  };

  $("#form-manage").addEventListener("click", async (e) => {
    const act = e.target.dataset.act;
    if (!act) return;
    const f = $("#form-manage").elements;
    const id = Number(f.batch.value);
    if (!id) return toast("Choose a batch.", "error");
    if (act === "topup") {
      const amount = fmt.toCents(f.amount.value);
      const allowance = await G.euro.allowance(Wallet.account, G.cfg.glowrist.preorder);
      if (allowance < amount) {
        const ok = await sendTx("Approve GloomEuro for top-up", () => G.euroW.approve(G.cfg.glowrist.preorder, amount));
        if (!ok) return;
      }
      if (await sendTx(`Top up escrow of batch #${id}`, () => G.preW.topUpEscrow(id, amount))) refreshAll();
    }
    if (act === "withdraw" && await sendTx(`Withdraw revenue batch #${id}`, () => G.preW.withdrawShopRevenue(id))) refreshAll();
    if (act === "cancel") {
      if (!confirm("Cancel this batch? Customers will be able to claim refunds. This cannot be undone.")) return;
      if (await sendTx(`Cancel batch #${id}`, () => G.preW.cancelBatch(id))) refreshAll();
    }
  });

  $("#form-verifier").onsubmit = async (e) => {
    e.preventDefault();
    const v = e.target.elements.verifier.value.trim();
    if (!ethers.isAddress(v)) return toast("Not a valid address.", "error");
    if (await sendTx("Change verifier", () => G.preW.setVerifier(v))) refreshAll();
  };
}

function setupOfficeFormsDefaults() {
  const fb = $("#form-batch");
  fb.elements.stems.value = 10000; fb.elements.price.value = "1.50"; fb.elements.cost.value = "0.50";
  fb.elements.deadline.value = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
}

/* ---------------- settings ---------------- */

function openSettings() {
  const c = getConfig();
  $("#st-gloom").value = c.glowrist.gloomEuro || "";
  $("#st-pre").value = c.glowrist.preorder || "";
  $("#st-chain").value = String(c.network.chainId);
  $("#st-gw").value = c.ipfsGateway || "";
  $("#st-cids").value = (c.glowrist.flowerCIDs || []).map(x => `${x.label} | ${x.cid || ""}`).join("\n");
  openModal("modal-settings");
}

function saveSettingsForm() {
  const chain = Number($("#st-chain").value);
  const names = { 11155111: "Sepolia", 1337: "Ganache", 5777: "Ganache", 31337: "Hardhat" };
  const cids = $("#st-cids").value.split("\n").map(l => l.trim()).filter(Boolean).map(l => {
    const [label, cid] = l.split("|").map(s => (s || "").trim());
    return { label, cid };
  });
  const gloom = $("#st-gloom").value.trim(), pre = $("#st-pre").value.trim();
  if ((gloom && !ethers.isAddress(gloom)) || (pre && !ethers.isAddress(pre))) return toast("One of the addresses is not valid.", "error");
  saveSettings({
    network: { chainId: chain, name: names[chain] || "Local", explorer: chain === 11155111 ? "https://sepolia.etherscan.io" : "#" },
    ipfsGateway: $("#st-gw").value.trim(),
    glowrist: { gloomEuro: gloom, preorder: pre, flowerCIDs: cids }
  });
  toast("Settings saved", "success");
  setTimeout(() => location.reload(), 500);
}
