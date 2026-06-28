// js/nlogin.js — Encode/decode the 'nlogin1...' bech32 TLV string
//
// TLV layout:
//   0 → 32-byte subkey SECRET key (mutually exclusive with type 4)
//   1 → relay URL (ASCII bytes), repeatable
//   2 → 32-byte masterkey public key
//   3 → keyring kind number (4-byte big-endian uint32)
//   4 → 32-byte subkey PUBLIC key (used when secret key not shared)
import { bech32 } from "../vendor/scure-base.js";
import { hexToBytes, bytesToHex } from "./crypto.js";

const PREFIX = "nlogin";
const enc = new TextEncoder();
const dec = new TextDecoder();

function writeTLV(type, value) {
  if (value.length > 255) throw new Error("TLV value too long");
  return Uint8Array.of(type, value.length, ...value);
}

function concatBytes(...arrs) {
  let total = 0;
  for (const a of arrs) total += a.length;
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) { out.set(a, o); o += a.length; }
  return out;
}

function u32BE(n) {
  return Uint8Array.of(
    (n >>> 24) & 0xff, (n >>> 16) & 0xff,
    (n >>> 8) & 0xff, n & 0xff,
  );
}

function readU32BE(bytes) {
  return ((bytes[0] << 24) >>> 0) + (bytes[1] << 16) + (bytes[2] << 8) + bytes[3];
}

export function encodeNlogin({ subkeySec, subkeyPub, relays = [], masterPub, kind = 17991 }) {
  if (!masterPub) throw new Error("masterPub required");
  if (!subkeySec && !subkeyPub) throw new Error("subkeySec or subkeyPub required");

  const parts = [];
  if (subkeySec) parts.push(writeTLV(0, hexToBytes(subkeySec)));
  for (const url of relays) parts.push(writeTLV(1, enc.encode(url)));
  parts.push(writeTLV(2, hexToBytes(masterPub)));
  parts.push(writeTLV(3, u32BE(kind)));
  if (!subkeySec && subkeyPub) parts.push(writeTLV(4, hexToBytes(subkeyPub)));

  const payload = concatBytes(...parts);
  const words = bech32.toWords(payload);
  return bech32.encode(PREFIX, words, 5000);
}

export function decodeNlogin(str) {
  const { prefix, words } = bech32.decode(str, 5000);
  if (prefix !== PREFIX) throw new Error(`Wrong prefix: ${prefix}`);
  const bytes = bech32.fromWords(words);
  const out = { subkeySec: null, subkeyPub: null, relays: [], masterPub: null, kind: 17991 };
  let i = 0;
  while (i < bytes.length) {
    const t = bytes[i];
    const len = bytes[i + 1];
    const v = bytes.slice(i + 2, i + 2 + len);
    i += 2 + len;
    if (t === 0 && v.length === 32) out.subkeySec = bytesToHex(v);
    else if (t === 1) out.relays.push(dec.decode(v));
    else if (t === 2 && v.length === 32) out.masterPub = bytesToHex(v);
    else if (t === 3 && v.length === 4) out.kind = readU32BE(v);
    else if (t === 4 && v.length === 32) out.subkeyPub = bytesToHex(v);
  }
  if (!out.masterPub) throw new Error("nlogin missing masterkey pubkey");
  if (!out.subkeySec && !out.subkeyPub) throw new Error("nlogin has no subkey material");
  return out;
}

export function isNlogin(s) {
  return typeof s === "string" && s.toLowerCase().startsWith("nlogin1");
}
