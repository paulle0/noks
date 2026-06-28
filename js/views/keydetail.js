// js/views/keydetail.js — Inspect a key, generate a new related key
import { state, setState, findKey } from "../state.js";
import { generateKeyPair, shortHex } from "../crypto.js";
import { npubFromHex, nsecFromHex } from "../nip19.js";
import { addKeyEntry, removeKeyEntry } from "../keyring.js";
import { toast, modal, escapeHtml, attachCopy } from "../ui-utils.js";
import { renderImportRelatedKeyForm } from "./keyimport.js";

export async function renderKeyDetail() {
  const root = document.getElementById("keyDetailCard");
  if (state._importKey) { renderImportRelatedKeyForm(root); return; }
  if (state._newSubkey) { renderNewRelatedKeyForm(root); return; }
  const key = findKey(state.selectedKey);
  if (!key) { toast("Key not found"); setState({ view: "dashboard" }); return; }
  renderExistingKey(root, key);
}

function renderExistingKey(root, key) {
  const npub = npubFromHex(key.pubkey);
  const delegationDisplay = key.delegation
    ? `<div class="field"><label>Delegation</label><div class="hex">${escapeHtml(key.delegation)}</div></div>` : "";

  root.innerHTML = `
    <div class="detail-head">
      <div id="detailTitle">
        <h2 class="detail-name">${escapeHtml(key.name || "Untitled key")}</h2>
        <p class="card-subtitle" style="margin:0;">
          <span class="key-relation ${key.relation}">${relLabel(key.relation)}</span>
          <span id="descDisplay">${key.description ? " · " + escapeHtml(key.description) : ""}</span>
        </p>
      </div>
      <div style="display:flex; gap:var(--space-2);">
        <button class="btn-edit" id="editBtn">Edit</button>
        <button class="btn-danger" id="deleteBtn">Delete</button>
      </div>
    </div>

    <div id="editPanel" hidden>
      <div class="field"><label>Name</label>
        <input id="editName" class="input" value="${escapeHtml(key.name || "")}" placeholder="e.g. Damus iOS" /></div>
      <div class="field"><label>Description</label>
        <input id="editDesc" class="input" value="${escapeHtml(key.description || "")}" placeholder="optional" /></div>
      <div class="field"><label>Delegation rules</label>
        <input id="editDelegation" class="input mono" value="${escapeHtml(key.delegation || "")}" placeholder='e.g. kind=1|kind=2' /></div>
      <div style="display:flex; gap:var(--space-2); margin-bottom:var(--space-5);">
        <button class="btn-primary" id="saveEditBtn">Save</button>
        <button class="btn-ghost" id="cancelEditBtn">Cancel</button>
      </div>
    </div>

    <div class="detail-section">
      <h4>Identifier</h4>
      <div class="field"><label>npub</label>
        <div class="copy-row">
          <input class="input mono" value="${escapeHtml(npub)}" readonly />
          <button class="copy-btn" data-copy="${escapeHtml(npub)}">Copy</button>
        </div></div>
      <div class="field"><label>hex pubkey</label>
        <div class="copy-row">
          <input class="input mono" value="${escapeHtml(key.pubkey)}" readonly />
          <button class="copy-btn" data-copy="${escapeHtml(key.pubkey)}">Copy</button>
        </div></div>
      ${key.seckey ? secretBlock(key.seckey) : ""}
      ${delegationDisplay}
    </div>`;

  attachCopy(root);
  root.querySelector("#deleteBtn").addEventListener("click", () => onDelete(key));
  root.querySelector("#editBtn").addEventListener("click", () => toggleEdit(root, true));
  root.querySelector("#cancelEditBtn").addEventListener("click", () => toggleEdit(root, false));
  root.querySelector("#saveEditBtn").addEventListener("click", () => onSaveEdit(root, key));
}

function toggleEdit(root, show) {
  root.querySelector("#editPanel").hidden = !show;
  root.querySelector("#editBtn").hidden = show;
}

async function onSaveEdit(root, key) {
  const name = root.querySelector("#editName").value.trim();
  const description = root.querySelector("#editDesc").value.trim();
  const delegation = root.querySelector("#editDelegation").value.trim();
  await addKeyEntry({ ...key, name, description, delegation });
  toast("Key updated", "success");
  setState({ view: "key", selectedKey: key.pubkey });
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

function relLabel(r) {
  return r === "S" ? "subkey" : r === "M" ? "masterkey" : "other";
}

async function onDelete(key) {
  const ok = await modal({
    title: "Delete this key?",
    body: `<p>Removes <strong>${escapeHtml(key.name || shortHex(key.pubkey))}</strong> from your local keyring.</p>`,
    confirmText: "Delete", confirmKind: "danger",
  });
  if (!ok) return;
  await removeKeyEntry(key.pubkey);
  toast("Key removed", "success");
  setState({ view: "dashboard" });
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
    <div class="detail-head"><h2 class="detail-name">New related key</h2></div>
    <p class="card-subtitle">Generate a fresh keypair and add it to your keyring.</p>
    <div class="field"><label>Relation type</label>
      <div class="checkbox-row" id="relationRow">${relOptions}</div>
      <p class="field-hint" id="relationHint">${relations[0].desc}</p></div>
    <div class="field"><label>Name</label>
      <input id="nName" class="input" placeholder="e.g. Damus iOS" /></div>
    <div class="field"><label>Description</label>
      <input id="nDesc" class="input" placeholder="optional" /></div>
    <div class="field"><label>Functions</label>
      <div class="checkbox-row">
        ${["signing","certify","encryption","authentication"].map((f) =>
          `<label class="chip-check"><input type="checkbox" value="${f}"
            ${f==="signing"?"checked":""}> ${f}</label>`).join("")}
      </div></div>
    <div class="field"><label>Delegation rules</label>
      <input id="nDelegation" class="input mono" placeholder='e.g. kind=1|kind=2 (optional)' /></div>
    <button class="btn-primary" id="createRelBtn" style="width:100%">Generate key</button>`;

  root.querySelector("#relationRow").addEventListener("change", (e) => {
    const sel = relations.find((r) => r.value === e.target.value);
    if (sel) root.querySelector("#relationHint").textContent = sel.desc;
  });

  root.querySelector("#createRelBtn").addEventListener("click", async () => {
    const relation = root.querySelector('input[name="relationType"]:checked').value;
    const name = root.querySelector("#nName").value.trim();
    const description = root.querySelector("#nDesc").value.trim();
    const delegation = root.querySelector("#nDelegation").value.trim();
    const fns = [...root.querySelectorAll(".chip-check input[type=checkbox]:checked")]
      .map((i) => i.value);
    const { seckey, pubkey } = generateKeyPair();
    await addKeyEntry({ relation, pubkey, seckey, name, description, functions: fns, delegation });
    toast("Key added — ready to share", "success");
    setState({ view: "key", selectedKey: pubkey, _newSubkey: false });
  });
}
