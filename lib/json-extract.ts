/**
 * Pull the first balanced JSON object out of a model response.
 *
 * Background: even with "OUTPUT: Return ONLY raw JSON" pinned hard in the
 * system prompt, Anthropic models occasionally emit preamble ("Here's
 * the JSON:") or trailing commentary, or wrap the payload in ```json
 * fences. The naive `replace(/```json|```/g)` + JSON.parse pipeline used
 * to break on any of those edge cases.
 *
 * Approach: strip fences, then brace-count to find the first balanced
 * top-level object. String tracking is required because legitimate
 * payloads contain `{` and `}` inside string literals (a `claim` value
 * could legitimately be `"{user} says"`); naive counting would unbalance.
 *
 * Failure mode: returns null when no balanced object is found. Callers
 * map that to a 502 / in-stream error rather than passing garbage into
 * JSON.parse and risking a less informative TypeError.
 */
export function extractJsonObject(s: string): string | null {
  const stripped = s.replace(/```json\s*|\s*```/g, "");
  let depth = 0;
  let start = -1;
  let inStr = false;
  let escape = false;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
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
        return stripped.slice(start, i + 1);
      }
    }
  }
  return null;
}
