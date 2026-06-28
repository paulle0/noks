// js/state.js — Global app state with subscription
const listeners = new Set();

export const state = {
  masterkey: null,        // { pubkey, seckey, homeRelays }
  keyring: [],            // [{ relation, pubkey, seckey?, name, description, functions[], delegation }]
  view: "login",
  theme: "dark",
};

export function setState(patch) {
  Object.assign(state, patch);
  emit();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const fn of listeners) {
    try { fn(state); } catch (e) { console.error("listener error", e); }
  }
}

export function findKey(pubkey) {
  return state.keyring.find((k) => k.pubkey === pubkey) || null;
}

export function upsertKey(key) {
  const i = state.keyring.findIndex((k) => k.pubkey === key.pubkey);
  if (i >= 0) {
    state.keyring[i] = { ...state.keyring[i], ...key };
  } else {
    state.keyring.push(key);
  }
  emit();
}

export function removeKey(pubkey) {
  state.keyring = state.keyring.filter((k) => k.pubkey !== pubkey);
  emit();
}
