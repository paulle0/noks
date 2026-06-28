// js/storage.js — Encrypted local persistence for the keyring
const KEY = "nks_vault_v1";
const HAS_VAULT = "nks_has_vault";

const enc = new TextEncoder();
const dec = new TextDecoder();

async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey(
    "raw", enc.encode(password), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 200_000, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function unb64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export async function saveVault(data, password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(data)),
  );
  const payload = { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  localStorage.setItem(KEY, JSON.stringify(payload));
  localStorage.setItem(HAS_VAULT, "1");
}

export async function loadVault(password) {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  const payload = JSON.parse(raw);
  const key = await deriveKey(password, unb64(payload.salt));
  try {
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: unb64(payload.iv) },
      key,
      unb64(payload.ct),
    );
    return JSON.parse(dec.decode(pt));
  } catch (e) {
    throw new Error("Invalid password");
  }
}

export function hasVault() {
  return localStorage.getItem(HAS_VAULT) === "1";
}

export function clearVault() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(HAS_VAULT);
}

export function getThemePref() {
  return localStorage.getItem("nks_theme") || "dark";
}
export function setThemePref(t) {
  localStorage.setItem("nks_theme", t);
}
