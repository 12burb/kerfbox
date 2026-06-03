"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy as CopyIcon, Loader2, X as XIcon } from "lucide-react";
import { ACCENT, ACCENT_DIM, BG, BG_2, BG_3, INK, MUTED, platformStyle } from "./shared";
import type { CalendarEntry, Copy } from "@/lib/schema";

type Props = {
  entry: CalendarEntry;
  copy: Copy | null;
  loading: boolean;
  /** Optional error string. When set with copy=null, render an error state
   *  instead of an indefinite spinner — without this the modal showed a
   *  spinner forever on /api/copy failure. */
  error?: string | null;
  onClose: () => void;
  /** Optional retry callback — when provided alongside `error`, the
   *  error state shows a "retry" button. */
  onRetry?: () => void;
};

function buildFullCopy(entry: CalendarEntry, copy: Copy): string {
  const parts: string[] = [];
  parts.push(`${entry.platform} · ${entry.day} · ${entry.time}`);
  parts.push("");
  parts.push(copy.hook);
  parts.push("");
  parts.push(copy.caption);
  if (copy.cta) {
    parts.push("");
    parts.push(`→ ${copy.cta}`);
  }
  if (copy.hashtags && copy.hashtags.length > 0) {
    parts.push("");
    parts.push(copy.hashtags.join(" "));
  }
  return parts.join("\n");
}

function CopyButton({
  text,
  label = "copy",
  variant = "ghost",
}: {
  text: string;
  label?: string;
  variant?: "ghost" | "solid";
}) {
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback: select-and-prompt is overkill for v0.1 — silent fail.
    }
  };

  const base =
    "mono text-[10px] uppercase tracking-widest px-2 py-1 flex items-center gap-1.5 transition-colors";
  const styles =
    variant === "solid"
      ? { background: ACCENT, color: "#000", fontWeight: 600 }
      : { border: `1px solid ${ACCENT_DIM}`, color: copied ? ACCENT : MUTED };

  return (
    <button onClick={onClick} className={base} style={styles} aria-label={label}>
      {copied ? <Check size={12} /> : <CopyIcon size={12} />}
      <span>{copied ? "copied" : label}</span>
    </button>
  );
}

export default function CopyModal({ entry, copy, loading, error, onClose, onRetry }: Props) {
  const platform = platformStyle(entry.platform);
  const fullCopy = copy ? buildFullCopy(entry, copy) : "";
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Modal lifecycle: lock body scroll, capture/restore focus, wire Esc.
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
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
      style={{ background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-modal-title"
        className="relative w-full md:max-w-2xl max-h-[90vh] overflow-auto scrollbar-thin reveal"
        style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sticky top-0 z-10 flex items-center justify-between p-5 md:p-6"
          style={{ background: BG_2, borderBottom: `1px solid ${ACCENT_DIM}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              id="copy-modal-title"
              className="mono text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0"
              style={{ background: platform.bg, color: platform.fg }}
            >
              {entry.platform}
            </div>
            <div className="mono text-xs truncate" style={{ color: MUTED }}>
              {entry.day} · {entry.time}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {copy && <CopyButton text={fullCopy} label="copy all" variant="solid" />}
            <button ref={closeBtnRef} onClick={onClose} className="p-1" aria-label="close">
              <XIcon size={18} style={{ color: MUTED }} />
            </button>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {loading ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 size={24} className="spin-slow" style={{ color: ACCENT }} />
              <div className="mono text-xs uppercase tracking-widest" style={{ color: MUTED }}>
                Writing the post
                <span className="cursor">▋</span>
              </div>
            </div>
          ) : error && !copy ? (
            <div className="flex flex-col items-center gap-4 py-12 text-center" role="alert">
              <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                Copy generation failed
              </div>
              <div className="text-sm max-w-md" style={{ color: MUTED }}>
                {error}
              </div>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mono text-[11px] uppercase tracking-widest px-4 py-2 border"
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  retry →
                </button>
              )}
            </div>
          ) : copy ? (
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                    ⎯ Hook
                  </div>
                  <CopyButton text={copy.hook} />
                </div>
                <div className="serif italic text-2xl md:text-3xl leading-tight" style={{ fontWeight: 400 }}>
                  &ldquo;{copy.hook}&rdquo;
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                    ⎯ Caption
                  </div>
                  <CopyButton text={copy.caption} />
                </div>
                <div
                  className="text-base leading-relaxed whitespace-pre-wrap p-4"
                  style={{ background: BG, border: `1px solid ${ACCENT_DIM}` }}
                >
                  {copy.caption}
                </div>
              </div>

              <div>
                <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                  ⎯ Visual Direction
                </div>
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {copy.visual_direction}
                </p>
              </div>

              {copy.hashtags && copy.hashtags.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="mono text-[10px] uppercase tracking-widest"
                      style={{ color: ACCENT }}
                    >
                      ⎯ Tags
                    </div>
                    <CopyButton text={copy.hashtags.join(" ")} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {copy.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        className="mono text-xs px-2 py-1"
                        style={{ background: BG_3, color: ACCENT }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {copy.cta && (
                <div className="pt-6" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
                  <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                    CTA
                  </div>
                  <div className="mono text-sm" style={{ color: INK }}>
                    → {copy.cta}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
