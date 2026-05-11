import { z } from "zod";

/* ============================================================
 * Shared primitives
 * ============================================================ */

// Allowlist http(s) only. Zod's .url() accepts javascript: and data: schemes
// which would let a model-emitted citation become an XSS vector the moment
// we render it as an <a href>. Belt-and-suspenders alongside any sanitization
// in lib/export.ts (the markdown escape for parens lives there).
const httpUrl = z
  .string()
  .url()
  .max(2000)
  .refine((u) => /^https?:\/\//i.test(u), { message: "http(s) only" });

export const CitationSchema = z.object({
  title: z.string().min(1).max(200),
  url: httpUrl,
});

export const SignalSchema = z.object({
  source: z.string().min(1).max(200),
  finding: z.string().min(1).max(2000),
  citations: z.array(CitationSchema).max(20).optional().default([]),
});

/* ============================================================
 * KERF — the v0.2 strategy artifact
 *
 * The methodology in code:
 *   1. cluster_map → where the category clusters today (named competitors)
 *   2. kerf        → the narrow defensible cut between clusters
 *   3. wedge       → claim that fits the kerf, proven, with a structural moat
 *   4. concepts    → executions that *embody* the wedge (not free-floating)
 *   5. calendar    → 7-day rollout
 *
 * Refusal rule (enforced in /api/strategy): wedge.moat MUST reference
 * at least one named competitor from cluster_map. If it doesn't, the
 * route emits an SSE `error` event (the stream is already open at the
 * moment of validation, so the HTTP status is 200 even on refusal —
 * clients should branch on the in-band event type, not the HTTP code).
 * The refusal is the brand POV expressed in code.
 * ============================================================ */

// Length caps applied to every string field: cheap insurance against a
// runaway model (or hostile input via the BYOK MCP path) blowing up
// downstream renderers, exceeding our 8000-token cap, or filling the
// briefs.brief_json blob with megabytes of garbage. The caps are loose
// enough that legitimate output is never clipped — they exist to refuse
// pathological output, not to shape it.

export const ClusterSchema = z.object({
  cluster: z.string().min(1).max(200),
  // Named competitors / examples that occupy this cluster. Min 2 because
  // a "cluster" of one is just a competitor — we need to show convergence.
  // Max 20 because anything more is a list-vomit failure mode, not strategy.
  examples: z.array(z.string().min(1).max(120)).min(2).max(20),
  pattern: z.string().min(1).max(500),
});

export const KerfCutSchema = z.object({
  // The cut: a single-sentence statement of what's between the clusters
  // and why it's reachable for THIS brand specifically.
  cut: z.string().min(1).max(500),
  why_now: z.string().min(1).max(500),
});

export const WedgeSchema = z.object({
  // The claim that fits inside the kerf. One sentence, taglinable.
  claim: z.string().min(1).max(280),
  // Proof the brand can legitimately make this claim. 2+ items.
  proof: z.array(z.string().min(1).max(500)).min(2).max(10),
  // Structural moat: WHY competitors can't simply copy. Must reference a
  // named competitor and explain the structural reason. Validated in route.
  moat: z.string().min(1).max(2000),
});

export const ConceptSchema = z.object({
  id: z.string().min(1).max(40),
  // 3-char floor stops the model from emitting placeholder names like "X" or "—".
  name: z.string().min(3).max(120),
  // How this concept embodies the wedge. Required — kills free-floating ideas.
  embodies_wedge: z.string().min(1).max(500),
  why_now: z.string().max(500),
  hook: z.string().max(500),
});

export const CalendarEntrySchema = z.object({
  day: z.string().min(1).max(40),
  time: z.string().min(1).max(40),
  platform: z.string().min(1).max(40),
  concept_id: z.string().min(1).max(40),
  post_idea: z.string().min(1).max(500),
  rationale: z.string().min(1).max(500),
});

/**
 * Concepts MUST be exactly 3 and calendar MUST be exactly 7 — this is
 * the contract the UI relies on (BriefStage renders 3 wedge cards and a
 * Mon-Sun row). The superRefine enforces that:
 *   - concept ids are unique (otherwise the calendar's concept_id can't
 *     unambiguously reference a concept)
 *   - every calendar.concept_id resolves to a real concept
 * If the model ships c1/c1/c1 ids or references c4 in the calendar,
 * we reject at parse time rather than render a UI that silently shows
 * the wrong concept under a calendar entry.
 */
export const KerfSchema = z
  .object({
    company_summary: z.string().min(1).max(2000),
    cluster_map: z.array(ClusterSchema).min(1).max(10),
    kerf: KerfCutSchema,
    wedge: WedgeSchema,
    signals: z.array(SignalSchema).max(20),
    concepts: z.array(ConceptSchema).length(3),
    calendar: z.array(CalendarEntrySchema).length(7),
  })
  .superRefine((data, ctx) => {
    const ids = data.concepts.map((c) => c.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (dupes.length > 0) {
      ctx.addIssue({
        code: "custom",
        path: ["concepts"],
        message: `Concept ids must be unique. Duplicate(s): ${[...new Set(dupes)].join(", ")}`,
      });
    }
    const idSet = new Set(ids);
    data.calendar.forEach((entry, i) => {
      if (!idSet.has(entry.concept_id)) {
        ctx.addIssue({
          code: "custom",
          path: ["calendar", i, "concept_id"],
          message: `calendar[${i}].concept_id "${entry.concept_id}" does not match any concept id`,
        });
      }
    });
  });

export const CopySchema = z.object({
  hook: z.string().max(500),
  caption: z.string().max(2000),
  visual_direction: z.string().max(1000),
  hashtags: z.array(z.string().max(60)).max(30),
  cta: z.string().max(200),
});

/* ============================================================
 * Legacy: BriefSchema (v0.1)
 *
 * Retained for backward-compat with rows already saved in
 * `briefs.brief_json` before the v0.2 rebrand. Read paths use
 * a permissive parser; new strategy generation always returns Kerf.
 * Do not extend.
 * ============================================================ */

export const PositioningSchema = z.object({
  angle: z.string(),
  rationale: z.string(),
});

export const LegacyConceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  why_now: z.string(),
  hook: z.string(),
});

