/*
  SOCIETY CREDIT UNION - TRANCHORYX front end
  Talks to TranchoryxSecurity (ERC-721) and TranchoryxInterest (ERC-20)
*/

const S = {
  cfg: null,
  sec: null, int: null, secW: null, intW: null,
  issuer: null, admin: null,
  me: null,
  approved: false, pending: false,
  all: [],          // every security on the register
  applicants: []
};

const LIFE = ["Active", "Matured", "Redeemed"];
const LIFE_CLASS = ["b-active", "b-matured", "b-redeemed"];
const RED_STATUS = ["Pending", "Settled", "Rejected"];
const cad = (c) => fmt.cents(c, "C$");
const YEAR = 365n * 86400n;

/* ---------------- boot ---------------- */

document.addEventListener("DOMContentLoaded", async () => {
  S.cfg = getConfig();

  $all("#tabs button").forEach(b => b.onclick = () => showTab(b.dataset.tab));
  $all("[data-goto]").forEach(b => b.onclick = () => showTab(b.dataset.goto));
  $("#btn-connect").onclick = () => Wallet.connect();
  $("#btn-settings").onclick = openSettings;
  $("#notice-settings").onclick = (e) => { e.preventDefault(); openSettings(); };
  $("#btn-switch").onclick = () => Wallet.switchNetwork();
  $("#btn-refresh").onclick = refreshAll;
  $("#btn-sign").onclick = signProof;
  $("#btn-request").onclick = requestApproval;
  $("#st-save").onclick = saveSettingsForm;
  $("#st-reset").onclick = () => { clearSettings(); toast("Settings reset", "success"); setTimeout(() => location.reload(), 500); };

  setupIssueForm();
  setupForms();

  const hash = location.hash.replace("#", "");
  if (["overview", "investor", "verify", "issuer", "admin"].includes(hash)) showTab(hash);

  Wallet.onChange(onWallet);
  await Wallet.init();
});

