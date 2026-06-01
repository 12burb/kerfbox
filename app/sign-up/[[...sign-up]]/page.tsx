import { SignUp } from "@clerk/nextjs";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

// See app/sign-in/[[...sign-in]]/page.tsx for the rationale on the optional
// catch-all segment and the no-Clerk guard.
const hasClerk = !!(
  process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export default function SignUpPage() {
  if (!hasClerk) notFound();
  return (
    <div className="min-h-screen w-full flex items-center justify-center px-6 py-16">
      <SignUp />
    </div>
  );
}
