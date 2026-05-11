"use client";

import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { ACCENT_DIM, MUTED } from "./shared";

const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function AuthButtons() {
  if (!hasClerk) return null;
  return (
    <div className="flex items-center gap-2">
      <Show when="signed-out">
        <SignInButton mode="modal">
          <button
            className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
            style={{ borderColor: ACCENT_DIM, color: MUTED }}
          >
            sign up
          </button>
        </SignUpButton>
      </Show>
      <Show when="signed-in">
        <UserButton appearance={{ elements: { avatarBox: { width: 28, height: 28 } } }} />
      </Show>
    </div>
  );
}
