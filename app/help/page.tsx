import Link from "next/link";
import type { Metadata } from "next";
import { ACCENT, ACCENT_DIM, BG_2, MUTED } from "@/components/cmo/shared";
import { PROVIDER_LIST } from "@/lib/providers";
import { SITE_NAME, ISSUES_URL } from "@/lib/site";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Help — how to use kerf.box",
  description:
    "How to cut your first kerf: run the free demo, bring a key from any AI provider (Claude, OpenAI, Gemini, Kimi, Qwen, DeepSeek, Groq, OpenRouter, Ollama), or connect your agent over MCP.",
  alternates: { canonical: "/help" },
};

const FG = "#f5f1e8";

/**
 * The user guide. Server-rendered and static; the provider walkthrough
 * table is generated from PROVIDER_LIST so it stays true to the code —
 * adding a provider in lib/providers.ts updates this page automatically.
 */
export default function HelpPage() {
  return (
    <div className="min-h-screen w-full">
      <div className="max-w-3xl mx-auto px-6 md:px-10 py-12 md:py-20">
        <Link
          href="/"
          className="mono text-[10px] uppercase tracking-widest"
          style={{ color: ACCENT }}
        >
          ← kerf.box
        </Link>

        <h1 className="serif text-3xl md:text-4xl mt-8 mb-2" style={{ fontWeight: 500 }}>
          How to use kerf.box
        </h1>
        <p className="mono text-[10px] uppercase tracking-widest mb-10" style={{ color: MUTED }}>
          free · account-free · bring any AI key
        </p>

        <div className="space-y-12 text-sm leading-relaxed" style={{ color: "#cfc8ba" }}>
          {/* THREE WAYS */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              Three ways to run it
            </h2>
            <ol className="space-y-4 list-decimal pl-5">
              <li>
                <strong style={{ color: FG }}>No key — demo mode.</strong> Open{" "}
                <Link href="/app" style={{ color: ACCENT }}>
                  the app
                </Link>{" "}
                and click <em>run with demo data</em>. You get a full, real kerf
                (canned) so you can see exactly what the output looks like before
                bringing a key. Copy generation works in demo mode too.
              </li>
              <li>
                <strong style={{ color: FG }}>Your own AI key (BYOK).</strong> Pick
                a provider in the app — Anthropic, OpenAI, Gemini, Kimi, Qwen,
                DeepSeek, Groq, OpenRouter, a local Ollama, or any custom
                OpenAI-compatible endpoint — paste your key, and cut live kerfs.
                You pay your provider directly for tokens; {SITE_NAME} charges
                nothing and never sees your key beyond the single request it rides
                on.
              </li>
              <li>
                <strong style={{ color: FG }}>From your agent (MCP or HTTP).</strong>{" "}
                Add <code className="mono">npx -y kerfbox-mcp</code> to Claude
                Desktop, Cursor, or any MCP client — or call the open HTTP API
                directly. Details below.
              </li>
            </ol>
          </section>

          {/* FIRST KERF */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              Cut your first kerf (90 seconds)
            </h2>
            <ol className="space-y-2 list-decimal pl-5">
              <li>
                Open{" "}
                <Link href="/app" style={{ color: ACCENT }}>
                  kerfbox.vercel.app/app
                </Link>
                .
              </li>
              <li>Drop the product URL you want positioned.</li>
              <li>
                Describe the audience in one line — the tighter the audience, the
                sharper the cut.
              </li>
              <li>
                Pick your AI provider, paste your key (saved in your browser only),
                and hit <em>Cut a kerf</em>.
              </li>
              <li>
                Watch the run stream in: cluster map → kerf → wedge → 7-day
                calendar. Click any calendar entry to generate platform-ready copy.
              </li>
              <li>
                Save it to your browser archive, or export as JSON / markdown for
                Notion, Linear, or Slack.
              </li>
            </ol>
            <p className="mt-4">
              If the run is <strong style={{ color: FG }}>refused</strong>, that is
              the product working: the moat did not name a competitor with a
              structural reason they can&apos;t follow. The refusal message tells
              you what was missing — tighten the audience or pick a more specific
              URL and run again.
            </p>
          </section>

          {/* PROVIDER TABLE */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              Getting a key, per provider
            </h2>
            <p className="mb-4">
              Every provider below plugs straight in. One difference worth knowing:{" "}
              <strong style={{ color: FG }}>
                Anthropic keys are the only ones that run live web research
              </strong>{" "}
              (signals come back with clickable citations). Every other provider
              cuts the kerf from model knowledge — still structured, still subject
              to the refusal rule, but without fresh citations.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ borderColor: ACCENT_DIM }}>
                <thead>
                  <tr
                    className="mono text-[10px] uppercase tracking-widest"
                    style={{ color: MUTED }}
                  >
                    <th className="py-2 pr-4 font-normal">Provider</th>
                    <th className="py-2 pr-4 font-normal">Default model</th>
                    <th className="py-2 pr-4 font-normal">Key looks like</th>
                    <th className="py-2 font-normal">Get a key</th>
                  </tr>
                </thead>
                <tbody>
                  {PROVIDER_LIST.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t align-top"
                      style={{ borderColor: ACCENT_DIM }}
                    >
                      <td className="py-3 pr-4" style={{ color: FG }}>
                        {p.label}
                        {p.kind === "anthropic" && (
                          <span
                            className="mono text-[9px] uppercase tracking-widest block"
                            style={{ color: ACCENT }}
                          >
                            live web research
                          </span>
                        )}
                      </td>
                      <td className="py-3 pr-4 mono text-xs">{p.defaultModel ?? "—"}</td>
                      <td className="py-3 pr-4 mono text-xs">
                        {p.keyOptional ? `optional · ${p.keyHint}` : p.keyHint}
                      </td>
                      <td className="py-3">
                        {p.keyUrl ? (
                          <a
                            href={p.keyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: ACCENT }}
                          >
                            {p.id === "ollama" ? "install →" : "console →"}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs" style={{ color: MUTED }}>
              Model is optional everywhere — leave it blank for the default above,
              or type any model id your key can access (e.g.{" "}
              <code className="mono">gpt-5.1-mini</code>,{" "}
              <code className="mono">claude-opus-4-8</code>).
            </p>
          </section>

          {/* OLLAMA / LOCAL */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              Ollama &amp; local models
            </h2>
            <p className="mb-3">
              Ollama and custom endpoints work with one caveat:{" "}
              <strong style={{ color: FG }}>
                the hosted app at kerfbox.vercel.app cannot reach your machine&apos;s
                localhost
              </strong>{" "}
              — the inference call runs from our server, not your browser. Local
              models need a locally running kerf.box:
            </p>
            <pre
              className="mono text-xs p-4 overflow-x-auto leading-relaxed"
              style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}`, color: FG }}
            >
              {`git clone https://github.com/12burb/kerfbox
cd kerfbox && pnpm install && pnpm dev
# open http://localhost:3000/app
# provider: Ollama · base URL: http://localhost:11434/v1 · model: llama3.2`}
            </pre>
            <p className="mt-3">
              The <em>custom</em> provider works the same way for LM Studio, vLLM,
              LiteLLM, or any other OpenAI-compatible server — point the base URL
              at your endpoint (the <code className="mono">/chat/completions</code>{" "}
              suffix is added automatically). A custom endpoint reachable on the
              public internet works from the hosted app too.
            </p>
          </section>

          {/* AGENTS */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              For agents: MCP and HTTP
            </h2>
            <p className="mb-3">
              The MCP server exposes <code className="mono">cut_kerf</code> and{" "}
              <code className="mono">generate_copy</code>. Configure it with env
              vars — provider and model are optional (defaults: anthropic, preset
              model):
            </p>
            <pre
              className="mono text-xs p-4 overflow-x-auto leading-relaxed"
              style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}`, color: FG }}
            >
              {`{
  "mcpServers": {
    "kerfbox": {
      "command": "npx",
      "args": ["-y", "kerfbox-mcp"],
      "env": {
        "KERFBOX_BYOK_PROVIDER": "openai",
        "KERFBOX_BYOK_API_KEY": "sk-...",
        "KERFBOX_BYOK_MODEL": "gpt-5.1"
      }
    }
  }
}`}
            </pre>
            <p className="mb-3 mt-4">
              Or hit the HTTP API directly — no account, no kerf.box API key, just
              your provider headers:
            </p>
            <pre
              className="mono text-xs p-4 overflow-x-auto leading-relaxed"
              style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}`, color: FG }}
            >
              {`curl -N https://kerfbox.vercel.app/api/strategy \\
  -H "X-Provider: gemini" \\
  -H "X-Api-Key: AIza..." \\
  -H "Content-Type: application/json" \\
  -d '{"url":"https://linear.app","audience":"indie SaaS founders"}'

# Anthropic shorthand (also what kerfbox-mcp <= 0.2 sends):
#   -H "X-Anthropic-Key: sk-ant-..."
# Optional headers: X-Model (any model id),
#   X-Base-Url (custom/ollama endpoints only)`}
            </pre>
            <p className="mt-3">
              Full schema:{" "}
              <Link href="/api/openapi.json" style={{ color: ACCENT }}>
                /api/openapi.json
              </Link>{" "}
              (OpenAPI 3.1).
            </p>
          </section>

          {/* TROUBLESHOOTING */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              When something fails
            </h2>
            <ul className="space-y-3 list-disc pl-5">
              <li>
                <strong style={{ color: FG }}>&ldquo;Authentication failed&rdquo; / 401.</strong>{" "}
                The key is missing, malformed, or paired with the wrong provider.
                Check that the provider dropdown matches the key you pasted — an
                OpenAI key under &ldquo;Anthropic&rdquo; will be rejected before it
                ever leaves our server.
              </li>
              <li>
                <strong style={{ color: FG }}>&ldquo;Provider error (404 / model not found)&rdquo;.</strong>{" "}
                The model id isn&apos;t available on your key. Clear the model
                field to use the provider default, or check the exact id in your
                provider&apos;s console.
              </li>
              <li>
                <strong style={{ color: FG }}>&ldquo;Provider error (429)&rdquo;.</strong>{" "}
                Your provider is rate-limiting or out of credits — that&apos;s
                between you and them; kerf.box adds no metering of its own beyond
                a per-IP abuse cap.
              </li>
              <li>
                <strong style={{ color: FG }}>The run was refused.</strong> Not an
                error — the moat didn&apos;t hold. The message says why. Sharpen
                the audience line and go again.
              </li>
              <li>
                <strong style={{ color: FG }}>Ollama times out from the hosted app.</strong>{" "}
                Expected — see the local models section above. Run kerf.box
                locally.
              </li>
            </ul>
            <p className="mt-4">
              Still stuck? File it on{" "}
              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ACCENT }}
              >
                the issue tracker
              </a>
              .
            </p>
          </section>

          {/* PRIVACY NOTE */}
          <section>
            <h2 className="serif text-xl mb-4" style={{ fontWeight: 500, color: FG }}>
              What happens to my key?
            </h2>
            <p>
              It rides each request as a header, is used once to call your provider,
              and is never stored, logged, or proxied — the server holds no copy.
              In the browser it is saved to <em>your</em> device&apos;s
              localStorage only, so you don&apos;t re-paste it every visit;
              clearing the field deletes it. Full details on the{" "}
              <Link href="/privacy" style={{ color: ACCENT }}>
                privacy page
              </Link>
              . The entire codebase is{" "}
              <a
                href="https://github.com/12burb/kerfbox"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: ACCENT }}
              >
                open source
              </a>{" "}
              if you&apos;d rather verify than trust.
            </p>
          </section>

          <div className="pt-4" style={{ borderTop: `1px solid ${ACCENT_DIM}` }}>
            <Link
              href="/app"
              className="inline-block mono text-xs uppercase tracking-widest px-6 py-3"
              style={{ background: ACCENT, color: "#000", fontWeight: 600 }}
            >
              cut a kerf →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
