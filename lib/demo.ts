/**
 * Re-export shim. The actual demo Kerfs live in `lib/demos.ts` (multiple
 * verticals, one per landing carousel slide). The /api/strategy demo path
 * uses the gaming Kerf — keeping the historical name `DEMO_KERF` so the
 * route imports don't churn.
 */
export { GAMING_KERF as DEMO_KERF, GAMING_KERF as DEMO_BRIEF, DEMO_COPY } from "./demos";
