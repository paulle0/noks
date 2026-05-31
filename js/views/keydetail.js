// js/views/keydetail.js — Inspect a key, generate a new related key, share nlogin
import { state, setState, findKey } from "../state.js";
import { generateKeyPair, shortHex } from "../crypto.js";
import { npubFromHex, nsecFromHex } from "../nip19.js";
import { encodeNlogin } from "../nlogin.js";
import { addKeyEntry, removeKeyEntry, publishMasterPublicKeyring, publishSubkeyKeyring } from "../keyring.js";
import { renderQrSvg } from "../qrcode.js";
import { toast, copy, modal, escapeHtml, attachCopy } from "../ui-utils.js";

export async function renderKeyDetail() {
  const root = document.getElementById("keyDetailCard");
  if (state._newSubkey) { renderNewRelatedKeyForm(root); return; }
  const key = findKey(state.selectedKey);
  if (!key) { toast("Key not found"); setState({ view: "dashboard" }); return; }
  await renderExistingKey(root, key);
}

async function renderExistingKey(root, key) {
  const npub = npubFromHex(key.pubkey);
  const includeSec = !!key.seckey;
  const nlogin = encodeNlogin({
    subkeySec: includeSec ? key.seckey : null,
    subkeyPub: includeSec ? null : key.pubkey,
    relays: state.masterkey.homeRelays,
    masterPub: state.masterkey.pubkey,
    kind: 17991,
  });

  root.innerHTML = `
    <div class="detail-head">
      <div>
        <h2 class="detail-name">${escapeHtml(key.name || "Untitled key")}</h2>
        <p class="card-subtitle" style="margin:0;">
          <span class="key-relation ${key.relation}">${relLabel(key.relation)}</span>
          ${key.description ? " · " + escapeHtml(key.description) : ""}
        </p>
      </div>
      <button class="btn-danger" id="deleteBtn">Delete</button>
    </div>

    <div class="detail-section">
      <h4>Identifier</h4>
      <div class="field">
        <label>npub</label>
        <div class="copy-row">
          <input class="input mono" value="${escapeHtml(npub)}" readonly />
          <button class="copy-btn" data-copy="${escapeHtml(npub)}">Copy</button>
        </div>
      </div>
      <div class="field">
        <label>hex pubkey</label>
        <div class="copy-row">
          <input class="input mono" value="${escapeHtml(key.pubkey)}" readonly />
          <button class="copy-btn" data-copy="${escapeHtml(key.pubkey)}">Copy</button>
        </div>
      </div>
      ${key.seckey ? secretBlock(key.seckey) : ""}
    </div>

    <div class="detail-section">
      <h4>Share as nlogin ${includeSec ? "(with seckey)" : "(pubkey only)"}</h4>
      <p class="card-subtitle" style="margin-bottom:var(--space-3);">
        Hand this to a login program so it can sign as this subkey.
        ${includeSec ? "" : "No seckey is shared; the login program already holds it."}
      </p>
      <div class="copy-row" style="margin-bottom:var(--space-3);">
        <input class="input mono" value="${escapeHtml(nlogin)}" readonly />
        <button class="copy-btn" data-copy="${escapeHtml(nlogin)}">Copy</button>
      </div>
      <div class="qr-display" id="qrTarget"></div>
      <div class="share-actions">
        <button class="btn-secondary" id="pubMaster">Publish masterkey 17991</button>
        ${key.seckey ? `<button class="btn-secondary" id="pubSub">Publish subkey 17991</button>` : ""}
      </div>
    </div>`;

  attachCopy(root);
  await renderQrSvg(nlogin, root.querySelector("#qrTarget"));
  root.querySelector("#deleteBtn").addEventListener("click", () => onDelete(key));
  root.querySelector("#pubMaster").addEventListener("click", async () => {
    toast("Publishing masterkey 17991…");
    const res = await publishMasterPublicKeyring().catch((e) => [{ ok: false, error: e.message }]);
    summarize(res, "Master 17991");
  });
  const pubSub = root.querySelector("#pubSub");
  if (pubSub) pubSub.addEventListener("click", async () => {
    toast("Publishing subkey 17991…");
    const res = await publishSubkeyKeyring(key).catch((e) => [{ ok: false, error: e.message }]);
    summarize(res, "Subkey 17991");
  });
}

