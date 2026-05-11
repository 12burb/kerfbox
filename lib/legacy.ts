import type { Brief, Kerf } from "./schema";

/**
 * Adapt a legacy v0.1 Brief into a Kerf for rendering.
 *
 * Old briefs predate the Kerf method — they have no cluster_map and
 * no moat, only a positioning angle and rationale. This adapter does
 * a *honest* migration: it lifts what's there into the closest Kerf
 * field and explicitly marks the moat as missing so the renderer can
 * badge it as legacy. We never invent a moat. The whole point of the
 * v0.2 refusal rule is that undefendable strategy gets called out.
 */
export function briefToKerf(brief: Brief): Kerf {
  return {
    company_summary: brief.company_summary,
    cluster_map: [],
    kerf: {
      cut: brief.positioning.angle,
      why_now: brief.market_gap,
    },
    wedge: {
      claim: brief.positioning.angle,
      proof: [brief.positioning.rationale],
      moat:
        "(Legacy v0.1 brief — no moat captured. Re-run on the app to cut a defensible Kerf.)",
    },
    signals: brief.research_findings,
    concepts: brief.concepts.map((c) => ({
      id: c.id,
      name: c.name,
      embodies_wedge: "(Legacy v0.1 concept — pre-dates the wedge requirement.)",
      why_now: c.why_now,
      hook: c.hook,
    })),
    calendar: brief.calendar,
  };
}
