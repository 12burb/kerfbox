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
            <p className="mb-3">
              Almost nothing. {SITE_NAME} is <strong>account-free</strong> —
              there is no login, no password, no user database, and no API key
              to issue. We hold no record that you used the product.
            </p>
            <ul className="space-y-2 list-disc pl-5">
              <li>
                <strong>Your kerfs stay in your browser.</strong> Strategy
                artifacts you save go to your own browser&apos;s{" "}
                <code className="mono">localStorage</code> — they never reach our
                servers. They live on the device that created them; clearing your
                browser storage removes them. To move a kerf elsewhere, export it
                as JSON and import it on another device.
              </li>
              <li>
                <strong>Transient request metadata.</strong> To operate per-IP
                rate limits and debug failures, we may briefly process the
                endpoint, status code, timing, and a derived rate-limit key for
                each request. Secrets are scrubbed from logs before anything is
                written, and we do not build a profile of you across requests.
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
                <strong>Accounts.</strong> There are none. We never ask you to
                sign up, so there is no identity, email, or login record to hold
                in the first place.
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
              We rely on a deliberately small set of infrastructure providers:{" "}
              <strong>Vercel</strong> (hosting) and <strong>Anthropic</strong>{" "}
              (model inference). Your inputs are sent to Anthropic only to
              generate the response you requested — billed to your own key when
              you bring one. There is no authentication provider and no database,
              because there are no accounts and we store nothing server-side.
            </p>
          </section>

          <section>
            <h2 className="serif text-xl mb-3" style={{ fontWeight: 500, color: "#f5f1e8" }}>
              Your choices
            </h2>
            <p>
              Your saved kerfs are yours to manage directly: delete any entry —
              or clear the whole archive — from the{" "}
              <Link href="/briefs" style={{ color: "#ff1744" }}>
                archive
              </Link>{" "}
              page, or just clear your browser&apos;s site data. Because there is
              no account and we hold nothing server-side, there is no profile to
              request the deletion of. Questions go to{" "}
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
