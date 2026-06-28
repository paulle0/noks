// js/views/keyimport.js — Import an existing secret or public key into the keyring
import { setState } from "../state.js";
import { isValidHexKey, getPublicKeyHex } from "../crypto.js";
import { hexFromAny, isNsec, isNpub, npubFromHex } from "../nip19.js";
import { addKeyEntry } from "../keyring.js";
import { toast, escapeHtml } from "../ui-utils.js";

export function renderImportRelatedKeyForm(root) {
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
    <div class="detail-head"><h2 class="detail-name">Import related key</h2></div>
    <p class="card-subtitle">Paste an existing key to add it to your keyring.</p>
    <div class="field"><label>Key type</label>
      <div class="checkbox-row" id="keyTypeRow">
        <label class="chip-check"><input type="radio" name="keyType" value="secret" checked /> Secret key</label>
        <label class="chip-check"><input type="radio" name="keyType" value="public" /> Public key</label>
      </div></div>
    <div class="field">
      <label id="keyInputLabel">Secret key</label>
      <input id="importKeyInput" class="input mono" placeholder="nsec1… or 64-char hex" autocomplete="off" />
      <p class="field-hint" id="keyInputHint">The public key will be derived automatically.</p></div>
    <div id="derivedInfo" hidden>
      <div class="field"><label>Derived public key (npub)</label>
        <div class="hex" id="derivedNpub"></div></div></div>
    <div class="field"><label>Relation type</label>
      <div class="checkbox-row" id="relationRow">${relOptions}</div>
      <p class="field-hint" id="relationHint">${relations[0].desc}</p></div>
    <div class="field"><label>Name</label>
      <input id="impName" class="input" placeholder="e.g. Damus iOS" /></div>
    <div class="field"><label>Description</label>
      <input id="impDesc" class="input" placeholder="optional" /></div>
    <div class="field"><label>Functions</label>
      <div class="checkbox-row">
        ${["signing","certify","encryption","authentication"].map((f) =>
          `<label class="chip-check"><input type="checkbox" value="${f}"
            ${f === "signing" ? "checked" : ""}> ${f}</label>`).join("")}
      </div></div>
    <div class="field"><label>Delegation rules</label>
      <input id="impDelegation" class="input mono" placeholder='e.g. kind=1|kind=2 (optional)' /></div>
    <button class="btn-primary" id="importRelBtn" style="width:100%">Import key</button>`;

  wireKeyTypeToggle(root);
  wireRelationHints(root, relations);
  wireKeyInputPreview(root);
  root.querySelector("#importRelBtn").addEventListener("click", () => onImport(root));
}

function wireKeyTypeToggle(root) {
  root.querySelector("#keyTypeRow").addEventListener("change", (e) => {
    const isSecret = e.target.value === "secret";
    root.querySelector("#keyInputLabel").textContent = isSecret ? "Secret key" : "Public key";
    root.querySelector("#importKeyInput").placeholder = isSecret
      ? "nsec1… or 64-char hex" : "npub1… or 64-char hex";
    root.querySelector("#keyInputHint").textContent = isSecret
      ? "The public key will be derived automatically." : "Only the public key will be stored.";
    root.querySelector("#derivedInfo").hidden = true;
    root.querySelector("#importKeyInput").value = "";
  });
}

function wireRelationHints(root, relations) {
  root.querySelector("#relationRow").addEventListener("change", (e) => {
    const sel = relations.find((r) => r.value === e.target.value);
    if (sel) root.querySelector("#relationHint").textContent = sel.desc;
  });
}

function wireKeyInputPreview(root) {
  const input = root.querySelector("#importKeyInput");
  let debounce = null;
  input.addEventListener("input", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => previewKey(root), 300);
  });
}

function previewKey(root) {
  const raw = root.querySelector("#importKeyInput").value.trim();
  const info = root.querySelector("#derivedInfo");
  if (!raw) { info.hidden = true; return; }
  const isSecret = root.querySelector('input[name="keyType"]:checked').value === "secret";
  try {
    if (isSecret) {
      const secHex = resolveSecretHex(raw);
      const pubHex = getPublicKeyHex(secHex);
      root.querySelector("#derivedNpub").textContent = npubFromHex(pubHex);
      info.hidden = false;
    } else {
      const pubHex = resolvePublicHex(raw);
      root.querySelector("#derivedNpub").textContent = npubFromHex(pubHex);
      info.hidden = false;
    }
  } catch { info.hidden = true; }
}

function resolveSecretHex(raw) {
  if (isNsec(raw)) return hexFromAny(raw);
  if (isValidHexKey(raw)) return raw.toLowerCase();
  throw new Error("Not a valid nsec or hex secret key");
}

function resolvePublicHex(raw) {
  if (isNpub(raw)) return hexFromAny(raw);
  if (isValidHexKey(raw)) return raw.toLowerCase();
  throw new Error("Not a valid npub or hex public key");
}

async function onImport(root) {
  const raw = root.querySelector("#importKeyInput").value.trim();
  if (!raw) { toast("Paste a key first", "error"); return; }
  const isSecret = root.querySelector('input[name="keyType"]:checked').value === "secret";
  let seckey = null, pubkey = null;
  try {
    if (isSecret) { seckey = resolveSecretHex(raw); pubkey = getPublicKeyHex(seckey); }
    else { pubkey = resolvePublicHex(raw); }
  } catch (e) { toast(e.message, "error"); return; }

  const relation = root.querySelector('input[name="relationType"]:checked').value;
  const name = root.querySelector("#impName").value.trim();
  const description = root.querySelector("#impDesc").value.trim();
  const delegation = root.querySelector("#impDelegation").value.trim();
  const functions = [...root.querySelectorAll(".chip-check input[type=checkbox]:checked")]
    .map((i) => i.value);

  await addKeyEntry({ relation, pubkey, seckey, name, description, functions, delegation });
  toast("Key imported to your keyring", "success");
  setState({ view: "key", selectedKey: pubkey, _importKey: false });
}
