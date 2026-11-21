/*
  Shared code for both websites:
  - MetaMask connection (ethers.js v6)
  - network check / switch
  - settings (contract addresses + Pinata CIDs saved in the browser)
  - toasts, transaction helper, formatting, IPFS helpers
*/

const STORAGE_KEY = "tranchoryx_glowrist_settings_v1";

/* ---------------- Settings ---------------- */

function deepMerge(base, extra) {
  if (!extra) return base;
  const out = Array.isArray(base) ? [...base] : { ...base };
  for (const k of Object.keys(extra)) {
    const v = extra[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") {
      out[k] = deepMerge(base[k], v);
    } else if (v !== undefined && v !== null && v !== "") {
      out[k] = v;
    }
  }
  return out;
}

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch (e) { return {}; }
}

function saveSettings(partial) {
  const merged = deepMerge(loadSaved(), partial);
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch (e) { /* ignore */ }
}

function clearSettings() {
  try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
}

function getConfig() {
  return deepMerge(window.APP_CONFIG, loadSaved());
}

/* ---------------- Formatting ---------------- */

const fmt = {
  short(addr) {
    if (!addr) return "-";
    return addr.slice(0, 6) + "…" + addr.slice(-4);
  },
  cents(value, symbol) {
    const n = Number(value) / 100;
    return (symbol || "") + n.toLocaleString("en-IE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },
  date(unix) {
    if (!unix || Number(unix) === 0) return "-";
    return new Date(Number(unix) * 1000).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
  },
  dateTime(unix) {
    if (!unix || Number(unix) === 0) return "-";
    return new Date(Number(unix) * 1000).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  },
  // "2025-11-20" -> unix seconds at 00:00 UTC
  toUnix(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Math.floor(Date.UTC(y, m - 1, d) / 1000);
  },
  toInputDate(unix) {
    return new Date(Number(unix) * 1000).toISOString().slice(0, 10);
  },
  // "1,500.50" or "1500.5" -> 150050 (cents) as BigInt
  toCents(text) {
    const clean = String(text).replace(/[^0-9.]/g, "");
    if (!clean) return 0n;
    const [whole, frac = ""] = clean.split(".");
    return BigInt(whole || "0") * 100n + BigInt((frac + "00").slice(0, 2));
  },
  esc(text) {
    return String(text ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
};

/* ---------------- IPFS / Pinata ---------------- */

function ipfsToHttp(uri) {
  const gw = getConfig().ipfsGateway;
  if (!uri) return "";
  if (uri.startsWith("ipfs://")) return gw + uri.replace("ipfs://", "").replace(/^ipfs\//, "");
  if (uri.startsWith("http")) return uri;
  return gw + uri; // bare CID
}

const _cidCache = {};
// Works for a metadata JSON CID or a direct image CID.
async function loadFromCID(cid) {
  if (!cid) return null;
  if (_cidCache[cid]) return _cidCache[cid];
  const url = ipfsToHttp(cid);
  const p = (async () => {
    try {
      const res = await fetch(url);
      const type = (res.headers.get("content-type") || "").toLowerCase();
      if (type.includes("image")) return { image: url, attributes: [], isImageOnly: true };
      const text = await res.text();
      try {
        const json = JSON.parse(text);
        json.image = json.image ? ipfsToHttp(json.image) : "";
        json.attributes = json.attributes || [];
        return json;
      } catch (e) {
        return { image: url, attributes: [], isImageOnly: true };
      }
    } catch (e) {
      return { image: url, attributes: [], failed: true };
    }
  })();
  _cidCache[cid] = p;
  return p;
}

function attr(meta, ...names) {
  if (!meta || !meta.attributes) return undefined;
  const wanted = names.map(n => n.toLowerCase().replace(/[^a-z]/g, ""));
  const hit = meta.attributes.find(a => wanted.includes(String(a.trait_type || "").toLowerCase().replace(/[^a-z]/g, "")));
  return hit ? hit.value : undefined;
}

/* ---------------- Toasts ---------------- */

function ensureToastArea() {
  let area = document.getElementById("toast-area");
  if (!area) {
    area = document.createElement("div");
    area.id = "toast-area";
    document.body.appendChild(area);
  }
  return area;
}

function toast(message, kind = "info", timeout = 6000) {
  const area = ensureToastArea();
  const el = document.createElement("div");
  el.className = "toast toast-" + kind;
  el.innerHTML = `<div class="toast-body">${message}</div><button class="toast-x" aria-label="Close">×</button>`;
  el.querySelector(".toast-x").onclick = () => el.remove();
  area.appendChild(el);
  if (timeout) setTimeout(() => el.remove(), timeout);
  return el;
}

function errorText(e) {
  if (!e) return "Unknown error";
  if (e.code === "ACTION_REJECTED" || e.code === 4001) return "You rejected the request in MetaMask.";
  const raw = e.reason || e.revert?.args?.[0] || e.info?.error?.data?.message || e.info?.error?.message || e.shortMessage || e.message || String(e);
  return String(raw).replace("execution reverted: ", "").replace(/^Error: /, "");
}

/* ---------------- Wallet ---------------- */

const Wallet = {
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  listeners: [],

  onChange(fn) { this.listeners.push(fn); },
  emit() { this.listeners.forEach(fn => { try { fn(this); } catch (e) { console.error(e); } }); },

  hasMetaMask() { return typeof window.ethereum !== "undefined"; },

  async init() {
    if (!this.hasMetaMask()) { this.emit(); return; }
    this.provider = new ethers.BrowserProvider(window.ethereum);
    window.ethereum.on && window.ethereum.on("accountsChanged", () => window.location.reload());
    window.ethereum.on && window.ethereum.on("chainChanged", () => window.location.reload());
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length) await this._setup();
    } catch (e) { console.warn(e); }
    this.emit();
  },

  async connect() {
    if (!this.hasMetaMask()) {
      toast('MetaMask was not found. Install it from <a href="https://metamask.io/download/" target="_blank" rel="noopener">metamask.io</a> and reload this page.', "error", 0);
      return;
    }
    try {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      await this._setup();
      toast("Wallet connected: " + fmt.short(this.account), "success");
    } catch (e) {
      toast(errorText(e), "error");
    }
    this.emit();
  },

  async _setup() {
    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
    this.account = await this.signer.getAddress();
    const net = await this.provider.getNetwork();
    this.chainId = Number(net.chainId);
  },

  isRightNetwork() {
    return this.chainId === Number(getConfig().network.chainId);
  },

  async switchNetwork() {
    const cfg = getConfig().network;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x" + Number(cfg.chainId).toString(16) }] });
    } catch (e) {
      toast("Please switch MetaMask to " + cfg.name + ". " + errorText(e), "error");
    }
  },

  async signProof(appName) {
    const nonce = Math.floor(Math.random() * 1e9);
    const message = `${appName} wallet ownership proof\n\nI confirm I control this wallet.\nWallet: ${this.account}\nNonce: ${nonce}\nTime: ${new Date().toISOString()}`;
    const signature = await this.signer.signMessage(message);
    const recovered = ethers.verifyMessage(message, signature);
    return { ok: recovered.toLowerCase() === this.account.toLowerCase(), message, signature };
  }
};

/* ---------------- Contracts ---------------- */

function contractAt(address, abi, write = false) {
  if (!address || !ethers.isAddress(address)) return null;
  if (!Wallet.provider) return null;
  return new ethers.Contract(address, abi, write && Wallet.signer ? Wallet.signer : Wallet.provider);
}

function explorerTx(hash) { return getConfig().network.explorer + "/tx/" + hash; }
function explorerAddr(addr) { return getConfig().network.explorer + "/address/" + addr; }

// Sends a transaction with friendly status messages.
async function sendTx(label, txPromiseFn) {
  if (!Wallet.account) { toast("Connect your MetaMask wallet first.", "error"); return null; }
  if (!Wallet.isRightNetwork()) { toast("Wrong network. Switch MetaMask to " + getConfig().network.name + ".", "error"); return null; }
  const pending = toast(`<strong>${label}</strong><br>Confirm the transaction in MetaMask…`, "pending", 0);
  try {
    const tx = await txPromiseFn();
    pending.querySelector(".toast-body").innerHTML = `<strong>${label}</strong><br>Waiting for the block… <a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">view on Etherscan</a>`;
    const receipt = await tx.wait();
    pending.remove();
    toast(`<strong>${label}</strong> done ✓<br><a href="${explorerTx(tx.hash)}" target="_blank" rel="noopener">Receipt on Etherscan</a> · gas used ${receipt.gasUsed.toString()}`, "success", 9000);
    return receipt;
  } catch (e) {
    pending.remove();
    toast(`<strong>${label}</strong> failed<br>${fmt.esc(errorText(e))}`, "error", 10000);
    console.error(e);
    return null;
  }
}

/* ---------------- Small UI helpers ---------------- */

function $(sel, root = document) { return root.querySelector(sel); }
function $all(sel, root = document) { return Array.from(root.querySelectorAll(sel)); }

function openModal(id) { const m = document.getElementById(id); if (m) m.classList.add("open"); }
function closeModal(id) { const m = document.getElementById(id); if (m) m.classList.remove("open"); }

document.addEventListener("click", (ev) => {
  const closer = ev.target.closest("[data-close-modal]");
  if (closer) closer.closest(".modal").classList.remove("open");
  if (ev.target.classList && ev.target.classList.contains("modal")) ev.target.classList.remove("open");
});

function copyText(text) {
  navigator.clipboard && navigator.clipboard.writeText(text).then(() => toast("Copied", "success", 1500));
}
