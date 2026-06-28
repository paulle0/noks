// js/crypto.js — Nostr crypto helpers (key generation, hex utils)
import { schnorr } from "../vendor/noble-curves-secp256k1.js";
import { bytesToHex, hexToBytes } from "../vendor/noble-hashes-utils.js";

export { bytesToHex, hexToBytes };

export function generateSecretKey() {
  return schnorr.utils.randomPrivateKey();
}

export function getPublicKey(secretKey) {
  return schnorr.getPublicKey(secretKey);
}

export function getPublicKeyHex(secretKeyHex) {
  return bytesToHex(getPublicKey(hexToBytes(secretKeyHex)));
}

export function generateKeyPair() {
  const sk = generateSecretKey();
  const pk = getPublicKey(sk);
  return { seckey: bytesToHex(sk), pubkey: bytesToHex(pk) };
}

export function isValidHexKey(hex) {
  if (typeof hex !== "string") return false;
  return /^[0-9a-f]{64}$/i.test(hex.trim());
}

export function shortHex(hex, head = 8, tail = 6) {
  if (!hex) return "";
  if (hex.length <= head + tail + 3) return hex;
  return `${hex.slice(0, head)}…${hex.slice(-tail)}`;
}

export async function sha256Hex(input) {
  const data = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const buf = await crypto.subtle.digest("SHA-256", data);
  return bytesToHex(new Uint8Array(buf));
}

export function signSchnorr(messageHashHex, secretKeyHex) {
  const sig = schnorr.sign(hexToBytes(messageHashHex), hexToBytes(secretKeyHex));
  return bytesToHex(sig);
}

export function verifySchnorr(sigHex, messageHashHex, pubkeyHex) {
  try {
    return schnorr.verify(hexToBytes(sigHex), hexToBytes(messageHashHex), hexToBytes(pubkeyHex));
  } catch { return false; }
}
