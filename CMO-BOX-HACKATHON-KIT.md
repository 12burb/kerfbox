# CMO-in-a-Box — Hackathon Kit

**Tagline:** Strategy before copy.

**One-liner:** Jasper is a calculator for marketers who already know the math problem. CMO-in-a-Box tells you what math problem to solve.

---

## The 60-Second Demo Script

**[0:00 – 0:10] Setup.** Stand on stage. One input field. Paste a URL for a mid-size company the judges will recognize. Say one line:
> "I'm the new CMO. I start Monday. Tell me what to do."

Hit run. Don't oversell. The boring setup is the point.

**[0:10 – 0:25] Agent works, visibly.** The research log streams:
- Scanning landing page…
- Extracting positioning signals…
- Searching competitive landscape…
- Analyzing category discourse…
- Reading platform trends…

Each step completes with a real finding underneath it. "Top 5 competitors all running gameplay-clip-heavy feeds — oversaturated." This is the beat that separates us from every template tool on the market.

**[0:25 – 0:45] The brief appears.** A one-line positioning statement. A named market gap. Three campaign concepts, each with a "why now" tied to what the agent *actually found*. A 7-day calendar with specific posts, times, platforms, and rationale.

Read one calendar entry aloud with its rationale:
> "Tuesday 2pm, TikTok — lead dev plays ranked, loses, talks about why. Because BTS gaming content is trending and this hits the creator-driven gap competitors ignore."

The judges hear a reason, not a caption. That's the wedge.

**[0:45 – 0:60] The kicker.** Click into Tuesday's entry. *Now* the actual copy, hook, and shot list generate. Say the line out loud:
> "Jasper starts here. We end here."

Done. Mic drop.

---

## What Makes This Defensible

| | Jasper / Copy.ai | CMO-in-a-Box |
|--|--|--|
| **Output** | Copy | Strategy → copy |
| **Research** | None | Live web search on every brief |
| **Judgment** | Template fills | Multi-step reasoning chain |
| **Memory** | Per-generation | Brand voice + what hit/flopped |
| **Question answered** | "How do I write this?" | "What should I be writing?" |

The positioning word is **CMO**, not **copywriter** or **assistant**. That's the moat — strategy is a ten-times-harder job to automate, and nobody's credibly claiming to do it yet.

---

## Architecture

```
┌─────────────────┐
│  User Input     │  URL + one-line audience
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Strategy Agent (Sonnet + search)   │
│  - web_search × 3-5 queries          │
│  - Synthesizes structured JSON:      │
│    findings, positioning, concepts,  │
│    7-day calendar                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Rendered Brief │  Magazine-style, click-through
└────────┬────────┘
         │ click entry
         ▼
┌─────────────────────────────────────┐
│  Copy Agent (Sonnet, no tools)      │
│  - Context: brief + selected entry   │
│  - Platform-native voice             │
│  - Hook, caption, visual, tags, CTA  │
└─────────────────────────────────────┘
```

**Why two agents, not one:** separation of concerns. The strategy agent thinks broadly and slowly (web search is expensive). The copy agent runs fast and cheap, per-request, only when the user actually wants a specific post. This also lets you regenerate variants of one post without re-running research.

**Model choices:**
- Strategy agent: `claude-sonnet-4` with `web_search_20250305` tool
- Copy agent: `claude-sonnet-4`, no tools, max_tokens ~1500
- Both output structured JSON via prompt instruction (no structured outputs API needed)

**State:** In-memory React state only. For the hackathon, don't build persistence — but if asked, you have a clean seam for Supabase (save `brief` and `copyData` keyed by user + URL).

---

## Judge Q&A Prep

**Q: Why wouldn't an agency just do this?**
An agency costs $15k/month and takes two weeks to deliver a brief. This runs in 60 seconds and costs cents. We're not replacing senior CMOs — we're making CMO-quality thinking available to the 99% of founders and creators who can't afford one.

**Q: What's the moat vs OpenAI / Anthropic baking this in?**
Brand memory, feedback loops, and the creator-native UI. Foundation models won't remember that your audience hated your last thread or that carousel posts outperform static for you. The product is the learning loop, not the generation.

**Q: Who's the customer?**
Phase 1 — solo creators and founders who are their own marketing team. Phase 2 — agencies using it as a strategist-in-a-box for the long tail of their accounts. Phase 3 — in-house marketing teams who want a second opinion before every campaign.

**Q: How do you avoid generic output?**
Three mechanisms. Web search forces every brief to reference real, current findings. The prompt enforces specificity over abstraction ("BTS clip from Tuesday's tournament" not "post gaming content"). And the calendar rationale *must* cite the research — if it can't, the concept isn't tight enough and you regenerate.

**Q: What's next if you win?**
Three things: (1) brand voice training — upload 10 of your best posts, the agent learns your voice. (2) Feedback loop — mark posts as "hit" or "flopped," future briefs adjust. (3) Execution layer — schedule directly to platforms from the calendar view. Plus the CMO positioning is the wedge into a much larger product.

---

## Extensions (if you have time)

**Easy wins (2-4 hours):**
- Regenerate button on any calendar entry (re-call copy agent with "make it more X")
- Copy-to-clipboard on every generated post
- Export brief as PDF
- Brand color picker — let the user change the accent color to match their brand

**Medium (half a day):**
- Save briefs to Supabase, keyed by URL + audience
- Upload brand style guide PDF, feed into strategy agent's context
- A/B variants — generate 3 versions of the same post, let user pick
- Inline editing of generated copy before "publish"

**Big swings (stretch):**
- Feedback loop: mark each post as shipped/hit/flopped, fine-tune future briefs on this brand's learned patterns
- Scheduler: direct post to X, LinkedIn, Instagram via their APIs
- Competitor monitoring: daily digest of what competitors posted, flagging copycatting or openings
- Voice training: upload 10 of your best posts, agent matches your voice

---

## Tech Stack Notes

- **Frontend:** React + Tailwind (artifact-native, ships instantly)
- **AI:** Anthropic API via in-artifact `fetch` — no backend required for the demo
- **Production path:** Next.js on Vercel + Supabase for persistence + Clerk for auth (matches your existing stack)
- **Cost at demo volume:** ~$0.10 per brief (web search + ~3k output tokens) + ~$0.01 per copy gen

---

## Demo-Day Checklist

- [ ] Run the live path once from a fresh laptop 30 min before the slot — warm the cache, check API key
- [ ] Have demo mode button tested and ready as a fallback
- [ ] Pre-chosen URL that's interesting but not controversial (avoid: political, medical, anything with an NDA)
- [ ] Pre-written audience line memorized — don't fumble typing on stage
- [ ] Practice the "Jasper starts here. We end here." beat — pause before it, eye contact, then click
- [ ] Have the pitch deck open in another tab in case you want to cut back to it
- [ ] Second laptop or phone with the demo ready as backup
