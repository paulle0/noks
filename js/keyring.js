// js/keyring.js — Orchestrates building+publishing keyring events
import { state, upsertKey, removeKey } from "./state.js";
import { buildPublicKeyring, buildPrivateKeyring } from "./events.js";
import { publish } from "./relays.js";
import { saveVault } from "./storage.js";

let sessionPassword = null;

export function setSessionPassword(pw) {
  sessionPassword = pw;
}

export async function persistVault() {
  if (!sessionPassword) return;
  await saveVault({
    masterkey: state.masterkey,
    keyring: state.keyring,
  }, sessionPassword);
}

export async function addKeyEntry(entry) {
  upsertKey(entry);
  await persistVault();
}

export async function removeKeyEntry(pubkey) {
  removeKey(pubkey);
  await persistVault();
}

/**
 * Publish the masterkey's kind 17991 (public) event.
 * Spec: tags = ["P", pubkey], content = JSON([{pubkey, relation, function, delegation}])
 */
export async function publishMasterPublicKeyring() {
  const m = state.masterkey;
  if (!m || !m.seckey) throw new Error("Masterkey secret key required");
  const entries = state.keyring.map((k) => ({
    relation: k.relation,
    pubkey: k.pubkey,
    functions: k.functions || [],
    delegation: k.delegation || "",
  }));
  const evt = buildPublicKeyring(m.seckey, entries);
  return publish(evt, m.homeRelays);
}

/**
 * Publish the masterkey's kind 17992 (private) event.
 * Spec: content = encrypted([{pubkey, seckey, name, description}])
 */
export async function publishMasterPrivateKeyring() {
  const m = state.masterkey;
  if (!m || !m.seckey) throw new Error("Masterkey secret key required");
  const payload = state.keyring.map((k) => ({
    pubkey: k.pubkey,
    seckey: k.seckey || null,
    name: k.name || "",
    description: k.description || "",
  }));
  const evt = buildPrivateKeyring(m.seckey, m.pubkey, payload);
  return publish(evt, m.homeRelays);
}

/**
 * Publish a kind 17991 from the SUBKEY's perspective — the subkey
 * publishes a reference back to its masterkey.
 */
export async function publishSubkeyKeyring(subkey) {
  if (!subkey.seckey) throw new Error("Subkey secret key required");
  const m = state.masterkey;
  const entries = [
    { relation: "M", pubkey: m.pubkey, functions: ["certify"], delegation: "" },
  ];
  const evt = buildPublicKeyring(subkey.seckey, entries);
  return publish(evt, m.homeRelays);
}

export function lockSession() {
  sessionPassword = null;
}