function showTab(name) {
  $all("#tabs button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  $all(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + name));
  history.replaceState(null, "", "#" + name);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function ready() {
  return ethers.isAddress(S.cfg.society.security || "") && ethers.isAddress(S.cfg.society.interest || "");
}

async function onWallet() {
  $("#net-name").textContent = S.cfg.network.name;
  $("#setup-notice").classList.toggle("hidden", ready());

  const secAddr = S.cfg.society.security, intAddr = S.cfg.society.interest;
  setContractLink("#ov-sec", secAddr);
  setContractLink("#ov-int", intAddr);

  if (Wallet.account) {
    S.me = Wallet.account;
    const btn = $("#btn-connect");
    btn.classList.add("connected");
    btn.querySelector("span").textContent = fmt.short(Wallet.account);
    $("#sb-account").textContent = fmt.short(Wallet.account);
    $("#sb-network").textContent = Wallet.isRightNetwork() ? S.cfg.network.name : "Wrong network (" + Wallet.chainId + ")";
    $("#network-notice").classList.toggle("hidden", Wallet.isRightNetwork());
  }

  if (ready() && Wallet.provider && (!Wallet.account || Wallet.isRightNetwork())) {
    S.sec = contractAt(secAddr, ABIS.TranchoryxSecurity);
    S.int = contractAt(intAddr, ABIS.TranchoryxInterest);
    S.secW = contractAt(secAddr, ABIS.TranchoryxSecurity, true);
    S.intW = contractAt(intAddr, ABIS.TranchoryxInterest, true);
  }
  await refreshAll();
}

function setContractLink(sel, addr) {
  const a = $(sel);
  if (addr && ethers.isAddress(addr)) { a.textContent = fmt.short(addr); a.href = explorerAddr(addr); }
}

/* ---------------- data loading ---------------- */

async function loadSecurity(id) {
  const [s, holder, life, coupon, periods] = await Promise.all([
    S.sec.getSecurity(id), S.sec.holderOf(id), S.sec.lifecycleStatus(id), S.sec.couponPerPeriod(id), S.sec.totalPeriods(id)
  ]);
  return {
    id, securityId: s.securityId, series: s.series, faceValue: s.faceValue, couponBps: Number(s.couponBps),
    ppy: Number(s.paymentsPerYear), issueDate: s.issueDate, maturityDate: s.maturityDate, redeemed: s.redeemed,
    lastHolder: s.lastHolder, cid: s.tokenCID, holder, life: Number(life), coupon, periods: Number(periods)
  };
}

// same integer maths as dueDate() in Solidity
function dueOf(sec, p) { return BigInt(sec.issueDate) + (BigInt(p) * YEAR) / BigInt(sec.ppy); }

async function refreshAll() {
  if (!S.sec) { fillIssuePicker(); return; }
  try {
    const [issuer, admin, total] = await Promise.all([S.sec.owner(), S.int.owner(), S.sec.totalSecurities()]);
    S.issuer = issuer; S.admin = admin;
    $("#ov-issued").textContent = Number(total).toString();

    const list = [];
    for (let i = 1; i <= Number(total); i++) list.push(await loadSecurity(i));
    S.all = list;

    if (S.me) {
      [S.approved, S.pending] = await Promise.all([S.sec.approvedInvestor(S.me), S.sec.pendingApproval(S.me)]);
      $("#sb-kyc").textContent = S.approved ? "Approved ✓" : S.pending ? "Pending review" : "Not approved";
      $("#sb-trxi").textContent = cad(await S.int.balanceOf(S.me));
    }

    renderRoles();
    renderOnboarding();
    await renderPortfolio();
    fillIssuePicker();
    if (isIssuer()) { await renderApplicants(); renderRegister(); }
    if (isAdmin()) { await renderAdmin(); }
  } catch (e) {
    console.error(e);
    toast("Could not read the contracts. Check addresses and network in Settings.<br><small>" + fmt.esc(errorText(e)) + "</small>", "error", 10000);
  }
}

const same = (a, b) => a && b && a.toLowerCase() === b.toLowerCase();
const isIssuer = () => same(S.me, S.issuer);
const isAdmin = () => same(S.me, S.admin);

function renderRoles() {
  $("[data-tab=issuer]").classList.toggle("hidden", !isIssuer());
  $("[data-tab=admin]").classList.toggle("hidden", !isAdmin());
  $("#sb-roles").innerHTML =
    (isIssuer() ? `<span class="role-pill">Issuer</span>` : "") +
    (isAdmin() ? `<span class="role-pill">Administrator</span>` : "") +
    (S.me && !isIssuer() && !isAdmin() ? `<span class="role-pill">Investor</span>` : "");
}

/* ---------------- onboarding ---------------- */

function proofKey() { return "trx_proof_" + (S.me || "").toLowerCase(); }

function renderOnboarding() {
  const ob1 = $("#ob-1"), ob2 = $("#ob-2"), ob3 = $("#ob-3");
  if (S.me) { ob1.className = "ob done"; $("#ob-1-text").textContent = "Connected: " + fmt.short(S.me); }
  let proof = null;
  try { proof = sessionStorage.getItem(proofKey()); } catch (e) { /* ignore */ }
  if (proof) { ob2.className = "ob done"; $("#ob-2-text").textContent = "Signature verified for this wallet."; $("#btn-sign").classList.add("hidden"); }
  if (S.approved) {
    ob3.className = "ob done"; $("#ob-3-text").textContent = "This wallet is approved to hold Tranchoryx securities."; $("#btn-request").classList.add("hidden");
  } else if (S.pending) {
    ob3.className = "ob pending"; $("#ob-3-text").textContent = "Request sent. The issuer will approve after KYC/AML checks."; $("#btn-request").classList.add("hidden");
  }
}

async function signProof() {
  if (!Wallet.account) return Wallet.connect();
  try {
    const res = await Wallet.signProof("Society Credit Union · Tranchoryx");
    if (res.ok) {
      try { sessionStorage.setItem(proofKey(), res.signature); } catch (e) { /* ignore */ }
      toast("Wallet ownership verified ✓ (signature checked with ethers.verifyMessage)", "success");
      renderOnboarding();
    } else toast("Signature did not match this wallet.", "error");
  } catch (e) { toast(errorText(e), "error"); }
}

async function requestApproval() {
  if (!S.secW) return toast("Contracts are not set yet.", "error");
  if (await sendTx("Request investor approval", () => S.secW.requestApproval())) refreshAll();
}

/* ---------------- certificate visuals ---------------- */

function paperCert(s) {
  return `<div class="paper-cert">
    <div class="pc-logo">TRANCHORYX</div>
    <div class="pc-sub">MORTGAGE-BACKED SECURITY CERTIFICATE</div>
    <table>
      <tr><td>Issuer</td><td>Society Credit Union</td></tr>
      <tr><td>Security ID</td><td>${fmt.esc(s.securityId)}</td></tr>
      <tr><td>Series</td><td>${fmt.esc(s.series)}</td></tr>
      <tr><td>Face Value</td><td>C$${Number(s.faceValue).toLocaleString()}</td></tr>
      <tr><td>Annual Coupon</td><td>${(s.couponBps / 100).toFixed(2)}%</td></tr>
      <tr><td>Payments / Year</td><td>${s.ppy}</td></tr>
      <tr><td>Issue Date</td><td>${fmt.date(s.issueDate)}</td></tr>
      <tr><td>Maturity Date</td><td>${fmt.date(s.maturityDate)}</td></tr>
    </table>
    <div class="pc-seal"></div>
    <div class="pc-foot">Educational prototype only · Not legal title</div>
  </div>`;
}

async function swapInImage(container, cid) {
  if (!cid) return;
  const meta = await loadFromCID(cid);
  if (meta && meta.image && !meta.failed) {
    const img = new Image();
    img.alt = "Certificate";
    img.onload = () => { container.innerHTML = ""; container.appendChild(img); };
    img.src = meta.image;
  }
}

/* ---------------- portfolio ---------------- */

async function renderPortfolio() {
  if (!S.me) return;
  const mine = S.all.filter(s => same(s.holder, S.me));
  const grid = $("#my-securities");
  grid.innerHTML = mine.length ? mine.map(s => `
    <div class="cert-card">
      <div class="cert-img" data-cid="${fmt.esc(s.cid)}">${paperCert(s)}</div>
      <div class="cert-body">
        <h4>${fmt.esc(s.securityId)} <span class="badge ${LIFE_CLASS[s.life]}">${LIFE[s.life]}</span></h4>
        <div class="kv">
          <div><span>Face</span><b>C$${Number(s.faceValue).toLocaleString()}</b></div>
          <div><span>Coupon</span><b>${(s.couponBps / 100).toFixed(2)}%</b></div>
          <div><span>Per period</span><b>${cad(s.coupon)}</b></div>
          <div><span>Periods</span><b>${s.periods} × ${s.ppy}/yr</b></div>
          <div><span>Issued</span><b>${fmt.date(s.issueDate)}</b></div>
          <div><span>Matures</span><b>${fmt.date(s.maturityDate)}</b></div>
        </div>
        <div class="btn-row">
          <button class="btn btn-ghost btn-sm" onclick="openTransfer(${s.id})">Transfer</button>
          <button class="btn btn-ghost btn-sm" onclick="verifyQuick('${fmt.esc(s.securityId)}')">Verify</button>
          ${s.cid ? `<a class="btn btn-ghost btn-sm" href="${ipfsToHttp(s.cid)}" target="_blank" rel="noopener">IPFS</a>` : ""}
        </div>
      </div>
    </div>`).join("") : `<p class="empty">${S.approved ? "No certificates in this wallet yet." : "Once approved, certificates issued to you will show here."}</p>`;
  $all("#my-securities .cert-img").forEach(el => swapInImage(el, el.dataset.cid));

  // coupon schedule
  const now = BigInt(Math.floor(Date.now() / 1000));
  const rows = [];
  for (const s of mine) {
    let upcomingShown = false;
    for (let p = 1; p <= s.periods; p++) {
      const due = dueOf(s, p);
      if (due > now) {
        if (!upcomingShown) { rows.push({ s, p, due, kind: "upcoming" }); upcomingShown = true; }
        break;
      }
      const e = await S.int.getEntitlement(s.id, p);
      rows.push({ s, p, due, e });
    }
  }
  const tb = $("#coupon-table tbody");
  tb.innerHTML = rows.length ? rows.map(r => {
    let status, action = "";
    if (r.kind === "upcoming") status = `<span class="badge b-wait">Upcoming</span>`;
    else if (!r.e.recorded) status = `<span class="badge b-wait">Awaiting record</span>`;
    else if (r.e.claimed && same(r.e.holder, S.me)) status = `<span class="badge b-active">Claimed ✓</span>`;
    else if (!same(r.e.holder, S.me)) status = `<span class="badge b-redeemed">Recorded to previous holder</span>`;
    else { status = `<span class="badge b-claim">Claimable</span>`; action = `<button class="btn btn-gold btn-sm" onclick="claim(${r.s.id},${r.p})">Claim ${cad(r.e.amount)}</button>`; }
    return `<tr><td><b>${fmt.esc(r.s.securityId)}</b></td><td>${r.p} of ${r.s.periods}</td><td>${fmt.date(r.due)}</td><td>${cad(r.s.coupon)}</td><td>${status}</td><td>${action}</td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">No coupons yet.</td></tr>`;

  // balance + redemptions
  const bal = await S.int.balanceOf(S.me);
  $("#inv-balance").textContent = cad(bal);
  const ids = await S.int.redemptionsOf(S.me);
  const reqs = [];
  for (const id of ids) reqs.push({ id: Number(id), r: await S.int.getRedemption(id) });
  $("#my-redemptions").innerHTML = reqs.length ? reqs.reverse().map(({ id, r }) => {
    const st = Number(r.status);
    const cls = st === 1 ? "b-active" : st === 2 ? "b-red" : "b-wait";
    return `<div class="req"><div><b>#${id}</b> · ${cad(r.amount)}<br><small class="muted">${fmt.dateTime(r.requestedAt)}${r.bankRef ? " · ref " + fmt.esc(r.bankRef) : ""}</small></div><span class="badge ${cls}">${RED_STATUS[st]}</span></div>`;
  }).join("") : `<p class="empty">None yet.</p>`;
}

async function claim(id, p) {
  if (await sendTx(`Claim interest (security #${id}, period ${p})`, () => S.intW.claimInterest(id, p))) refreshAll();
}

function openTransfer(id) {
  const s = S.all.find(x => x.id === id);
  const f = $("#form-transfer").elements;
  f.tokenId.value = id; f.label.value = s.securityId; f.to.value = "";
  openModal("modal-transfer");
}

function verifyQuick(securityId) {
  showTab("verify");
  $("#form-verify").elements.q.value = securityId;
  $("#form-verify").requestSubmit();
}

/* ---------------- forms ---------------- */

function setupForms() {
  $("#form-redeem").onsubmit = async (e) => {
    e.preventDefault();
    const amount = fmt.toCents(e.target.elements.amount.value);
    if (amount <= 0n) return toast("Enter an amount.", "error");
    if (await sendTx("Request redemption", () => S.intW.requestRedemption(amount))) { e.target.reset(); refreshAll(); }
  };

  $("#form-transfer").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const to = f.to.value.trim();
    if (!ethers.isAddress(to)) return toast("Not a valid wallet address.", "error");
    if (!(await S.sec.approvedInvestor(to))) return toast("That wallet is not approved by the issuer. The contract would refuse the transfer.", "error", 8000);
    const r = await sendTx("Transfer certificate", () => S.secW.transferFrom(S.me, to, BigInt(f.tokenId.value)));
    if (r) { closeModal("modal-transfer"); refreshAll(); }
  };

  $("#form-verify").onsubmit = async (e) => {
    e.preventDefault();
    await doVerify(e.target.elements.q.value.trim(), e.target.elements.wallet.value.trim());
  };

  $("#form-approve").onsubmit = async (e) => {
    e.preventDefault();
    const a = e.target.elements.addr.value.trim();
    if (!ethers.isAddress(a)) return toast("Not a valid address.", "error");
    if (await sendTx("Approve investor", () => S.secW.approveInvestor(a, true))) { e.target.reset(); refreshAll(); }
  };

  $("#form-funding").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target.elements;
    const amount = fmt.toCents(f.amount.value);
    if (amount <= 0n) return toast("Enter an amount.", "error");
    if (await sendTx("Confirm funding", () => S.intW.confirmFunding(amount, f.ref.value.trim()))) { e.target.reset(); refreshAll(); }
  };
}

/* ---------------- verify ---------------- */

async function doVerify(q, wallet) {
  const out = $("#verify-result");
  if (!S.sec) { out.innerHTML = `<div class="verdict info">Connect MetaMask and set the contract addresses first.</div>`; return; }
  try {
    let id = /^\d+$/.test(q) ? Number(q) : Number(await S.sec.tokenIdOf(q));
    if (!id || id > S.all.length) { out.innerHTML = `<div class="verdict no">✕ No security with number “${fmt.esc(q)}” is on the register.</div>`; return; }
    const s = await loadSecurity(id);
    let verdict;
    if (s.life === 2) verdict = `<div class="verdict info">ⓘ Redeemed at maturity. The NFT was burnt. Last registered holder: <span class="mono">${s.lastHolder}</span></div>`;
    else if (wallet && ethers.isAddress(wallet)) {
      const ok = await S.sec.verifyOwnership(id, wallet);
      verdict = ok ? `<div class="verdict ok">✓ Verified: ${fmt.short(wallet)} is the registered holder.</div>`
                   : `<div class="verdict no">✕ ${fmt.short(wallet)} is NOT the registered holder.</div>`;
    } else verdict = `<div class="verdict ok">✓ Authentic certificate on the Tranchoryx register.</div>`;

    out.innerHTML = `<div class="verify-card">
      <div class="cert-img" data-cid="${fmt.esc(s.cid)}">${paperCert(s)}</div>
      <div>
        ${verdict}
        <div class="kv" style="grid-template-columns:1fr">
          <div><span>Token ID</span><b>#${s.id}</b></div>
          <div><span>Security ID</span><b>${fmt.esc(s.securityId)}</b></div>
          <div><span>Series</span><b>${fmt.esc(s.series)}</b></div>
          <div><span>Status</span><b><span class="badge ${LIFE_CLASS[s.life]}">${LIFE[s.life]}</span></b></div>
          <div><span>Registered holder</span><b class="mono">${s.life === 2 ? "—" : s.holder}</b></div>
          <div><span>Face value</span><b>C$${Number(s.faceValue).toLocaleString()}</b></div>
          <div><span>Coupon</span><b>${(s.couponBps / 100).toFixed(2)}% · ${s.ppy} payment(s) a year · ${cad(s.coupon)} each</b></div>
          <div><span>Issue → maturity</span><b>${fmt.date(s.issueDate)} → ${fmt.date(s.maturityDate)}</b></div>
          <div><span>Pinata CID</span><b class="mono">${s.cid ? `<a href="${ipfsToHttp(s.cid)}" target="_blank" rel="noopener">${fmt.esc(s.cid.slice(0, 18))}…</a>` : "—"}</b></div>
          <div><span>Contract</span><b><a class="mono" href="${explorerAddr(S.cfg.society.security)}" target="_blank" rel="noopener">${fmt.short(S.cfg.society.security)}</a></b></div>
        </div>
      </div>
    </div>`;
    swapInImage($(".verify-card .cert-img"), s.cid);
  } catch (e) {
    out.innerHTML = `<div class="verdict no">${fmt.esc(errorText(e))}</div>`;
  }
}

/* ---------------- issuer ---------------- */

function fillIssuePicker() {
  const certs = S.cfg.society.certificates || [];
  const issuedIds = new Set(S.all.map(s => s.securityId));
  $("#cert-pick").innerHTML = `<option value="">— choose one of your 5 certificates —</option>` + certs.map((c, i) =>
    `<option value="${i}">${fmt.esc(c.label)}${issuedIds.has(c.securityId) ? " · already issued" : ""}${c.cid ? "" : " · (no CID yet)"}</option>`).join("");
}

function parseLooseDate(v) {
  if (!v) return "";
  v = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[-\s/]([A-Za-z]{3,})[-\s/](\d{4})$/);
  if (m) {
    const mon = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(m[2].slice(0, 3).toLowerCase());
    if (mon >= 0) return `${m[3]}-${String(mon + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  const d = new Date(v);
  return isNaN(d) ? "" : d.toISOString().slice(0, 10);
}

function setupIssueForm() {
  const form = $("#form-issue");
  const f = form.elements;

  $("#cert-pick").onchange = async () => {
    const c = (S.cfg.society.certificates || [])[Number($("#cert-pick").value)];
    if (!c) return;
    f.cid.value = c.cid || "";
    f.securityId.value = c.securityId || "";
    f.series.value = c.series || "";
    f.faceValue.value = c.faceValue || "";
    f.coupon.value = c.couponPercent ?? "";
    f.ppy.value = String(c.paymentsPerYear || 1);
    f.issueDate.value = c.issueDate || "";
    f.maturityDate.value = c.maturityDate || "";
    await loadPreview(true);
  };
  $("#btn-load-cid").onclick = () => loadPreview(true);
  ["securityId", "series", "faceValue", "coupon", "ppy", "issueDate", "maturityDate"].forEach(n => f[n].addEventListener("input", updateIssueCalc));
  f.ppy.addEventListener("change", updateIssueCalc);

  form.onsubmit = async (e) => {
    e.preventDefault();
    if (!S.secW) return toast("Contracts are not set yet.", "error");
    const holder = f.holder.value.trim();
    if (!ethers.isAddress(holder)) return toast("Holder wallet is not valid.", "error");
    if (!(await S.sec.approvedInvestor(holder))) return toast("This wallet is not approved yet. Approve it first (Approval requests).", "error", 8000);
    if (Number(await S.sec.tokenIdOf(f.securityId.value.trim())) !== 0) return toast("This security ID has already been issued. The contract never issues the same ID twice.", "error", 8000);
    if (!f.cid.value.trim() && !confirm("No Pinata CID is set. Issue without a certificate image?")) return;
    const r = await sendTx(`Issue ${f.securityId.value}`, () => S.secW.issueSecurity(
      holder, f.securityId.value.trim(), f.series.value.trim(), BigInt(f.faceValue.value),
      Math.round(Number(f.coupon.value) * 100), Number(f.ppy.value),
      fmt.toUnix(f.issueDate.value), fmt.toUnix(f.maturityDate.value), f.cid.value.trim()));
    if (r) { toast("Certificate issued and sent to " + fmt.short(holder), "success"); refreshAll(); }
  };
}

async function loadPreview(fromCid) {
  const f = $("#form-issue").elements;
  const cid = f.cid.value.trim();
  const box = $("#cert-preview");
  const draft = () => ({
    securityId: f.securityId.value, series: f.series.value, faceValue: f.faceValue.value || 0,
    couponBps: Math.round(Number(f.coupon.value || 0) * 100), ppy: Number(f.ppy.value),
    issueDate: f.issueDate.value ? fmt.toUnix(f.issueDate.value) : 0, maturityDate: f.maturityDate.value ? fmt.toUnix(f.maturityDate.value) : 0
  });
  box.innerHTML = paperCert(draft());
  updateIssueCalc();
  if (!cid || !fromCid) return;
  box.insertAdjacentHTML("beforeend", `<div class="meta">Loading from Pinata…</div>`);
  const meta = await loadFromCID(cid);
  if (!meta || meta.failed) {
    box.querySelector(".meta").textContent = "Could not load this CID from the gateway. Check the CID or gateway in Settings. Details from config.js are used.";
    return;
  }
  // fill form from metadata attributes, if the CID is a metadata JSON
  const map = {
    securityId: attr(meta, "Security ID", "SecurityID", "Security No"),
    series: attr(meta, "Series"),
    faceValue: attr(meta, "Face Value"),
    coupon: attr(meta, "Annual Coupon", "Coupon"),
    ppy: attr(meta, "Payments Per Year"),
    issueDate: parseLooseDate(attr(meta, "Issue Date")),
    maturityDate: parseLooseDate(attr(meta, "Maturity Date"))
  };
  if (map.securityId) f.securityId.value = map.securityId;
  if (map.series) f.series.value = map.series;
  if (map.faceValue) f.faceValue.value = String(map.faceValue).replace(/[^0-9.]/g, "").split(".")[0];
  if (map.coupon) f.coupon.value = parseFloat(String(map.coupon).replace(/[^0-9.]/g, ""));
  if (map.ppy) f.ppy.value = String(parseInt(map.ppy, 10));
  if (map.issueDate) f.issueDate.value = map.issueDate;
  if (map.maturityDate) f.maturityDate.value = map.maturityDate;
  box.innerHTML = (meta.image ? `<img src="${meta.image}" alt="Certificate image" onerror="this.replaceWith(document.createTextNode(''))">` : paperCert(draft())) +
    `<div class="meta"><b>${fmt.esc(meta.name || "Certificate")}</b><br>CID ${fmt.esc(cid)}${meta.isImageOnly ? "<br>(image CID — details come from the form)" : "<br>(metadata JSON — details filled from attributes)"}</div>`;
  updateIssueCalc();
}

function updateIssueCalc() {
  const f = $("#form-issue").elements;
  const box = $("#issue-calc");
  const face = Number(f.faceValue.value || 0), rate = Number(f.coupon.value || 0), ppy = Number(f.ppy.value || 1);
  if (!face || !f.issueDate.value || !f.maturityDate.value) { box.textContent = "Fill in the terms to see the coupon."; box.className = "issue-calc"; return; }
  const per = face * Math.round(rate * 100) / (10000 * ppy);
  const days = (fmt.toUnix(f.maturityDate.value) - fmt.toUnix(f.issueDate.value)) / 86400;
  const periods = Math.floor(days * ppy / 365);
  const dup = S.all.some(s => s.securityId === f.securityId.value.trim());
  box.className = "issue-calc" + (dup ? " warn" : "");
  box.innerHTML = dup ? `⚠ ${fmt.esc(f.securityId.value)} is already on the register — the contract will refuse a duplicate.`
    : `Coupon per period <b>C$${(per).toLocaleString("en-CA", { minimumFractionDigits: 2 })}</b> · ${periods} periods · total interest C$${(per * periods).toLocaleString("en-CA", { minimumFractionDigits: 2 })}`;
}

async function renderApplicants() {
  const list = await S.sec.getApplicants();
  const rows = [];
  const approvedSet = new Set([S.issuer.toLowerCase()]);
  for (const a of list) {
    const [ok, pend] = await Promise.all([S.sec.approvedInvestor(a), S.sec.pendingApproval(a)]);
    if (ok) approvedSet.add(a.toLowerCase());
    if (pend) rows.push(a);
  }
  S.all.forEach(s => { if (s.holder && s.holder !== ethers.ZeroAddress) approvedSet.add(s.holder.toLowerCase()); });
  $("#approved-list").innerHTML = [...approvedSet].map(a => `<option value="${ethers.getAddress(a)}">`).join("");
  $("#applicants").innerHTML = rows.length ? rows.map(a => `
    <div class="applicant"><span class="mono">${a}</span>
      <span class="btn-row" style="margin:0">
        <button class="btn btn-green btn-sm" onclick="approve('${a}', true)">Approve</button>
        <button class="btn btn-danger btn-sm" onclick="approve('${a}', false)">Decline</button>
      </span></div>`).join("") : `<p class="empty">No pending requests.</p>`;
}

async function approve(addr, yes) {
  if (await sendTx(yes ? "Approve investor" : "Decline investor", () => S.secW.approveInvestor(addr, yes))) refreshAll();
}

function renderRegister() {
  const tb = $("#register-table tbody");
  tb.innerHTML = S.all.length ? S.all.map(s => `
    <tr>
      <td>${s.id}</td><td><b>${fmt.esc(s.securityId)}</b></td><td>${fmt.esc(s.series)}</td>
      <td class="mono">${s.life === 2 ? "<span class='muted'>last: " + fmt.short(s.lastHolder) + "</span>" : fmt.short(s.holder)}</td>
      <td>C$${Number(s.faceValue).toLocaleString()}</td><td>${(s.couponBps / 100).toFixed(2)}% / ${s.ppy}</td>
      <td>${fmt.date(s.maturityDate)}</td>
      <td><span class="badge ${LIFE_CLASS[s.life]}">${LIFE[s.life]}</span></td>
      <td>${s.life === 1 ? `<button class="btn btn-navy btn-sm" onclick="redeem(${s.id})">Redeem</button>` : ""}</td>
    </tr>`).join("") : `<tr><td colspan="9" class="empty">No securities issued yet.</td></tr>`;
}

async function redeem(id) {
  if (!confirm("Confirm the principal has been repaid off chain. The NFT will be burnt. Continue?")) return;
  if (await sendTx(`Redeem security #${id}`, () => S.secW.redeemAtMaturity(id))) refreshAll();
}

/* ---------------- administrator ---------------- */

async function renderAdmin() {
  const [funded, entitled, claimed, settled, avail] = await Promise.all([
    S.int.totalFunded(), S.int.totalEntitled(), S.int.totalClaimed(), S.int.totalSettled(), S.int.availableFunding()]);
  $("#k-funded").textContent = cad(funded);
  $("#k-entitled").textContent = cad(entitled);
  $("#k-claimed").textContent = cad(claimed);
  $("#k-settled").textContent = cad(settled);
  $("#k-available").textContent = cad(avail);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const rows = [];
  for (const s of S.all) {
    if (s.life === 2) continue;
    for (let p = 1; p <= s.periods; p++) {
      const due = dueOf(s, p);
      if (due > now) break;
      const e = await S.int.getEntitlement(s.id, p);
      rows.push({ s, p, due, e });
    }
  }
  rows.sort((a, b) => Number(a.e.recorded) - Number(b.e.recorded));
  $("#due-table tbody").innerHTML = rows.length ? rows.map(({ s, p, due, e }) => {
    const short = !e.recorded && avail < s.coupon;
    const status = e.recorded ? (e.claimed ? `<span class="badge b-active">Claimed</span>` : `<span class="badge b-claim">Recorded</span>`)
      : short ? `<span class="badge b-red">Needs funding</span>` : `<span class="badge b-wait">Due</span>`;
    return `<tr><td><b>${fmt.esc(s.securityId)}</b></td><td>${p} of ${s.periods}</td><td>${fmt.date(due)}</td>
      <td class="mono">${fmt.short(e.recorded ? e.holder : s.holder)}</td><td>${cad(e.recorded ? e.amount : s.coupon)}</td><td>${status}</td>
      <td>${e.recorded ? "" : `<button class="btn btn-navy btn-sm" ${short ? "disabled title='Confirm more funding first'" : ""} onclick="recordEnt(${s.id},${p})">Record</button>`}</td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty">No coupons have reached their record date yet.</td></tr>`;

  const count = Number(await S.int.redemptionCount());
  const reqs = [];
  for (let i = count - 1; i >= 0; i--) reqs.push({ id: i, r: await S.int.getRedemption(i) });
  $("#redeem-table tbody").innerHTML = reqs.length ? reqs.map(({ id, r }) => {
    const st = Number(r.status);
    const cls = st === 1 ? "b-active" : st === 2 ? "b-red" : "b-wait";
    const action = st === 0 ? `<div class="inline"><input id="ref-${id}" placeholder="Bank payment ref"><button class="btn btn-green btn-sm" onclick="settle(${id})">Settle</button><button class="btn btn-danger btn-sm" onclick="rejectReq(${id})">Reject</button></div>` : fmt.esc(r.bankRef);
    return `<tr><td>#${id}</td><td class="mono">${fmt.short(r.investor)}</td><td><b>${cad(r.amount)}</b></td><td>${fmt.dateTime(r.requestedAt)}</td><td><span class="badge ${cls}">${RED_STATUS[st]}</span></td><td>${action}</td></tr>`;
  }).join("") : `<tr><td colspan="6" class="empty">No redemption requests.</td></tr>`;
}

async function recordEnt(id, p) {
  if (await sendTx(`Record entitlement (security #${id}, period ${p})`, () => S.intW.recordEntitlement(id, p))) refreshAll();
}
async function settle(id) {
  const ref = $("#ref-" + id).value.trim();
  if (!ref) return toast("Enter the bank payment reference first.", "error");
  if (await sendTx(`Confirm fiat settlement #${id}`, () => S.intW.confirmFiatSettlement(id, ref))) refreshAll();
}
async function rejectReq(id) {
  const reason = $("#ref-" + id).value.trim() || "Bank details could not be verified";
  if (await sendTx(`Reject redemption #${id}`, () => S.intW.rejectRedemption(id, reason))) refreshAll();
}

/* ---------------- settings ---------------- */

function openSettings() {
  const c = getConfig();
  $("#st-sec").value = c.society.security || "";
  $("#st-int").value = c.society.interest || "";
  $("#st-chain").value = String(c.network.chainId);
  $("#st-gw").value = c.ipfsGateway || "";
  $("#st-certs").innerHTML = (c.society.certificates || []).map((x, i) =>
    `<div class="st-row"><span>${fmt.esc(x.label)}</span><input data-i="${i}" value="${fmt.esc(x.cid || "")}" placeholder="Pinata CID"></div>`).join("");
  openModal("modal-settings");
}

function saveSettingsForm() {
  const chain = Number($("#st-chain").value);
  const names = { 11155111: "Sepolia", 1337: "Ganache", 5777: "Ganache", 31337: "Hardhat" };
  const sec = $("#st-sec").value.trim(), int = $("#st-int").value.trim();
  if ((sec && !ethers.isAddress(sec)) || (int && !ethers.isAddress(int))) return toast("One of the addresses is not valid.", "error");
  const certs = (getConfig().society.certificates || []).map((c, i) => ({ ...c, cid: ($(`#st-certs input[data-i="${i}"]`) || {}).value?.trim() || "" }));
  saveSettings({
    network: { chainId: chain, name: names[chain] || "Local", explorer: chain === 11155111 ? "https://sepolia.etherscan.io" : "#" },
    ipfsGateway: $("#st-gw").value.trim(),
    society: { security: sec, interest: int, certificates: certs }
  });
  toast("Settings saved", "success");
  setTimeout(() => location.reload(), 500);
}
