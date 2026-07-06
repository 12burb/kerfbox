import Link from "next/link";
import dynamicImport from "next/dynamic";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "@/components/cmo/shared";

// Keep static — the demo carousel is client-rendered but the rest of
// the page is hydration-light marketing content.
export const dynamic = "force-static";

// Code-split the demo carousel out of the landing route's main bundle.
// It's below the fold, only interactive after scroll, and pulls in
// KerfStage + all the demo data — none of which the LCP needs. Loading
// it dynamically (ssr: true so the static HTML still contains the
// rendered first demo, no layout shift) shrinks the initial JS payload
// without changing the first paint. Imported under an aliased name so
// it doesn't shadow the route's `export const dynamic` flag above.
const DemoCarousel = dynamicImport(() => import("@/components/cmo/DemoCarousel"));

// Single source for the FAQ — rendered as the visible accordion below and
// emitted as FAQPage structured data so the same Q&A can surface as a rich
// result. Keep the two in sync by construction (one array, two consumers).
const FAQ: { q: string; a: string }[] = [
  {
    q: "Is this just another AI content generator?",
    a: "No. Generators write copy from a blank prompt. kerf.box does the strategic work first — maps the cluster, names the cut, defends the wedge — then writes copy that holds the wedge. The system refuses to ship if the moat is undefendable.",
  },
  {
    q: "What is a Kerf?",
    a: "Borrowed from woodworking: a kerf is the narrow slot a saw makes. The Kerf method says strategy is the narrow defensible cut between where the category clusters today and where this brand can legitimately stand alone — not a story you tell, a slot you cut.",
  },
  {
    q: "What is the refusal rule?",
    a: "After generation, the wedge.moat field is checked. If it doesn't reference at least one competitor from the cluster map, or reduces to 'we'll execute better,' the run is refused — the stream emits an error with the reason instead of shipping. The brand POV — that undefendable strategy is worse than no strategy — is enforced in code.",
  },
  {
    q: "What's BYOK?",
    a: "Bring Your Own Key. You pass an Anthropic API key with each call (X-Anthropic-Key header) and pay Anthropic directly at cost. We never hold or proxy your key. This is the recommended path for agents and high-volume callers — and it's free.",
  },
  {
    q: "What does it cost?",
    a: "Nothing. kerf.box is free — forever. You bring your own Anthropic key (BYOK) or connect it to Claude over MCP, and you pay Anthropic directly for the tokens you use. There's no subscription, no metering, no per-seat fee, and we never run generation on our own key.",
  },
  {
    q: "Where does the research come from?",
    a: "Live web search via Anthropic's research model. Every signal ships with citations you can click and verify. Inferences are flagged. Nothing is invented.",
  },
  {
    q: "How long does one kerf take?",
    a: "About 60–90 seconds end-to-end. You'll see the cluster map, kerf, and wedge stream in live.",
  },
  {
    q: "Can my agent use kerf.box?",
    a: "Yes. We ship an MCP server (npx -y @kerfbox/mcp) and a public OpenAPI 3.1 spec at /api/openapi.json. Tools: cut_kerf and generate_copy. The API is open — no account, no API key. Bring your own Anthropic key (BYOK) for live runs, or call with demo:true.",
  },
  {
    q: "Can I export the kerf?",
    a: "Yes — kerfs save to your browser, and you can export each one as JSON or markdown to drop into Notion, Linear, or Slack, or re-import it on another device. There's also a JSON API and an MCP server for agent workflows.",
  },
  {
    q: "Who's this for?",
    a: "Solo founders, indie hackers, small studios with a real wedge they're not articulating. If your positioning sounds like every competitor, this finds the cut.",
  },
  {
    q: "What if my kerf is bad?",
    a: "Generate another. We add no metering on BYOK runs — you pay only your own Anthropic bill (a per-IP abuse cap of 10 runs/hour aside). Most users iterate 2–3 times to find the cut that holds; the refusal rule tells you exactly what's missing so the next run is sharper.",
  },
];

