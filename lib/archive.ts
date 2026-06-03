import { KerfSchema, type Kerf } from "./schema";

/**
 * Browser-local kerf archive.
 *
 * kerf.box is account-free: there is no server database and no login. A
 * saved kerf lives only in the visitor's own browser (per-origin
 * localStorage), the same trust model as the BYOK key. Nothing is uploaded;
 * clearing browser storage wipes the archive for good. To move a kerf
 * across devices or share it, export it as JSON (see lib/export.ts) — the
 * file IS the portable artifact.
 *
 * Storage shape: a single JSON array under STORAGE_KEY, newest first.
 * Each entry carries its own id, the originating url/audience, the full
 * validated Kerf, and a creation timestamp (ms epoch).
 */

const STORAGE_KEY = "kerfbox.archive";

/** A kerf saved to the browser-local archive. */
export type ArchivedKerf = {
  id: string;
  url: string;
  audience: string;
  kerf: Kerf;
  /** ms since epoch (Date.now()). */
  createdAt: number;
};

/** Soft cap so a long-lived browser can't blow past localStorage quota. */
const MAX_ENTRIES = 200;

/**
 * Generate a collision-resistant id. crypto.randomUUID is available in all
 * modern browsers over HTTPS (and on localhost); the timestamp fallback is
 * only for ancient/insecure contexts so we never throw.
 */
function newId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return `k_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Whether we're in a browser with a usable localStorage. SSR-safe. */
function hasStorage(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/**
 * Coerce an unknown parsed entry into a valid ArchivedKerf, or null. The
 * Kerf payload is validated against KerfSchema so a tampered/older blob
 * can't crash the detail view. Entries that fail are dropped silently.
 */
function coerceEntry(raw: unknown): ArchivedKerf | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const parsed = KerfSchema.safeParse(r.kerf);
  if (!parsed.success) return null;
  const id = typeof r.id === "string" && r.id ? r.id : newId();
  const url = typeof r.url === "string" ? r.url : "";
  const audience = typeof r.audience === "string" ? r.audience : "";
  const createdAt =
    typeof r.createdAt === "number" && Number.isFinite(r.createdAt)
      ? r.createdAt
      : Date.now();
  return { id, url, audience, kerf: parsed.data, createdAt };
}

/**
 * Read the whole archive, newest first. Returns [] on any failure
 * (missing, malformed, privacy mode) — the archive is best-effort.
 */
export function listArchive(): ArchivedKerf[] {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const entries = parsed
      .map(coerceEntry)
      .filter((e): e is ArchivedKerf => e !== null);
    // Defensive sort — storage should already be newest-first, but never
    // trust it after manual edits/imports.
    entries.sort((a, b) => b.createdAt - a.createdAt);
    return entries;
  } catch {
    return [];
  }
}

/** Read a single archived kerf by id, or null if absent. */
export function getArchived(id: string): ArchivedKerf | null {
  return listArchive().find((e) => e.id === id) ?? null;
}

function writeAll(entries: ArchivedKerf[]): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    return true;
  } catch {
    // Quota exceeded or privacy mode — surface as a failed save.
    return false;
  }
}

/**
 * Save a kerf to the archive and return the stored entry (with its new id),
 * or null if persistence failed. Newest entries sort first.
 */
export function saveToArchive(input: {
  url: string;
  audience: string;
  kerf: Kerf;
}): ArchivedKerf | null {
  const entry: ArchivedKerf = {
    id: newId(),
    url: input.url,
    audience: input.audience,
    kerf: input.kerf,
    createdAt: Date.now(),
  };
  const next = [entry, ...listArchive()];
  return writeAll(next) ? entry : null;
}

/**
 * Add an already-formed entry (e.g. from an imported JSON file), preserving
 * its kerf but minting a fresh id and timestamp so imports never collide
 * with or overwrite existing entries. Returns the stored entry or null.
 */
export function importToArchive(input: {
  url?: string;
  audience?: string;
  kerf: Kerf;
}): ArchivedKerf | null {
  return saveToArchive({
    url: input.url ?? "",
    audience: input.audience ?? "",
    kerf: input.kerf,
  });
}

/** Delete one entry by id. Returns true if anything changed. */
export function deleteArchived(id: string): boolean {
  const all = listArchive();
  const next = all.filter((e) => e.id !== id);
  if (next.length === all.length) return false;
  return writeAll(next);
}

/** Wipe the entire archive. */
export function clearArchive(): boolean {
  if (!hasStorage()) return false;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
