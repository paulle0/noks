// js/nip19.js — npub / nsec / nprofile encoding via nostr-tools
import { nip19 } from "../vendor/nostr-tools.js";

export function npubFromHex(hex) {
  return nip19.npubEncode(hex);
}

export function nprofileFromHex(hex, relays = []) {
  return nip19.nprofileEncode({ pubkey: hex, relays });
}

export function nsecFromHex(hex) {
  const bytes = Uint8Array.from(hex.match(/.{2}/g).map((b) => parseInt(b, 16)));
  return nip19.nsecEncode(bytes);
}

export function hexFromAny(input) {
  const s = input.trim();
  if (/^[0-9a-f]{64}$/i.test(s)) return s.toLowerCase();
  try {
    const { type, data } = nip19.decode(s);
    if (type === "nsec") {
      return Array.from(data).map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    if (type === "npub") return data;
    if (type === "nprofile") return data.pubkey;
  } catch (e) {
    throw new Error("Not a valid hex / npub / nsec");
  }
  throw new Error("Unrecognized key format");
}

export function isNsec(s) {
  return typeof s === "string" && s.startsWith("nsec1");
}

export function isNpub(s) {
  return typeof s === "string" && s.startsWith("npub1");
}

export { nip19 };
