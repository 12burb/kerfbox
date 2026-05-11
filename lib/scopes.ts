/**
 * API-key scopes — kept in their own file (no node imports) so client
 * components can import the canonical list without pulling in
 * `node:crypto` from `lib/api-keys.ts`.
 *
 * Order is the canonical display order in the UI.
 */
export const KNOWN_SCOPES = [
  "strategy:write",
  "copy:write",
  "briefs:read",
  "briefs:write",
] as const;
export type KnownScope = (typeof KNOWN_SCOPES)[number];

export const DEFAULT_SCOPES: KnownScope[] = [
  "strategy:write",
  "copy:write",
  "briefs:read",
];

/** Human-readable description for each scope, shown in the UI. */
//
// NOTE: scope identifiers (strategy:write, briefs:read, …) intentionally
// kept stable across the v0.1 → v0.2 rebrand. Existing API keys would
// break if we renamed them. Only the human-readable descriptions reflect
// the Kerf vocabulary.
export const SCOPE_DESCRIPTIONS: Record<KnownScope, string> = {
  "strategy:write": "Cut new Kerfs (run live strategy)",
  "copy:write": "Generate platform copy from a Kerf",
  "briefs:read": "List and fetch saved Kerfs",
  "briefs:write": "Save Kerfs to the archive",
};