function secretBlock(sec) {
  const nsec = nsecFromHex(sec);
  return `<div class="field">
      <label>nsec (handle with care)</label>
      <div class="copy-row">
        <input class="input mono" type="password" value="${escapeHtml(nsec)}" readonly />
        <button class="copy-btn" data-copy="${escapeHtml(nsec)}">Copy</button>
      </div>
    </div>`;
}

function relLabel(r) { return r === "S" ? "subkey" : r === "M" ? "masterkey" : "other"; }

async function onDelete(key) {
  const ok = await modal({
    title: "Delete this key?",
    body: `<p>Removes <strong>${escapeHtml(key.name || shortHex(key.pubkey))}</strong> from your local keyring. Publishing a fresh kind 17991 afterwards will remove it from your remote keyring as well.</p>`,
    confirmText: "Delete", confirmKind: "danger",
  });
  if (!ok) return;
  await removeKeyEntry(key.pubkey);
  toast("Key removed", "success");
  setState({ view: "dashboard" });
}

function summarize(results, label) {
  const ok = results.filter((r) => r.ok).length;
  const total = results.length;
  if (ok === total) toast(`${label} published to ${ok}/${total} relays`, "success");
  else if (ok > 0) toast(`${label} published to ${ok}/${total} relays`, "info");
  else toast(`${label} publish failed`, "error");
}

function renderNewRelatedKeyForm(root) {
  const relations = [
    { value: "S", label: "Subkey", desc: "A delegated key under your masterkey" },
    { value: "O", label: "Otherkey", desc: "An unrelated key you want to track" },
    { value: "M", label: "Masterkey", desc: "Another masterkey reference" },
  ];
  const relOptions = relations.map((r) =>
    `<label class="chip-check">
      <input type="radio" name="relationType" value="${r.value}" ${r.value === "S" ? "checked" : ""} />
      ${r.label}
    </label>`
  ).join("");

  root.innerHTML = `
    <div class="detail-head">
      <h2 class="detail-name">New related key</h2>
    </div>
    <p class="card-subtitle">Generate a fresh keypair and add it to your keyring. The nsec stays in this vault — you'll share an <code>nlogin1…</code> instead.</p>
    <div class="field">
      <label>Relation type</label>
      <div class="checkbox-row" id="relationRow">${relOptions}</div>
      <p class="field-hint" id="relationHint">${relations[0].desc}</p>
    </div>
    <div class="field"><label>Name</label><input id="nName" class="input" placeholder="e.g. Damus iOS" /></div>
    <div class="field"><label>Description</label><input id="nDesc" class="input" placeholder="optional" /></div>
    <div class="field"><label>Functions</label>
      <div class="checkbox-row">
        ${["signing","certify","encryption","authentication"].map((f) =>
          `<label class="chip-check"><input type="checkbox" value="${f}" ${f==="signing"?"checked":""}> ${f}</label>`).join("")}
      </div>
    </div>
    <button class="btn-primary" id="createRelBtn" style="width:100%">Generate key</button>`;

  // Update hint text when relation type changes
  root.querySelector("#relationRow").addEventListener("change", (e) => {
    const sel = relations.find((r) => r.value === e.target.value);
    if (sel) root.querySelector("#relationHint").textContent = sel.desc;
  });

  root.querySelector("#createRelBtn").addEventListener("click", async () => {
    const relation = root.querySelector('input[name="relationType"]:checked').value;
    const name = root.querySelector("#nName").value.trim();
    const description = root.querySelector("#nDesc").value.trim();
    const functions = [...root.querySelectorAll(".chip-check input[type=checkbox]:checked")].map((i) => i.value);
    const { seckey, pubkey } = generateKeyPair();
    await addKeyEntry({ relation, pubkey, seckey, name, description, functions });
    toast("Key added — ready to share", "success");
    setState({ view: "key", selectedKey: pubkey, _newSubkey: false });
  });
}
