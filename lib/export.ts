import type { Kerf } from "./schema";

/**
 * Escape characters that would break out of a markdown inline-link's
 * label `[...]` or URL `(...)`. Citations come from the model and are
 * validated by CitationSchema (http(s) only, length-capped), but the
 * model still occasionally emits titles containing brackets, or URLs
 * with un-encoded parens (Wikipedia is a frequent offender). Without
 * escaping, a stray `]` collapses the label and a stray `)` truncates
 * the URL — and worse, the trailing text leaks into surrounding prose
 * as plain markdown.
 *
 * For URLs we percent-encode `(` and `)` rather than backslash-escape
 * because the latter isn't honored by every renderer (notably GitHub).
 * For labels we escape with backslashes per CommonMark §6.1.
 */
function mdEscapeLinkLabel(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\r?\n/g, " ");
}
function mdEscapeLinkUrl(s: string): string {
  return s
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\s+/g, "%20");
}

/**
 * Render a Kerf as a markdown document suitable for dropping into Notion,
 * Linear, or a static-site post.
 *
 * Order is opinionated — claim → cluster map → kerf → wedge proof+moat
 * → signals → concepts → calendar. The reader sees the cut before the
 * receipts so the document reads like an argument, not an audit.
 */
export function kerfToMarkdown(kerf: Kerf, meta?: { url?: string; audience?: string }): string {
  const lines: string[] = [];

  lines.push(`# ${kerf.wedge.claim}`);
  lines.push("");
  lines.push(`> ${kerf.company_summary}`);
  lines.push("");

  if (meta?.url || meta?.audience) {
    if (meta.url) lines.push(`**Source:** ${meta.url}`);
    if (meta.audience) lines.push(`**Audience:** ${meta.audience}`);
    lines.push("");
  }

  lines.push("---");
  lines.push("");

  // The Kerf — the cut itself
  lines.push("## The Kerf");
  lines.push("");
  lines.push(`**Cut:** ${kerf.kerf.cut}`);
  lines.push("");
  lines.push(`**Why now:** ${kerf.kerf.why_now}`);
  lines.push("");

  // Cluster map — what the kerf is cut between
  if (kerf.cluster_map.length > 0) {
    lines.push("## Where the Category Clusters");
    lines.push("");
    for (const c of kerf.cluster_map) {
      lines.push(`### ${c.cluster}`);
      lines.push("");
      lines.push(`*${c.examples.join(", ")}*`);
      lines.push("");
      lines.push(c.pattern);
      lines.push("");
    }
  }

  // Wedge — the claim, the proof, the moat
  lines.push("## The Wedge");
  lines.push("");
  lines.push(`**Claim:** ${kerf.wedge.claim}`);
  lines.push("");
  if (kerf.wedge.proof.length > 0) {
    lines.push("**Proof:**");
    lines.push("");
    for (const p of kerf.wedge.proof) {
      lines.push(`- ${p}`);
    }
    lines.push("");
  }
  lines.push(`**Moat:** ${kerf.wedge.moat}`);
  lines.push("");

  // Signals
  if (kerf.signals.length > 0) {
    lines.push("## Signals");
    lines.push("");
    for (const f of kerf.signals) {
      lines.push(`- **${f.source}:** ${f.finding}`);
      if (f.citations && f.citations.length > 0) {
        for (const c of f.citations) {
          lines.push(`  - [${mdEscapeLinkLabel(c.title)}](${mdEscapeLinkUrl(c.url)})`);
        }
      }
    }
    lines.push("");
  }

  // Concepts
  if (kerf.concepts.length > 0) {
    lines.push("## Concepts");
    lines.push("");
    kerf.concepts.forEach((c, i) => {
      lines.push(`### ${String(i + 1).padStart(2, "0")}. ${c.name}`);
      lines.push("");
      lines.push(`**Hook:** ${c.hook}`);
      lines.push("");
      lines.push(`**Embodies the wedge:** ${c.embodies_wedge}`);
      lines.push("");
      lines.push(`**Why now:** ${c.why_now}`);
      lines.push("");
    });
  }

  // Calendar
  if (kerf.calendar.length > 0) {
    lines.push("## 7-Day Calendar");
    lines.push("");
    lines.push("| Day | Time | Platform | Post Idea | Rationale |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const e of kerf.calendar) {
      const cleanIdea = e.post_idea.replace(/\|/g, "\\|").replace(/\n/g, " ");
      const cleanRationale = e.rationale.replace(/\|/g, "\\|").replace(/\n/g, " ");
      lines.push(
        `| ${e.day} | ${e.time} | ${e.platform} | ${cleanIdea} | ${cleanRationale} |`
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(`*Cut by kerf — strategy is a cut, not a story.*`);

  return lines.join("\n");
}

/**
 * Slugify the wedge claim for use as a download filename.
 */
export function kerfSlug(kerf: Kerf): string {
  const base = kerf.wedge.claim || kerf.company_summary || "kerf";
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  // A claim that's pure punctuation/non-ASCII (e.g. all em-dashes, all
  // CJK) collapses to "" — return a sane fallback so we never produce
  // download filenames like ".md".
  return slug || "kerf";
}

/**
 * @deprecated Use kerfToMarkdown. Retained as alias for legacy callers.
 */
export const briefToMarkdown = kerfToMarkdown;

/**
 * @deprecated Use kerfSlug.
 */
export const briefSlug = kerfSlug;

/**
 * Trigger a browser download of a string as a file.
 * Client-side only.
 */
export function downloadText(filename: string, content: string, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the click can resolve in all browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
