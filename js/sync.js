// js/sync.js — Fetch existing keyring events from relays and merge
import { fetchLatest } from "./relays.js";
import { decryptPrivateKeyring, KIND_PUBLIC, KIND_PRIVATE } from "./events.js";

/**
 * Fetch both public (17991) and private (17992) keyrings in parallel,
 * then merge them by pubkey.
 *   - 17991 provides: relation, function, delegation
 *   - 17992 provides: seckey, name, description
 */
export async function fetchExistingKeyring(masterkey) {
  const { pubkey, seckey, homeRelays } = masterkey;
  if (!homeRelays || homeRelays.length === 0) return [];

  const [pubEntries, privEntries] = await Promise.all([
    fetchPublicKeyring(homeRelays, pubkey),
    fetchPrivateKeyring(homeRelays, pubkey, seckey),
  ]);

  return mergeEntries(pubEntries || [], privEntries || []);
}

function mergeEntries(pubEntries, privEntries) {
  const byPubkey = new Map();

  for (const e of pubEntries) {
    byPubkey.set(e.pubkey, { ...e });
  }

  for (const e of privEntries) {
    const existing = byPubkey.get(e.pubkey);
    if (existing) {
      existing.seckey = e.seckey || existing.seckey;
      existing.name = e.name || existing.name;
      existing.description = e.description || existing.description;
    } else {
      byPubkey.set(e.pubkey, { ...e });
    }
  }

  return [...byPubkey.values()];
}

async function fetchPrivateKeyring(relays, pubkey, seckey) {
  try {
    const event = await fetchLatest(relays, {
      kinds: [KIND_PRIVATE],
      authors: [pubkey],
      limit: 1,
    });
    if (!event) return null;
    const payload = decryptPrivateKeyring(event, seckey, pubkey);
    if (!Array.isArray(payload)) return null;
    return payload.map(normalizePrivateEntry);
  } catch (e) {
    console.warn("Failed to fetch/decrypt private keyring:", e);
    return null;
  }
}

async function fetchPublicKeyring(relays, pubkey) {
  try {
    const event = await fetchLatest(relays, {
      kinds: [KIND_PUBLIC],
      authors: [pubkey],
      limit: 1,
    });
    if (!event) return null;
    return parsePublicEvent(event);
  } catch (e) {
    console.warn("Failed to fetch public keyring:", e);
    return null;
  }
}

/**
 * Parse a kind 17991 event. Supports the current spec (JSON content +
 * "P" tags) and falls back to the legacy tag-based format.
 */
function parsePublicEvent(event) {
  // New spec format: content is a JSON array
  if (event.content) {
    try {
      const parsed = JSON.parse(event.content);
      if (Array.isArray(parsed)) {
        return parsed.map((e) => ({
          pubkey: e.pubkey,
          relation: e.relation || "O",
          functions: e.function || e.functions || [],
          delegation: e.delegation || "",
          seckey: null,
          name: "",
          description: "",
        }));
      }
    } catch { /* fall through to legacy */ }
  }

  // Legacy fallback: relation-based tags [S|O|M, pubkey, functions]
  return event.tags
    .filter((t) => (["S", "O", "M", "P"].includes(t[0])) && t[1])
    .map(normalizeLegacyTag);
}

function normalizePrivateEntry(e) {
  return {
    relation: e.relation || "O",
    pubkey: e.pubkey,
    seckey: e.seckey || null,
    name: e.name || "",
    description: e.description || "",
    functions: e.function || e.functions || [],
    delegation: "",
  };
}

function normalizeLegacyTag(tag) {
  if (tag[0] === "P") {
    return {
      relation: "O",
      pubkey: tag[1],
      seckey: null,
      name: "",
      description: "",
      functions: [],
      delegation: "",
    };
  }
  const fns = tag[2] ? tag[2].split(",").map((s) => s.trim()).filter(Boolean) : [];
  return {
    relation: tag[0],
    pubkey: tag[1],
    seckey: null,
    name: "",
    description: "",
    functions: fns,
    delegation: "",
  };
}
