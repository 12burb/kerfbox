"use client";

import { useEffect, useRef, useState } from "react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { ACCENT, ACCENT_DIM, MUTED } from "./shared";

export type SaveState = "idle" | "saving" | "saved" | "needs-auth" | "error";

type Props = {
  state: SaveState;
  onSave: () => void;
};

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

/**
 * Save-this-Kerf affordance. Anonymous visitors see "sign in to save."
 * The sign-in opens via Clerk modal so the user never leaves the page —
 * if we navigated to a separate sign-in route, the React state holding
 * the just-generated Kerf would be discarded and they'd have to redo
 * the work. The modal preserves it.
 *
 * On successful sign-in, the save retries automatically. Tracked via a
 * `pendingSave` flag set the moment they click "sign in to save," then
 * fired by the auth-state effect once Clerk reports `isSignedIn=true`.
 *
 * Two implementations exist — one Clerk-aware, one plain — selected at
 * module load by `hasClerk`. We can't conditionally call hooks, so the
 * conditional is on which COMPONENT mounts, not on whether useUser runs.
 */
export default function SaveBar(props: Props) {
  if (hasClerk) return <SaveBarAuth {...props} />;
  return <SaveBarPlain {...props} />;
}

/* -------- shell shared by both variants -------- */

function Shell({
  state,
  rightSlot,
}: {
  state: SaveState;
  rightSlot: React.ReactNode;
}) {
  return (
    <div
      className="mt-12 p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      style={{ border: `1px dashed ${ACCENT_DIM}` }}
    >
      <div>
        <div
          className="mono text-[10px] uppercase tracking-widest mb-1"
          style={{ color: ACCENT }}
        >
          ⎯ archive
        </div>
        <div className="text-sm" style={{ color: MUTED }}>
          {state === "saved"
            ? "Saved. Find it in your archive."
            : state === "needs-auth"
            ? "Sign in to save this Kerf to your archive — your work stays put."
            : state === "error"
            ? "Save failed — try again, or export markdown above."
            : "Like this cut? Save it to your archive."}
        </div>
      </div>
      <div className="flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}

const baseBtn =
  "mono text-xs uppercase tracking-widest px-4 py-3 inline-flex items-center gap-2";

function SaveButton({
  state,
  onSave,
}: {
  state: SaveState;
  onSave: () => void;
}) {
  return (
    <button
      onClick={onSave}
      disabled={state === "saving" || state === "saved"}
      className={baseBtn + " disabled:opacity-50"}
      style={{
        background: state === "saved" ? ACCENT_DIM : ACCENT,
        color: state === "saved" ? MUTED : "#000",
        fontWeight: 600,
      }}
    >
      {state === "saving"
        ? "saving…"
        : state === "saved"
        ? "saved ✓"
        : state === "error"
        ? "retry save"
        : "save kerf →"}
    </button>
  );
}

/* -------- Clerk-aware variant -------- */

function SaveBarAuth({ state, onSave }: Props) {
  const { isSignedIn } = useUser();
  const [pendingSave, setPendingSave] = useState(false);
  // Stable ref to onSave so the effect doesn't re-fire on every parent
  // render. The save closure captures fresh state via React closure on
  // each call site, but the function identity changes per render.
  const onSaveRef = useRef(onSave);
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // After the sign-in modal completes, isSignedIn flips to true. If the
  // user clicked "sign in to save" (pendingSave=true), retry the save
  // exactly once. Resetting pendingSave breaks any potential loop if
  // the save itself returns 401.
  useEffect(() => {
    if (pendingSave && isSignedIn) {
      setPendingSave(false);
      onSaveRef.current();
    }
  }, [pendingSave, isSignedIn]);

  // Clear the pending flag if the parent transitions OUT of needs-auth
  // for any reason other than a successful sign-in: e.g. the user closes
  // the modal without signing in, navigates away, or starts a new run.
  // Without this clear, a later sign-in (for ANY reason) would silently
  // re-fire the save.
  useEffect(() => {
    if (state !== "needs-auth" && !isSignedIn && pendingSave) {
      setPendingSave(false);
    }
  }, [state, isSignedIn, pendingSave]);

  if (state === "needs-auth") {
    return (
      <Shell
        state={state}
        rightSlot={
          <SignInButton mode="modal">
            <button
              onClick={() => setPendingSave(true)}
              className={baseBtn + " border"}
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              sign in to save →
            </button>
          </SignInButton>
        }
      />
    );
  }
  return <Shell state={state} rightSlot={<SaveButton state={state} onSave={onSave} />} />;
}

/* -------- Plain variant for envs without Clerk configured -------- */

function SaveBarPlain({ state, onSave }: Props) {
  if (state === "needs-auth") {
    return (
      <Shell
        state={state}
        rightSlot={
          <span className="mono text-xs" style={{ color: MUTED }}>
            (auth not configured)
          </span>
        }
      />
    );
  }
  return <Shell state={state} rightSlot={<SaveButton state={state} onSave={onSave} />} />;
}
