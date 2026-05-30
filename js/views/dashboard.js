// js/views/dashboard.js — Master card + keyring grid
import { state, setState } from "../state.js";
import { npubFromHex } from "../nip19.js";
import { shortHex } from "../crypto.js";
import { escapeHtml, toast, copy } from "../ui-utils.js";
import { publishMasterPublicKeyring, publishMasterPrivateKeyring } from "../keyring.js";

export function renderDashboard() {
  renderMasterCard();
  renderKeysGrid();
  document.getElementById("masterIdent").textContent =
    `Logged in · ${shortHex(state.masterkey.pubkey, 10, 8)}`;
  wireActions();
}

function wireActions() {
  document.querySelectorAll('[data-action]').forEach((b) => {
    if (b.dataset.bound) return;
    b.dataset.bound = "1";
    b.addEventListener("click", () => handleAction(b.dataset.action));
  });
}

async function handleAction(action) {
  if (action === "goto-import") return setState({ view: "import" });
  if (action === "new-subkey") return openNewSubkeyView();
  if (action === "back-to-dashboard") return setState({ view: "dashboard" });
  if (action === "publish-public") {
    const t = "Publishing kind 17991…"; toast(t);
    const res = await publishMasterPublicKeyring().catch((e) => [{ ok: false, error: e.message }]);
    summarizePublish(res, "Public keyring");
  }
  if (action === "publish-private") {
    toast("Publishing kind 17992…");
    const res = await publishMasterPrivateKeyring().catch((e) => [{ ok: false, error: e.message }]);
    summarizePublish(res, "Private keyring");
  }
}

function summarizePublish(results, label) {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  if (ok === total) toast(`${label} published to ${ok}/${total} relays`, "success");
  else if (ok > 0) toast(`${label} published to ${ok}/${total} relays`, "info");
  else toast(`${label} publish failed — ${results[0]?.error || "all relays rejected"}`, "error");
}

function openNewSubkeyView() {
  // Selects the keys view in "new" mode
  setState({ view: "key", _newSubkey: true });
}

function renderMasterCard() {
  const m = state.masterkey;
  const npub = npubFromHex(m.pubkey);
  const relays = m.homeRelays.map((r) => `<span class="relay-pill">${escapeHtml(r)}</span>`).join("");
  document.getElementById("masterCard").innerHTML = `
    <div class="key-master-label">Masterkey</div>
    <div class="key-master-name">Root</div>
    <div class="key-master-npub" title="${escapeHtml(npub)}">${escapeHtml(npub)}</div>
    <div class="key-master-npub" title="${escapeHtml(m.pubkey)}">${escapeHtml(m.pubkey)}</div>
    <div class="key-master-relays">${relays || "<span class='relay-pill'>no relays</span>"}</div>
    <div class="key-master-actions">
      <button class="link-btn" data-action="publish-public">Publish kind 17991</button>
      <button class="link-btn" data-action="publish-private">Publish kind 17992</button>
      <button class="link-btn" id="copyNpub">Copy npub</button>
    </div>`;
  wireActions();
  document.getElementById("copyNpub").addEventListener("click", (e) => copy(npub, e.target));
}

function renderKeysGrid() {
  const grid = document.getElementById("keysGrid");
  const empty = document.getElementById("keysEmpty");
  if (state.keyring.length === 0) {
    grid.innerHTML = ""; empty.hidden = false; return;
  }
  empty.hidden = true;
  grid.innerHTML = state.keyring.map(keyCardHtml).join("");
  grid.querySelectorAll(".key-card").forEach((card) => {
    card.addEventListener("click", () => {
      setState({ view: "key", selectedKey: card.dataset.pubkey });
    });
  });
}

function keyCardHtml(k) {
  const funcs = (k.functions || []).map((f) =>
    `<span class="func-tag">${escapeHtml(f)}</span>`).join("");
  const hasSec = k.seckey
    ? `<span class="key-has-seckey yes">● has nsec</span>`
    : `<span class="key-has-seckey">○ pubkey only</span>`;
  return `<div class="key-card" data-pubkey="${escapeHtml(k.pubkey)}">
      <div class="key-card-head">
        <span class="key-relation ${k.relation}">${k.relation === "S" ? "subkey" : k.relation === "M" ? "masterkey" : "other"}</span>
        ${hasSec}
      </div>
      <div class="key-name">${escapeHtml(k.name || "Untitled key")}</div>
      <div class="key-desc">${escapeHtml(k.description || "")}</div>
      <div class="key-functions">${funcs}</div>
      <div class="key-card-foot">${shortHex(k.pubkey, 10, 10)}</div>
    </div>`;
}
