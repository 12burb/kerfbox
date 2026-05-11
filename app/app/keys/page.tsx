"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthButtons from "@/components/cmo/AuthButtons";
import { ACCENT, ACCENT_DIM, BG_2, INK, MUTED } from "@/components/cmo/shared";
import {
  KNOWN_SCOPES,
  DEFAULT_SCOPES,
  SCOPE_DESCRIPTIONS,
  type KnownScope,
} from "@/lib/scopes";

type ApiKey = {
  id: string;
  name: string;
  key_prefix: string;
  /** Stored as text[] in Postgres — defensively typed as string[] so a
   *  legacy/unknown scope doesn't make the type-system lie. */
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
};

type CreatedKey = {
  id: string;
  key: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never";
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;
  const min = 60_000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / min))}m ago`;
  if (diffMs < day) return `${Math.round(diffMs / hour)}h ago`;
  if (diffMs < 30 * day) return `${Math.round(diffMs / day)}d ago`;
  return fmtDate(iso);
}

export default function KeysPage() {
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  // Per-section errors so a load failure doesn't appear under the create
  // form, and a revoke failure doesn't look like a create error.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<Set<KnownScope>>(new Set(DEFAULT_SCOPES));
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedKey | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied">("idle");

  async function load() {
    try {
      const res = await fetch("/api/keys");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }
      const json = (await res.json()) as { keys: ApiKey[] };
      setKeys(json.keys);
      setLoadError(null);
    } catch (e) {
      // Preserve previously-loaded keys on transient failure rather than
      // dropping the user back to an empty list.
      setLoadError(e instanceof Error ? e.message : "Failed to load keys.");
      setKeys((prev) => prev ?? []);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setCreateError("Name is required.");
      return;
    }
    if (scopes.size === 0) {
      setCreateError("Select at least one scope.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), scopes: Array.from(scopes) }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || `API returned ${res.status}`);
      setCreated(body as CreatedKey);
      setName("");
      setScopes(new Set(DEFAULT_SCOPES));
      void load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Failed to create key.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? Any agent using it will start failing immediately.")) return;
    setRevoking(id);
    setRevokeError(null);
    try {
      const res = await fetch(`/api/keys/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `API returned ${res.status}`);
      }
      void load();
    } catch (e) {
      setRevokeError(e instanceof Error ? e.message : "Failed to revoke key.");
    } finally {
      setRevoking(null);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      // Clipboard API can fail in non-secure contexts; user can still
      // select+copy from the readonly input.
    }
  }

  const toggleScope = (s: KnownScope) => {
    setScopes((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const active = keys?.filter((k) => !k.revoked_at) ?? [];
  const revoked = keys?.filter((k) => k.revoked_at) ?? [];

  return (
    <div className="min-h-screen w-full">
      <div className="relative max-w-4xl mx-auto px-6 md:px-10 py-8 md:py-12">
        <header className="flex items-center justify-between mb-10">
          <Link href="/" aria-label="kerf.box home" className="flex items-center gap-3">
            <div
              className="w-8 h-8 flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <span className="mono text-black font-bold text-sm">K</span>
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
                kerf<span style={{ color: ACCENT }}>.</span>box
              </div>
              <div
                className="mono text-[10px] uppercase tracking-widest"
                style={{ color: MUTED }}
              >
                API keys
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/app"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              ← dashboard
            </Link>
            <AuthButtons />
          </div>
        </header>

        <div className="mb-12">
          <h1 className="serif text-3xl md:text-4xl mb-2" style={{ fontWeight: 600 }}>
            API keys
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
            Authorize agents (Claude Desktop, Cursor, custom Agent SDK builds) to call
            kerf.box on your behalf. Pass the key as{" "}
            <code className="mono" style={{ color: INK }}>
              Authorization: Bearer cmo_live_…
            </code>{" "}
            on every request, and optionally pass{" "}
            <code className="mono" style={{ color: INK }}>
              X-Anthropic-Key
            </code>{" "}
            to bring your own Anthropic credentials (BYOK).
          </p>
        </div>

        {/* Create new key */}
        <section className="mb-12 border p-6" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: ACCENT }}
          >
            Mint a new key
          </div>
          <form onSubmit={createKey} className="space-y-5">
            <div>
              <label
                className="mono text-[10px] uppercase tracking-widest block mb-2"
                style={{ color: MUTED }}
              >
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="claude-desktop, ci-pipeline, …"
                maxLength={64}
                disabled={creating}
                className="w-full bg-transparent border px-3 py-2 text-sm focus:outline-none focus:ring-0"
                style={{ borderColor: ACCENT_DIM, color: INK }}
              />
            </div>
            <div>
              <label
                className="mono text-[10px] uppercase tracking-widest block mb-2"
                style={{ color: MUTED }}
              >
                Scopes
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {KNOWN_SCOPES.map((s) => (
                  <label
                    key={s}
                    className="flex items-start gap-3 p-3 border cursor-pointer hover:opacity-90"
                    style={{
                      borderColor: scopes.has(s) ? ACCENT : ACCENT_DIM,
                      background: scopes.has(s) ? "rgba(255,23,68,0.06)" : "transparent",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={scopes.has(s)}
                      onChange={() => toggleScope(s)}
                      disabled={creating}
                      className="mt-1"
                      style={{ accentColor: ACCENT }}
                    />
                    <div>
                      <div className="mono text-xs" style={{ color: INK }}>
                        {s}
                      </div>
                      <div className="text-xs mt-1" style={{ color: MUTED }}>
                        {SCOPE_DESCRIPTIONS[s]}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {createError && (
              <div className="text-xs" role="alert" style={{ color: ACCENT }}>
                {createError}
              </div>
            )}
            <button
              type="submit"
              disabled={creating || !name.trim() || scopes.size === 0}
              className="mono text-[11px] uppercase tracking-widest px-4 py-2 border disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: ACCENT, color: ACCENT, background: "transparent" }}
            >
              {creating ? "Generating…" : "Generate key →"}
            </button>
          </form>
        </section>

        {/* Active keys */}
        <section className="mb-12">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: MUTED }}
          >
            Active ({active.length})
          </div>
          {(loadError || revokeError) && (
            <div
              role="alert"
              className="text-xs mb-4 px-3 py-2 border"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              {revokeError ?? loadError}
            </div>
          )}
          {keys === null ? (
            <div className="mono text-xs uppercase tracking-widest py-12 text-center" style={{ color: MUTED }}>
              Loading…
            </div>
          ) : active.length === 0 ? (
            <div
              className="text-sm py-8 px-4 border text-center"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              No active keys. Generate one above to start authorizing agents.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: ACCENT_DIM }}>
              {active.map((k) => (
                <li key={k.id} className="py-5">
                  <div className="flex items-baseline justify-between gap-6 mb-1">
                    <div className="flex items-center gap-3">
                      <div
                        className="mono text-[10px] uppercase tracking-widest"
                        style={{ color: ACCENT }}
                      >
                        {fmtDate(k.created_at)}
                      </div>
                      <div className="mono text-xs" style={{ color: INK }}>
                        {k.key_prefix}…
                      </div>
                    </div>
                    <button
                      onClick={() => revokeKey(k.id)}
                      disabled={revoking === k.id}
                      className="mono text-[10px] uppercase tracking-widest px-2 py-1 border disabled:opacity-40"
                      style={{ borderColor: ACCENT_DIM, color: MUTED }}
                    >
                      {revoking === k.id ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                  <div className="serif text-base mb-1" style={{ fontWeight: 500 }}>
                    {k.name}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-1">
                    {k.scopes.map((s) => (
                      <span key={s} className="mono text-[10px]" style={{ color: MUTED }}>
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                    last used {fmtRelative(k.last_used_at)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Revoked keys */}
        {revoked.length > 0 && (
          <section className="mb-12 opacity-50">
            <div
              className="mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: MUTED }}
            >
              Revoked ({revoked.length})
            </div>
            <ul className="divide-y" style={{ borderColor: ACCENT_DIM }}>
              {revoked.map((k) => (
                <li key={k.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-6">
                    <div className="flex items-center gap-3">
                      <div className="mono text-[10px]" style={{ color: MUTED }}>
                        {fmtDate(k.created_at)}
                      </div>
                      <div className="mono text-xs line-through" style={{ color: MUTED }}>
                        {k.key_prefix}…
                      </div>
                      <div className="text-sm line-through" style={{ color: MUTED }}>
                        {k.name}
                      </div>
                    </div>
                    <div className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                      revoked {fmtRelative(k.revoked_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* MCP install hint */}
        <section className="mb-12">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: MUTED }}
          >
            Use it
          </div>
          <div className="border p-5" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
            <div className="text-xs mb-2" style={{ color: MUTED }}>
              Claude Desktop / Cursor — add to{" "}
              <code className="mono" style={{ color: INK }}>
                claude_desktop_config.json
              </code>{" "}
              or{" "}
              <code className="mono" style={{ color: INK }}>
                .cursor/mcp.json
              </code>
              :
            </div>
            <pre
              className="mono text-[11px] p-3 overflow-x-auto"
              style={{ background: "#000", color: INK }}
            >{`{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "@kerfbox/mcp"],
      "env": {
        "KERFBOX_API_KEY": "cmo_live_...",
        "KERFBOX_BYOK_ANTHROPIC_KEY": "sk-ant-..."
      }
    }
  }
}`}</pre>
          </div>
        </section>
      </div>

      {/* Created-key modal */}
      {created && (
        <CreatedKeyModal
          created={created}
          copyState={copyState}
          onCopy={() => copyToClipboard(created.key)}
          onClose={() => {
            setCreated(null);
            setCopyState("idle");
          }}
        />
      )}

      <div
        className="text-center py-6 mono text-[10px] uppercase tracking-widest"
        style={{ color: MUTED }}
      >
        kerf.box · strategy is a cut · v0.2
      </div>
    </div>
  );
}

/**
 * Modal for the just-minted plaintext key. Built with the credentials
 * surface in mind:
 *   - role="dialog" + aria-modal=true so screen readers announce it as a
 *     blocking dialog.
 *   - Esc closes (standard expectation; without it keyboard users have
 *     no way out).
 *   - Backdrop click closes (matches the visual affordance — the dimmed
 *     overlay implies "click off to dismiss").
 *   - Focus moves to the close button on mount and is restored to whatever
 *     element opened the dialog when it unmounts.
 *   - body scroll is locked while the dialog is open.
 */
function CreatedKeyModal({
  created,
  copyState,
  onCopy,
  onClose,
}: {
  created: CreatedKey;
  copyState: "idle" | "copied";
  onCopy: () => void;
  onClose: () => void;
}) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="created-key-title"
        className="w-full max-w-2xl border p-6 md:p-8"
        style={{ borderColor: ACCENT, background: BG_2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mono text-[10px] uppercase tracking-widest mb-2"
          style={{ color: ACCENT }}
        >
          New key — shown once
        </div>
        <h2
          id="created-key-title"
          className="serif text-2xl mb-4"
          style={{ fontWeight: 600 }}
        >
          {created.name}
        </h2>
        <p className="text-sm mb-5" style={{ color: MUTED }}>
          Copy it now and store it in your password manager or MCP config. We
          hash the key and never store the plaintext — if you lose it you&apos;ll
          have to mint a new one.
        </p>
        <div className="mb-4">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-2"
            style={{ color: MUTED }}
          >
            Key
          </div>
          <div className="flex gap-2">
            <input
              readOnly
              value={created.key}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="API key (read-only, shown once)"
              className="flex-1 mono text-xs bg-transparent border px-3 py-2"
              style={{ borderColor: ACCENT_DIM, color: INK }}
            />
            <button
              type="button"
              onClick={onCopy}
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              {copyState === "copied" ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
        <div className="mb-6">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-2"
            style={{ color: MUTED }}
          >
            Use it as
          </div>
          <pre
            className="mono text-[11px] p-3 overflow-x-auto"
            style={{ background: "#000", color: INK }}
          >{`Authorization: Bearer ${created.key}`}</pre>
        </div>
        <div className="flex justify-end">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="mono text-[11px] uppercase tracking-widest px-4 py-2 border"
            style={{ borderColor: ACCENT, color: ACCENT }}
          >
            I&apos;ve saved it →
          </button>
        </div>
      </div>
    </div>
  );
}