export const BriefSchema = z.object({
  company_summary: z.string(),
  research_findings: z.array(SignalSchema),
  market_gap: z.string(),
  positioning: PositioningSchema,
  concepts: z.array(LegacyConceptSchema),
  calendar: z.array(CalendarEntrySchema),
});

/* ============================================================
 * Inferred types
 * ============================================================ */

export type Citation = z.infer<typeof CitationSchema>;
export type Signal = z.infer<typeof SignalSchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
export type KerfCut = z.infer<typeof KerfCutSchema>;
export type Wedge = z.infer<typeof WedgeSchema>;
export type Concept = z.infer<typeof ConceptSchema>;
export type CalendarEntry = z.infer<typeof CalendarEntrySchema>;
export type Kerf = z.infer<typeof KerfSchema>;
export type Copy = z.infer<typeof CopySchema>;

// Legacy
export type Positioning = z.infer<typeof PositioningSchema>;
export type LegacyConcept = z.infer<typeof LegacyConceptSchema>;
export type ResearchFinding = Signal;
export type Brief = z.infer<typeof BriefSchema>;

/* ============================================================
 * Request shapes
 * ============================================================ */

// Input caps:
//   url      — 2000 chars is comfortably above the practical browser URL
//              limit (Chrome ~2083) but stops a hostile caller from posting
//              a megabyte payload to chew through our prompt budget.
//   audience — 500 chars is ~80 words; everything past that is verbosity,
//              not signal, and dilutes the prompt.
export const StrategyRequestSchema = z.object({
  url: z.string().min(1).max(2000).url(),
  audience: z.string().min(1).max(500),
});

export const CopyRequestSchema = z.object({
  kerf: KerfSchema,
  entry: CalendarEntrySchema,
});

export type StrategyRequest = z.infer<typeof StrategyRequestSchema>;
export type CopyRequest = z.infer<typeof CopyRequestSchema>;

/* ============================================================
 * SSE wire format
 * ============================================================ */

export type SSEStepEvent = {
  type: "step";
  label: string;
  finding?: string;
  status: "running" | "done";
};
export type SSEKerfEvent = { type: "kerf"; kerf: Kerf };
export type SSEErrorEvent = { type: "error"; message: string };

export type SSEEvent = SSEStepEvent | SSEKerfEvent | SSEErrorEvent;
