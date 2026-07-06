/**
 * Pull the first balanced JSON object out of a model response.
 *
 * Background: even with "OUTPUT: Return ONLY raw JSON" pinned hard in the
 * system prompt, Anthropic models occasionally emit preamble ("Here's
 * the JSON:") or trailing commentary, or wrap the payload in ```json
 * fences. The naive `replace(/```json|```/g)` + JSON.parse pipeline used
 * to break on any of those edge cases.
 *
 * Approach: brace-count to find the first balanced top-level object.
 * Fences and prose are inert to the scanner (backticks are not braces),
 * so no pre-stripping — an earlier global fence-strip regex corrupted
 * legitimate backticks INSIDE string values (a caption containing a
 * fenced code snippet). String tracking is required because legitimate
 * payloads contain `{` and `}` inside string literals (a `claim` value
 * could legitimately be `"{user} says"`); naive counting would unbalance.
 *
 * Failure mode: returns null when no balanced object is found. Callers
 * map that to a 502 / in-stream error rather than passing garbage into
 * JSON.parse and risking a less informative TypeError.
 */
export function extractJsonObject(s: string): string | null {
  let depth = 0;
  let start = -1;
  let inStr = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      continue;
    }
    if (ch === "{") {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && start !== -1) {
        return s.slice(start, i + 1);
      }
    }
  }
  return null;
}
