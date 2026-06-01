import { SignIn } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  // Auth pages should never be indexed.
  robots: { index: false, follow: false },
};

// Optional catch-all ([[...sign-in]]) so Clerk can route its multi-step
// flows (factor-one, SSO callback, etc.) under /sign-in. When Clerk isn't
// configured (self-host without accounts), this route doesn't exist as a
// concept — fall through to the branded 404 rather than crash rendering
// <SignIn /> with no provider above it.
const hasClerk = !!(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function SignInPage() {
  if (!hasClerk) notFound();
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-16">
      <SignIn />
    </div>
  );
}
