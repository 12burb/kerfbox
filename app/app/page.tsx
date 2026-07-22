"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import InputStage from "@/components/cmo/InputStage";
import WorkingStage from "@/components/cmo/WorkingStage";
import KerfStage from "@/components/cmo/BriefStage";
import CopyModal from "@/components/cmo/CopyModal";
import SaveBar, { type SaveState } from "@/components/cmo/SaveBar";
import {
  ACCENT,
  ACCENT_DIM,
  MUTED,
  type ResearchStep,
} from "@/components/cmo/shared";
import { KerfSchema, CopySchema, type Kerf, type CalendarEntry, type Copy } from "@/lib/schema";
import { readSSE } from "@/lib/sse";
import { saveToArchive } from "@/lib/archive";
import {
  buildByokHeaders,
  canRunLive,
  defaultByokSettings,
  loadByokSettings,
  saveByokSettings,
  type ByokSettings,
} from "@/lib/byok-store";
import { PROVIDERS } from "@/lib/providers";

type Stage = "input" | "working" | "kerf";

export default function AppPage() {
  const [stage, setStage] = useState<Stage>("input");
  const [url, setUrl] = useState("https://linear.app");
  const [audience, setAudience] = useState("Indie SaaS founders shipping their first $1k MRR");
  const [byok, setByok] = useState<ByokSettings>(defaultByokSettings);
  const [researchSteps, setResearchSteps] = useState<ResearchStep[]>([]);
  const [kerf, setKerf] = useState<Kerf | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<CalendarEntry | null>(null);
  const [copyData, setCopyData] = useState<Copy | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // AbortController for the in-flight /api/strategy fetch. Aborted on
  // reset() and on a new run() so a user who clicks "new kerf" mid-stream
  // doesn't get the previous kerf landing in their state seconds later.
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (stage === "working") {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stage]);

  // Cancel any in-flight stream when the page unmounts. Without this, a
  // route change during inference would leak the fetch and the SSE reader.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Hydrate BYOK settings from localStorage on first mount. Saved-kerf
  // views (`components/cmo/BriefView.tsx`) read the same store so users
  // who configure a provider here once can generate copy from their
  // archive without re-entering anything.
  useEffect(() => {
    setByok(loadByokSettings());
  }, []);

  // Persist BYOK to the browser ONLY. This is the security model we promise
  // users: keys live exclusively on their own device (per-origin
  // localStorage). They ride to our API solely as transient request headers
  // (X-Provider/X-Api-Key, or X-Anthropic-Key) so the server can call the
  // provider on that request — never written to a database, never logged,
  // never proxied. We hold no copy. Clearing a field removes it from
  // localStorage immediately and permanently.
  //
  // Skip the first run: this effect fires once with the default (empty)
  // settings BEFORE the hydrate effect above lands its state update, and
  // persisting that default would wipe the stored settings.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!hydratedRef.current) {
      hydratedRef.current = true;
      return;
    }
    saveByokSettings(byok);
  }, [byok]);

  const run = async (demoMode: boolean) => {
    if (!demoMode && (!url.trim() || !audience.trim())) {
      setError("URL and audience are both required.");
      return;
    }
    if (!demoMode && !canRunLive(byok)) {
      const label = PROVIDERS[byok.provider].label;
      setError(
        `Add your ${label} key (or pick another provider) to run live — or click 'run with demo data'.`
      );
      return;
    }
    // Demo mode streams canned content, but /api/strategy still schema-
    // validates the body (http(s) URL, audience 1-500 chars). Substitute
    // well-formed defaults for blank/invalid fields so "run with demo data
    // (no key needed)" never 400s on inputs the demo doesn't even use —
    // and reflect them in state so the working screen and archive metadata
    // stay coherent.
    let effectiveUrl = url.trim();
    let effectiveAudience = audience.trim();
    if (demoMode) {
      let urlOk = false;
      try {
        const protocol = new URL(effectiveUrl).protocol;
        urlOk = protocol === "http:" || protocol === "https:";
      } catch {
        urlOk = false;
      }
      if (!urlOk) effectiveUrl = "https://linear.app";
      effectiveAudience =
        (effectiveAudience || "Indie SaaS founders shipping their first $1k MRR").slice(0, 500);
      if (effectiveUrl !== url) setUrl(effectiveUrl);
      if (effectiveAudience !== audience) setAudience(effectiveAudience);
    }

    // Abort any prior in-flight stream so its trailing events can't land
    // in our state. New AbortController for THIS run.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setStage("working");
    setError(null);
    setKerf(null);
    setResearchSteps([]);
    setSaveState("idle");

    // 120s watchdog. The route's own maxDuration is 90s; client side we
    // give it a 30s grace window for cold-start + handshake before we
    // give up. Reset on every event so a slow-but-progressing stream
    // doesn't trip it. Server-side moat refusals come through as in-stream
    // `error` events (HTTP status is already 200 by then) well before
    // this timer fires.
    let watchdog: ReturnType<typeof setTimeout> | null = null;
    let watchdogFired = false;
    const armWatchdog = () => {
      if (watchdog) clearTimeout(watchdog);
      watchdog = setTimeout(() => {
        watchdogFired = true;
        controller.abort();
      }, 120_000);
    };
    armWatchdog();

    try {
      // BYOK headers are the only path to live inference. The /api/strategy
      // route resolves X-Provider/X-Api-Key (or legacy X-Anthropic-Key),
      // calls the chosen provider with that key, and never persists it.
      // For demo mode no headers go out — the route returns canned content.
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...(demoMode ? {} : buildByokHeaders(byok)),
      };

      const res = await fetch("/api/strategy", {
        method: "POST",
        headers,
        body: JSON.stringify({ url: effectiveUrl, audience: effectiveAudience, demo: demoMode }),
        signal: controller.signal,
      });
      if (!res.ok) {
        // Branch error messages by status: a 401 from a missing/expired
        // BYOK is a different user action (paste a fresh key) than a 429
        // (wait it out) or a 5xx (transient — retry).
        const body = await res.json().catch(() => ({}));
        const apiMsg = typeof body?.error === "string" ? body.error : null;
        if (res.status === 401) {
          throw new Error(
            apiMsg ??
              `Authentication failed — check your ${PROVIDERS[byok.provider].label} key or try demo mode.`
          );
        }
        // No `if (res.status === 422)` branch here: /api/strategy opens
        // the SSE stream on the first byte, so by the time we'd know
        // whether the moat refusal hit, the HTTP status is already 200
        // and the rejection arrives as an in-stream `error` event below.
        if (res.status === 429) {
          throw new Error("Rate limit hit — wait a moment, then retry.");
        }
        throw new Error(apiMsg ?? `API returned ${res.status}.`);
      }

      // SSE termination: the `kerf` event is terminal. Break out of the
      // for-await so the async iterator's `return()` runs, releasing the
      // reader lock and letting the underlying fetch close. (We don't
      // abort the controller — that would also abort the post-kerf
      // animation loop below which checks `controller.signal.aborted`.)
      let finalKerf: Kerf | null = null;
      for await (const event of readSSE(res, controller.signal)) {
        armWatchdog();
        if (event.type === "step") {
          setResearchSteps((prev) => {
            const last = prev[prev.length - 1];
            if (event.status === "done" && last && last.label === event.label && last.status === "running") {
              return [
                ...prev.slice(0, -1),
                { label: event.label, finding: event.finding ?? last.finding, status: "done" },
              ];
            }
            return [
              ...prev,
              { label: event.label, finding: event.finding ?? null, status: event.status },
            ];
          });
        } else if (event.type === "kerf") {
          finalKerf = event.kerf;
          break;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }

      if (!finalKerf) throw new Error("Stream ended without a kerf.");
      const parsed = KerfSchema.safeParse(finalKerf);
      if (!parsed.success) throw new Error("Received a malformed kerf.");

      const realSteps: ResearchStep[] = parsed.data.signals.map((f) => ({
        label: f.source,
        finding: f.finding,
        status: "pending",
      }));
      setResearchSteps(realSteps);
      for (let k = 0; k < realSteps.length; k++) {
        await new Promise((r) => setTimeout(r, 280));
        if (controller.signal.aborted) return;
        setResearchSteps((prev) =>
          prev.map((s, idx) => (idx === k ? { ...s, status: "done" } : s))
        );
      }

      await new Promise((r) => setTimeout(r, 700));
      if (controller.signal.aborted) return;
      setKerf(parsed.data);
      setStage("kerf");
    } catch (err) {
      // Aborts are user-initiated (reset, navigation, watchdog) — don't
      // surface them as errors. Watchdog gets a specific message.
      if (
        controller.signal.aborted ||
        (err instanceof DOMException && err.name === "AbortError") ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        // Watchdog fired vs. user reset/unmount: the timer sets
        // watchdogFired before aborting, so this is exact. (Don't infer it
        // from `stage` — that closure variable is frozen at the render
        // that created this run(), always "input", so a stage check here
        // is dead code and the timeout would be silently swallowed.)
        if (watchdogFired) {
          setError("Stream timed out after 2 minutes. Retry, or try demo mode.");
          setStage("input");
        }
        return;
      }
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setStage("input");
    } finally {
      if (watchdog) clearTimeout(watchdog);
    }
  };

  /**
   * Save the current Kerf to the browser-local archive (localStorage).
   * Account-free: there is no server to POST to — the kerf lives only in
   * this browser. Clearing site data wipes it, so the SaveBar also offers
   * JSON export as the durable, portable copy.
   */
  const saveKerf = () => {
    if (!kerf) return;
    setSaveState("saving");
    const entry = saveToArchive({ url, audience, kerf });
    setSaveState(entry ? "saved" : "error");
  };

  const generateCopy = async (entry: CalendarEntry) => {
    if (!kerf) return;
    setSelectedEntry(entry);
    setCopyData(null);
    setCopyError(null);
    setCopyLoading(true);
    try {
      const byokHeaders = buildByokHeaders(byok);
      const live = Object.keys(byokHeaders).length > 0;
      const headers: HeadersInit = { "Content-Type": "application/json", ...byokHeaders };
      // Keyless sessions (demo runs) must ask for canned copy explicitly —
      // without `demo: true` the route 401s with an API-level hint the UI
      // user can't act on, dead-ending the "no key needed" funnel at the
      // first calendar click.
      const res = await fetch("/api/copy", {
        method: "POST",
        headers,
        body: JSON.stringify(live ? { kerf, entry } : { kerf, entry, demo: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = typeof body?.error === "string" ? body.error : `API returned ${res.status}.`;
        throw new Error(msg);
      }
      const { copy } = await res.json();
      const parsed = CopySchema.safeParse(copy);
      if (!parsed.success) throw new Error("Malformed copy payload.");
      setCopyData(parsed.data);
    } catch (err) {
      setCopyData(null);
      setCopyError(err instanceof Error ? err.message : "Copy generation failed.");
    } finally {
      setCopyLoading(false);
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStage("input");
    setKerf(null);
    setResearchSteps([]);
    setSelectedEntry(null);
    setCopyData(null);
    setCopyError(null);
    setError(null);
    setSaveState("idle");
  };

  return (
    <div className="min-h-screen w-full">
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="flex items-center justify-between mb-10">
          <Link href="/" aria-label="kerf.box home" className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: ACCENT }}>
              <span className="mono text-black font-bold text-sm">K</span>
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
                kerf<span style={{ color: ACCENT }}>.</span>box
              </div>
              <div className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                Strategy is a cut, not a story.
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {stage === "input" && (
              <Link
                href="/briefs"
                className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
                style={{ borderColor: ACCENT_DIM, color: MUTED }}
              >
                archive →
              </Link>
            )}
            {stage !== "input" && (
              <button
                onClick={reset}
                className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
                style={{ borderColor: ACCENT_DIM, color: MUTED }}
              >
                ← new kerf
              </button>
            )}
          </div>
        </header>

        {stage === "input" && (
          <InputStage
            url={url}
            audience={audience}
            byok={byok}
            error={error}
            onUrlChange={setUrl}
            onAudienceChange={setAudience}
            onByokChange={setByok}
            onRun={run}
          />
        )}

        {stage === "working" && (
          <WorkingStage
            url={url}
            audience={audience}
            researchSteps={researchSteps}
            elapsed={elapsed}
          />
        )}

        {stage === "kerf" && kerf && (
          <>
            <KerfStage kerf={kerf} onEntryClick={generateCopy} meta={{ url, audience }} />
            <SaveBar
              state={saveState}
              onSave={saveKerf}
              kerf={kerf}
              meta={{ url, audience }}
            />
          </>
        )}

        {selectedEntry && (
          <CopyModal
            entry={selectedEntry}
            copy={copyData}
            loading={copyLoading}
            error={copyError}
            onRetry={() => generateCopy(selectedEntry)}
            onClose={() => {
              setSelectedEntry(null);
              setCopyError(null);
            }}
          />
        )}
      </div>

      <div
        className="text-center py-6 mono text-[10px] uppercase tracking-widest"
        style={{ color: MUTED }}
      >
        kerf.box · strategy is a cut · v0.3
      </div>
    </div>
  );
}

