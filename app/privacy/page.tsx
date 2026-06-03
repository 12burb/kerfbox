import Link from "next/link";
import type { Metadata } from "next";
import { SITE_NAME, ISSUES_URL } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Privacy",
  description: `How ${SITE_NAME} handles your data: what we store, what we never touch, and how to reach us.`,
  alternates: { canonical: "/privacy" },
};

// Last substantive revision. Bump when the practices below change.
const UPDATED = "May 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-2xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <Link
          href="/"
          className="mono text-[10px] uppercase tracking-widest"
          style={{ color: "#ff1744" }}
        >
          ← kerf.box
        </Link>

        <h1 className="serif text-3xl md:text-4xl mt-8 mb-2" style={{ fontWeight: 500 }}>
          Privacy
        </h1>
        <p className="mono text-[10px] uppercase tracking-widest mb-10" style={{ color: "#7a7a82" }}>
          Last updated · {UPDATED}
        </p>

        <div className="space-y-8 text-sm leading-relaxed" style={{ color: "#cfc8ba" }}>
          <p>
            {SITE_NAME} is an early-stage (beta) product. This page describes what
            we collect, why, and what we deliberately never hold. It is written to
            be read, not to be hidden behind. If anything here is unclear, ask via{" "}
            <a
              href={ISSUES_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#ff1744" }}
            >
              the issue tracker
            </a>
            .
          </p>

          <section>
            <h2 className="serif text-xl mb-3" style={{ fontWeight: 500, color: "#f5f1e8" }}>
              What we store
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Account identity.</strong> Sign-in is handled by Clerk
                using Google. We receive your Clerk user id and the email
                associated with that sign-in. We do not store your Google
                password — Clerk handles authentication.
              </li>
              <li>
                <strong>Your kerfs.</strong> Strategy artifacts you save are
                stored in our database (Supabase) and scoped to your account.
                Only you can read them through the API.
              </li>
              <li>
                <strong>API keys.</strong> If you mint a key, we store a one-way
                hash and a short non-secret prefix — never the full key. The
                plaintext is shown once at creation and cannot be recovered.
              </li>
              <li>
                <strong>Usage metadata.</strong> We log endpoint, status code,
                and timing per request to operate rate limits and debug
                failures. Secrets are scrubbed from logs before they are written.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="serif text-xl mb-3" style={{ fontWeight: 500, color: "#f5f1e8" }}>
              What we never hold
            </h2>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Your Anthropic key (BYOK).</strong> When you pass an
                <code className="mono"> X-Anthropic-Key </code> header, it is used
                for that single request and never persisted, logged, or proxied
                anywhere we can read it. In the web app it lives only in your own
                browser&apos;s storage; clearing the field removes it for good.
              </li>
              <li>
                <strong>Payment details.</strong> {SITE_NAME} is free — there is
                no subscription and we do not process payments, so we never see or
                store a card number. You pay Anthropic directly for the inference
                you run with your own key.
              </li>
              <li>
                <strong>Your data, for sale.</strong> We do not sell or rent
                personal data, and we don&apos;t run third-party advertising
                trackers on the app.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="serif text-xl mb-3" style={{ fontWeight: 500, color: "#f5f1e8" }}>
              Third-party processors
            </h2>
            <p>
              We rely on a small set of infrastructure providers to run the
              service: <strong>Clerk</strong> (authentication),{" "}
              <strong>Supabase</strong> (database), <strong>Vercel</strong>{" "}
              (hosting), and <strong>Anthropic</strong> (model inference). Your
              inputs are sent to Anthropic only to generate the response you
              requested.
            </p>
          </section>

          <section>
            <h2 className="serif text-xl mb-3" style={{ fontWeight: 500, color: "#f5f1e8" }}>
              Your choices
            </h2>
            <p>
              You can delete saved kerfs from your archive and revoke any API key
              at any time. To request deletion of your account and associated
              data, open a request via{" "}
              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#ff1744" }}
              >
                the issue tracker
              </a>
              .
            </p>
          </section>

          <p className="text-xs" style={{ color: "#7a7a82" }}>
            This notice may change as the product matures. Material changes will be
            reflected in the &ldquo;last updated&rdquo; date above. This is a beta
            service provided as-is and is not a substitute for formal legal advice
            about your own obligations.
          </p>
        </div>
      </div>
    </div>
  );
}