// FAQPage structured data built from the same array. Rendered inline on the
// landing page (force-static) so it's in the initial HTML for crawlers.
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen w-full">
      <script
        type="application/ld+json"
        // Built at module scope from the static FAQ array — no user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        {/* HEADER */}
        <header className="flex items-center justify-between mb-16 md:mb-24">
          <Link href="/" className="flex items-center gap-3">
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
                Strategy is a cut.
              </div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="#demos"
              className="hidden md:inline-block mono text-[11px] uppercase tracking-widest px-3 py-2"
              style={{ color: MUTED }}
            >
              demos
            </Link>
            <Link
              href="#mcp"
              className="hidden md:inline-block mono text-[11px] uppercase tracking-widest px-3 py-2"
              style={{ color: MUTED }}
            >
              for agents
            </Link>
            <Link
              href="#pricing"
              className="hidden md:inline-block mono text-[11px] uppercase tracking-widest px-3 py-2"
              style={{ color: MUTED }}
            >
              pricing
            </Link>
            <Link
              href="/app"
              className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
              style={{ borderColor: ACCENT, color: ACCENT }}
            >
              open app →
            </Link>
          </div>
        </header>

        {/* HERO */}
        <section className="mb-16 md:mb-20">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-6"
            style={{ color: ACCENT }}
          >
            ⎯ for founders who refuse to position into a cluster
          </div>
          <h1
            className="serif text-5xl md:text-7xl leading-[1.05] mb-8 max-w-4xl"
            style={{ fontWeight: 500 }}
          >
            Strategy is a <span style={{ color: ACCENT }}>cut</span>,
            <br />
            <span style={{ color: MUTED }}>not a story.</span>
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mb-10" style={{ color: MUTED }}>
            kerf.box maps where your category clusters today, finds the narrow defensible cut
            between clusters, and ships a wedge with a structural moat. If the moat doesn&rsquo;t
            hold against named competitors, the system refuses to ship.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="#demos"
              className="mono text-xs uppercase tracking-widest px-5 py-3"
              style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
            >
              see three real kerfs ↓
            </Link>
            <Link
              href="/app"
              className="mono text-xs uppercase tracking-widest px-5 py-3 border"
              style={{ borderColor: ACCENT_DIM, color: MUTED }}
            >
              cut your own (BYOK)
            </Link>
            <span className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
              · no card · 90 seconds
            </span>
          </div>
        </section>

        {/* DEMOS — the big credibility asset, before any explanation */}
        <section id="demos" className="mb-24 md:mb-32 scroll-mt-12">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <div
                className="mono text-[10px] uppercase tracking-widest mb-2"
                style={{ color: ACCENT }}
              >
                ⎯ three real kerfs
              </div>
              <h2
                className="serif text-3xl md:text-4xl"
                style={{ fontWeight: 500 }}
              >
                Output first. Pitch later.
              </h2>
            </div>
            <p
              className="hidden md:block text-sm max-w-sm text-right"
              style={{ color: MUTED }}
            >
              Three industries. Three Kerfs. Each one passes the refusal rule —
              moat names competitors and gives a structural reason.
            </p>
          </div>
          <DemoCarousel />
        </section>

        {/* HOW IT WORKS */}
        <section id="how" className="mb-24 md:mb-32 scroll-mt-12">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: ACCENT }}
          >
            ⎯ how it works
          </div>
          <h2 className="serif text-3xl md:text-4xl mb-12" style={{ fontWeight: 500 }}>
            Four moves. Ninety seconds.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                n: "01",
                t: "Map the cluster",
                b: "Live web search across 4–6 competitors. Every named competitor grouped by what they all do the same.",
              },
              {
                n: "02",
                t: "Find the kerf",
                b: "The narrow defensible cut between clusters this brand can credibly own — stated as one sentence.",
              },
              {
                n: "03",
                t: "Forge the wedge",
                b: "Claim, proof, and a structural moat that names a competitor and explains why they can't follow.",
              },
              {
                n: "04",
                t: "Refuse if undefendable",
                b: "If the moat reduces to 'we'll execute better,' the run is refused with a reason. The refusal is the brand POV.",
              },
            ].map((s) => (
              <div key={s.n} className="border-t pt-6" style={{ borderColor: ACCENT_DIM }}>
                <div
                  className="mono text-[10px] uppercase tracking-widest mb-3"
                  style={{ color: ACCENT }}
                >
                  {s.n}
                </div>
                <div className="serif text-xl mb-3" style={{ fontWeight: 500 }}>
                  {s.t}
                </div>
                <div className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {s.b}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* DIFFERENTIATION */}
        <section className="mb-24 md:mb-32">
          <div
            className="border-l-2 pl-6 md:pl-10 max-w-3xl"
            style={{ borderColor: ACCENT }}
          >
            <div
              className="mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: ACCENT }}
            >
              ⎯ why this is different
            </div>
            <p
              className="serif text-2xl md:text-3xl leading-snug mb-4"
              style={{ fontWeight: 500 }}
            >
              Other tools ship slop and call it strategy.
            </p>
            <p
              className="serif text-2xl md:text-3xl leading-snug"
              style={{ fontWeight: 500, color: ACCENT }}
            >
              We refuse to ship undefendable cuts.
            </p>
            <p className="text-base mt-6" style={{ color: MUTED }}>
              Generic AI marketing tools optimize for fluency. kerf.box optimizes for
              defensibility. The wedge has to name a competitor and explain why they
              can&rsquo;t follow — or the run is refused and tells you why. The refusal
              is the brand POV expressed in code.
            </p>
          </div>
        </section>

        {/* MCP / FOR AGENTS */}
        <section id="mcp" className="mb-24 md:mb-32 scroll-mt-12">
          <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
            <div className="md:col-span-5">
              <div
                className="mono text-[10px] uppercase tracking-widest mb-4"
                style={{ color: ACCENT }}
              >
                ⎯ for agents
              </div>
              <h2
                className="serif text-3xl md:text-4xl mb-6"
                style={{ fontWeight: 500 }}
              >
                Strategy as a tool call.
              </h2>
              <p className="text-base leading-relaxed mb-4" style={{ color: MUTED }}>
                kerf.box ships as an MCP server and an OpenAPI 3.1 spec. Your
                agent can <span style={{ color: ACCENT }}>cut_kerf</span> and{" "}
                <span style={{ color: ACCENT }}>generate_copy</span> against the
                same engine that powers the web app.
              </p>
              <p className="text-base leading-relaxed mb-6" style={{ color: MUTED }}>
                No account, no API key — the API is open. You bring your own
                Anthropic key per call (passed through, never stored), or
                connect over MCP. The refusal rule applies to agents too: an
                undefendable Kerf is refused with a reason, not a hallucination
                dressed in a deck.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/api/openapi.json"
                  className="mono text-[11px] uppercase tracking-widest px-3 py-2 border"
                  style={{ borderColor: ACCENT, color: ACCENT }}
                >
                  openapi.json →
                </Link>
              </div>
            </div>
            <div className="md:col-span-7">
              <div
                className="p-5 md:p-6 mono text-xs leading-relaxed overflow-x-auto"
                style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}`, color: MUTED }}
              >
                <div style={{ color: ACCENT }}># add to claude desktop / cursor / your agent</div>
                <div className="mt-3" style={{ color: "#f5f1e8" }}>
                  npx -y @kerfbox/mcp
                </div>
                <div className="mt-5" style={{ color: ACCENT }}># tools available to your agent</div>
                <div className="mt-2 space-y-1" style={{ color: "#f5f1e8" }}>
                  <div>· cut_kerf({"{ url, audience }"})</div>
                  <div>· generate_copy({"{ kerf, entry }"})</div>
                </div>
                <div className="mt-5" style={{ color: ACCENT }}># or call the http api directly — no key to mint</div>
                <div className="mt-2" style={{ color: "#f5f1e8", whiteSpace: "pre-wrap" }}>
                  {`curl -N https://kerfbox.vercel.app/api/strategy \\
  -H "X-Anthropic-Key: sk-ant-..." \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://linear.app","audience":"indie SaaS founders"}'`}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* WHAT YOU GET */}
        <section className="mb-24 md:mb-32">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: ACCENT }}
          >
            ⎯ what&rsquo;s in a Kerf
          </div>
          <h2 className="serif text-3xl md:text-4xl mb-12 max-w-3xl" style={{ fontWeight: 500 }}>
            One artifact. Built like an{" "}
            <span style={{ color: ACCENT }}>argument</span>, not a deck.
          </h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {[
              {
                t: "Cluster map",
                b: "2–3 named clusters of where competitors are converging today, with the pattern they share. The negative space is the opportunity.",
              },
              {
                t: "The kerf",
                b: "One sentence naming the narrow defensible cut between clusters. Plus a why-now grounded in a category shift.",
              },
              {
                t: "The wedge — claim, proof, moat",
                b: "A taglinable claim, 2+ pieces of legitimate proof, and a structural moat naming a specific competitor and why they can't follow.",
              },
              {
                t: "Signals + citations",
                b: "5–6 evidence points with clickable sources. Every claim is auditable. Inferences are flagged as such.",
              },
              {
                t: "Concepts that embody the wedge",
                b: "Three concepts. Each one explains in one sentence how it IS the wedge in execution form. Free-floating ideas are not allowed.",
              },
              {
                t: "7-day calendar + post-ready copy",
                b: "Mon–Sun across X, TikTok, YouTube, IG, LinkedIn, Reddit. Click any entry to generate platform-native copy that holds the wedge.",
              },
            ].map((f) => (
              <div key={f.t}>
                <div className="serif text-lg mb-2" style={{ fontWeight: 500 }}>
                  {f.t}
                </div>
                <div className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  {f.b}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="mb-24 md:mb-32 scroll-mt-12">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: ACCENT }}
          >
            ⎯ pricing
          </div>
          <h2 className="serif text-3xl md:text-4xl mb-3" style={{ fontWeight: 500 }}>
            It&rsquo;s free. You bring the key.
          </h2>
          <p className="text-sm mb-12 max-w-2xl" style={{ color: MUTED }}>
            Bring your own Anthropic key — or connect kerf.box to Claude over MCP —
            and it&rsquo;s free, forever. You pay Anthropic directly for the tokens you
            use. No subscription, no metering, no per-seat fee. We never run generation
            on our own key.
          </p>
          <div className="max-w-md">
            {/* FREE */}
            <div
              className="border p-6 md:p-8 flex flex-col"
              style={{ borderColor: ACCENT, background: BG_2 }}
            >
              <div className="mono text-[10px] uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
                free · BYOK or MCP
              </div>
              <div className="serif text-4xl mb-2" style={{ fontWeight: 500 }}>
                $0<span className="text-base" style={{ color: MUTED }}> / forever</span>
              </div>
              <div className="text-sm mb-6" style={{ color: MUTED }}>
                Pay Anthropic at cost. We charge nothing.
              </div>
              <ul className="space-y-2 text-sm mb-8 flex-1" style={{ color: MUTED }}>
                <li>· Kerfs on your own key — no metering by us, just your Anthropic bill</li>
                <li>· Or connect to Claude over MCP — no key to paste</li>
                <li>· Open REST API + MCP — no account, no API key</li>
                <li>· Save in your browser · export &amp; import as JSON</li>
                <li>· The refusal engine · demo mode</li>
                <li>· Open source — self-host it all</li>
              </ul>
              <Link
                href="/app"
                className="mono text-[11px] uppercase tracking-widest px-3 py-2 text-center"
                style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
              >
                start free →
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-24 md:mb-32">
          <div
            className="mono text-[10px] uppercase tracking-widest mb-4"
            style={{ color: ACCENT }}
          >
            ⎯ faq
          </div>
          <h2 className="serif text-3xl md:text-4xl mb-12" style={{ fontWeight: 500 }}>
            Questions.
          </h2>
          <div className="divide-y" style={{ borderColor: ACCENT_DIM }}>
            {FAQ.map((f) => (
              <details key={f.q} className="py-5 group">
                <summary className="flex items-start justify-between gap-6 cursor-pointer list-none">
                  <span className="serif text-lg md:text-xl" style={{ fontWeight: 500 }}>
                    {f.q}
                  </span>
                  <span
                    className="mono text-xl flex-shrink-0 group-open:rotate-45 transition-transform"
                    style={{ color: ACCENT }}
                  >
                    +
                  </span>
                </summary>
                <p className="text-sm mt-3 leading-relaxed pr-12" style={{ color: MUTED }}>
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mb-16 md:mb-24">
          <div
            className="border p-10 md:p-16 text-center"
            style={{ borderColor: ACCENT, background: "rgba(255,23,68,0.04)" }}
          >
            <div
              className="mono text-[10px] uppercase tracking-widest mb-4"
              style={{ color: ACCENT }}
            >
              ⎯ ready to cut
            </div>
            <h2
              className="serif text-3xl md:text-5xl mb-6 max-w-2xl mx-auto"
              style={{ fontWeight: 500 }}
            >
              Stop telling stories. Start cutting kerfs.
            </h2>
            <p className="text-base md:text-lg max-w-xl mx-auto mb-8" style={{ color: MUTED }}>
              Cut your first kerf in 90 seconds. BYOK. No card, no commitment.
            </p>
            <Link
              href="/app"
              className="inline-block mono text-xs uppercase tracking-widest px-6 py-3"
              style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
            >
              cut a kerf →
            </Link>
          </div>
        </section>
      </div>

      {/* FOOTER */}
      <div
        className="border-t mt-16"
        style={{ borderColor: ACCENT_DIM }}
      >
        <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 flex items-center justify-center"
              style={{ background: ACCENT }}
            >
              <span className="mono text-black font-bold text-[10px]">K</span>
            </div>
            <div className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
              kerf.box · strategy is a cut · v0.2
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
            <Link href="/app">app</Link>
            <Link href="/briefs">archive</Link>
            <Link href="#mcp">api / mcp</Link>
            <Link href="/pricing">pricing</Link>
            <Link href="/privacy">privacy</Link>
            <Link href="/terms">terms</Link>
            <a
              href="https://github.com/12burb/cmoinabox/issues"
              target="_blank"
              rel="noopener noreferrer"
            >
              contact
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
