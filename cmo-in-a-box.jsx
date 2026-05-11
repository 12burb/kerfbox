import { useState, useEffect, useRef } from 'react';
import { ArrowRight, Sparkles, Clock, X as XIcon, ChevronRight, Loader2, AlertCircle, Target, CalendarDays, Zap, Terminal, Quote, Check, Play } from 'lucide-react';

const ACCENT = '#ff1744';
const ACCENT_DIM = '#8a0a22';
const BG = '#0a0a0c';
const BG_2 = '#121215';
const BG_3 = '#1a1a1f';
const INK = '#f5f1e8';
const MUTED = '#7a7a82';

const DEMO_BRIEF = {
  company_summary: "A mid-size PvP-focused gaming studio building hardcore competitive experiences",
  research_findings: [
    { source: "Landing page scan", finding: "Positioning anchored hard on 'skill-based combat' and 'no pay-to-win'" },
    { source: "Competitor scan", finding: "Top 5 competitors all running gameplay-clip-heavy feeds — oversaturated" },
    { source: "Competitor scan", finding: "Only 1 of 5 is posting creator/community content — wide-open lane" },
    { source: "Gaming discourse", finding: "r/gaming trending: burnout on montages, rising appetite for 'dev stories'" },
    { source: "Platform analysis", finding: "TikTok #BTS for gaming up 340% YoY; Twitch dev streams trending" },
    { source: "Audience analysis", finding: "Hardcore PvP audiences over-index on creator content vs broader gaming" }
  ],
  market_gap: "Competitors are all posting gameplay clips to an audience that's tuning them out — the lane for creator and community stories is wide open.",
  positioning: {
    angle: "The studio that shows up",
    rationale: "While competitors hide behind polish, we lead with the humans and community behind the game."
  },
  concepts: [
    { id: "c1", name: "Dev in the Arena", why_now: "r/gaming is exhausted by montages and asking for 'dev stories' — filling the exact gap competitors leave", hook: "Your developers play against your community on-stream, weekly, losses included." },
    { id: "c2", name: "Underdog Arcs", why_now: "TikTok gaming #BTS is up 340% YoY — narrative-driven content beats clips in this cycle", hook: "Follow one low-ranked tournament player across a season — failures, redemption, all of it." },
    { id: "c3", name: "The Skill Receipt", why_now: "'No pay-to-win' is your most defensible moat — turn it into provable, shareable content", hook: "Weekly breakdown of a pro match that couldn't have been bought — just skill." }
  ],
  calendar: [
    { day: "Mon", time: "9:00 AM", platform: "X", concept_id: "c3", post_idea: "Thread breaking down Sunday's pro final — every key moment tied to pure skill", rationale: "Monday 9am is peak industry check-in on X; thread format rewards 'skill receipt' evidence" },
    { day: "Tue", time: "2:00 PM", platform: "TikTok", concept_id: "c1", post_idea: "Lead dev plays ranked, loses, talks about why", rationale: "BTS content is trending; hits the creator-driven gap competitors ignore" },
    { day: "Wed", time: "7:00 PM", platform: "YouTube", concept_id: "c2", post_idea: "Episode 1 of tournament underdog series — first practice week", rationale: "Wed evening YouTube peak for long-form; pilot establishes the series" },
    { day: "Thu", time: "12:00 PM", platform: "Reddit", concept_id: "c1", post_idea: "r/[game] AMA with the combat designer on balance questions", rationale: "Thursday lunch is peak Reddit; lives where your hardcore audience actually is" },
    { day: "Fri", time: "4:00 PM", platform: "Instagram", concept_id: "c2", post_idea: "Carousel: the underdog's week — practice, failures, small wins", rationale: "Friday afternoon drives highest engagement; carousel fits narrative content" },
    { day: "Sat", time: "1:00 PM", platform: "TikTok", concept_id: "c3", post_idea: "60-sec edit of the best skill-only community play of the week", rationale: "Saturday TikTok peak; UGC spotlight reinforces positioning and rewards creators" },
    { day: "Sun", time: "6:00 PM", platform: "X", concept_id: "c1", post_idea: "Announce Monday's dev-vs-community stream with stakes", rationale: "Sunday evening builds Monday anticipation; weekly ritual compounds viewership" }
  ]
};

const DEMO_COPY = {
  hook: "Our devs play your ranked queue. They lose. A lot.",
  caption: "every tuesday at 2pm CT, our lead combat designer hops into ranked. no dev matchmaking. no private lobbies. real queue, real losses.\n\nthis week: Jamie got bodied round one by a build they personally nerfed last patch. they called it 'humbling' — dev-speak for 'I'm going to fix this'.\n\nclip in comments. full vod on twitch.",
  visual_direction: "Split-screen: top half gameplay feed with the loss moment, bottom half dev face-cam reacting in real time. Cut to a short post-match where they explain what went wrong. Native lowercase captions, red text on black for the 'humbled' beat.",
  hashtags: ["#gamedev", "#devsplay", "#gamingtiktok", "#BTS", "#devlife"],
  cta: "full match — twitch link in bio"
};

function buildPrompt(url, audience) {
  return `You are CMO-in-a-box, an AI CMO that produces strategic marketing briefs for creators and marketers.

INPUT:
- URL: ${url}
- Audience: ${audience}

TASK:
1. Use web_search (3-5 searches max) to research:
   - The company itself (positioning, products, recent news)
   - 2-3 direct competitors in this space
   - Current discourse or trends in this category right now
2. Identify a positioning gap — what are competitors oversaturating, what's underexploited
3. Propose 3 sharp campaign concepts that exploit the gap
4. Build a 7-day content calendar across platforms (Mon-Sun)

OUTPUT: Return ONLY raw JSON. No preamble. No markdown fences. No commentary.

SCHEMA:
{
  "company_summary": "one-line description",
  "research_findings": [
    {"source": "short label", "finding": "one concrete insight"}
  ],
  "market_gap": "one sentence naming the opportunity",
  "positioning": {
    "angle": "4-8 word statement",
    "rationale": "one sentence"
  },
  "concepts": [
    {"id": "c1", "name": "2-4 word name", "why_now": "tied to research", "hook": "one sentence"}
  ],
  "calendar": [
    {"day": "Mon", "time": "2:00 PM", "platform": "TikTok", "concept_id": "c1", "post_idea": "one sentence", "rationale": "one sentence tied to findings"}
  ]
}

Rules:
- Exactly 5-6 research_findings, 3 concepts, 7 calendar entries (Mon-Sun)
- Use real company and competitor names from research
- Be specific — not "post gaming content" but "BTS clip from Tuesday's tournament"
- Each calendar rationale must reference research or positioning
- Platforms: mix across X, TikTok, YouTube, Instagram, LinkedIn, Reddit based on audience`;
}

function buildCopyPrompt(entry, brief) {
  const concept = brief.concepts.find(c => c.id === entry.concept_id);
  return `You are CMO-in-a-box generating actual post copy.

BRAND POSITIONING: ${brief.positioning.angle}
CONCEPT: ${concept?.name} — ${concept?.hook}

ENTRY:
Platform: ${entry.platform}
When: ${entry.day} ${entry.time}
Idea: ${entry.post_idea}
Why: ${entry.rationale}

Return ONLY raw JSON, no preamble, no fences:
{
  "hook": "5-10 word opening",
  "caption": "full post body for ${entry.platform}",
  "visual_direction": "2-3 sentences on the visual/video",
  "hashtags": ["#tag1"],
  "cta": "call to action"
}

Match ${entry.platform}'s native voice:
- X: punchy, terse, under 280 chars, 0-2 hashtags
- TikTok: energetic, lowercase, trend-aware, 3-5 hashtags
- Instagram: polished, aspirational, 4-6 hashtags
- LinkedIn: professional, narrative, 2-3 hashtags
- YouTube: compelling title + hook, 3-5 hashtags
- Reddit: conversational, no hashtags`;
}

const PLATFORM_STYLES = {
  X: { bg: '#000', fg: '#fff', label: 'X' },
  TikTok: { bg: '#010101', fg: '#25F4EE', label: 'TIKTOK' },
  YouTube: { bg: '#FF0000', fg: '#fff', label: 'YOUTUBE' },
  Instagram: { bg: '#E4405F', fg: '#fff', label: 'INSTAGRAM' },
  LinkedIn: { bg: '#0A66C2', fg: '#fff', label: 'LINKEDIN' },
  Reddit: { bg: '#FF4500', fg: '#fff', label: 'REDDIT' },
};

export default function CMOInABox() {
  const [stage, setStage] = useState('input');
  const [url, setUrl] = useState('https://offthegrid.game');
  const [audience, setAudience] = useState('Hardcore PvP gamers, 18-34, crypto-curious');
  const [researchSteps, setResearchSteps] = useState([]);
  const [brief, setBrief] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [copyData, setCopyData] = useState(null);
  const [copyLoading, setCopyLoading] = useState(false);
  const [error, setError] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (stage === 'working') {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [stage]);

  const run = async (demoMode = false) => {
    if (!demoMode && (!url.trim() || !audience.trim())) {
      setError('URL and audience are both required.');
      return;
    }
    setStage('working');
    setError(null);
    setBrief(null);
    setResearchSteps([]);

    const placeholders = [
      'Scanning landing page',
      'Extracting positioning signals',
      'Searching competitive landscape',
      'Analyzing category discourse',
      'Reading platform trends',
      'Synthesizing strategic brief',
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < placeholders.length) {
        setResearchSteps(prev => {
          const next = [...prev];
          if (next.length > 0) next[next.length - 1] = { ...next[next.length - 1], status: 'done' };
          next.push({ label: placeholders[i], status: 'running', finding: null });
          return next;
        });
        i++;
      }
    }, 1400);

    try {
      let data;
      if (demoMode) {
        await new Promise(r => setTimeout(r, 9000));
        data = DEMO_BRIEF;
      } else {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4000,
            tools: [{ type: 'web_search_20250305', name: 'web_search' }],
            messages: [{ role: 'user', content: buildPrompt(url, audience) }]
          })
        });
        if (!response.ok) throw new Error(`API returned ${response.status}`);
        const json = await response.json();
        const textBlocks = json.content.filter(b => b.type === 'text');
        const finalText = textBlocks[textBlocks.length - 1]?.text || '';
        const cleanJson = finalText.replace(/```json\s*|\s*```/g, '').trim();
        data = JSON.parse(cleanJson);
      }

      clearInterval(interval);

      // Replace placeholders with real findings, animated
      const realSteps = (data.research_findings || []).map(f => ({ label: f.source, finding: f.finding, status: 'pending' }));
      setResearchSteps(realSteps);

      // Animate real findings in
      for (let k = 0; k < realSteps.length; k++) {
        await new Promise(r => setTimeout(r, 350));
        setResearchSteps(prev => prev.map((s, idx) => idx === k ? { ...s, status: 'done' } : s));
      }

      await new Promise(r => setTimeout(r, 900));
      setBrief(data);
      setStage('brief');
    } catch (err) {
      clearInterval(interval);
      console.error(err);
      setError(`Couldn't reach the API. ${err.message}. Try demo mode.`);
      setStage('input');
    }
  };

  const generateCopy = async (entry) => {
    setSelectedEntry(entry);
    setCopyData(null);
    setCopyLoading(true);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1500,
          messages: [{ role: 'user', content: buildCopyPrompt(entry, brief) }]
        })
      });
      if (!response.ok) throw new Error('API error');
      const json = await response.json();
      const text = json.content.filter(b => b.type === 'text').map(b => b.text).join('');
      const cleanJson = text.replace(/```json\s*|\s*```/g, '').trim();
      setCopyData(JSON.parse(cleanJson));
    } catch (err) {
      setCopyData(DEMO_COPY);
    } finally {
      setCopyLoading(false);
    }
  };

  const reset = () => {
    setStage('input');
    setBrief(null);
    setResearchSteps([]);
    setSelectedEntry(null);
    setCopyData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen w-full" style={{ background: BG, color: INK, fontFamily: 'Hanken Grotesk, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;0,9..144,900;1,9..144,300;1,9..144,600&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');

        .serif { font-family: 'Fraunces', serif; font-optical-sizing: auto; }
        .mono { font-family: 'JetBrains Mono', monospace; }

        .grid-bg {
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
          opacity: 0.04;
          pointer-events: none;
        }

        @keyframes blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .cursor { animation: blink 1.1s steps(1) infinite; }

        @keyframes fade-slide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .reveal { animation: fade-slide 0.55s cubic-bezier(0.22, 1, 0.36, 1) both; }

        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 ${ACCENT}80; }
          50% { box-shadow: 0 0 0 8px ${ACCENT}00; }
        }
        .pulse { animation: pulse-red 2s infinite; }

        @keyframes spin-slow { to { transform: rotate(360deg); } }
        .spin-slow { animation: spin-slow 1.2s linear infinite; }

        .btn-red {
          background: ${ACCENT};
          color: #000;
          transition: all 0.18s ease;
          box-shadow: 0 0 0 0 ${ACCENT}00, inset 0 -2px 0 ${ACCENT_DIM};
        }
        .btn-red:hover {
          background: #ff3b5e;
          box-shadow: 0 0 30px ${ACCENT}60, inset 0 -2px 0 ${ACCENT_DIM};
          transform: translateY(-1px);
        }
        .btn-red:active { transform: translateY(0); }

        .input-field {
          background: transparent;
          border: none;
          border-bottom: 1px solid ${ACCENT_DIM};
          outline: none;
          color: ${INK};
          transition: border-color 0.2s;
          font-family: 'JetBrains Mono', monospace;
        }
        .input-field:focus { border-color: ${ACCENT}; }
        .input-field::placeholder { color: ${MUTED}; }

        .dash-border {
          background-image: linear-gradient(90deg, ${ACCENT_DIM} 50%, transparent 0);
          background-size: 8px 1px;
          background-repeat: repeat-x;
          background-position: 0 100%;
        }

        .scrollbar-thin::-webkit-scrollbar { width: 6px; height: 6px; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: ${ACCENT_DIM}; border-radius: 3px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
      `}</style>

      <div className="relative max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        {/* Header / Brand */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center" style={{ background: ACCENT }}>
              <span className="mono text-black font-bold text-sm">C</span>
            </div>
            <div>
              <div className="serif text-xl leading-none" style={{ fontWeight: 600 }}>
                cmo<span style={{ color: ACCENT }}>.</span>box
              </div>
              <div className="mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
                Strategy before copy.
              </div>
            </div>
          </div>
          {stage !== 'input' && (
            <button onClick={reset} className="mono text-[11px] uppercase tracking-widest px-3 py-2 border" style={{ borderColor: ACCENT_DIM, color: MUTED }}>
              ← new brief
            </button>
          )}
        </header>

        {/* ============ INPUT STAGE ============ */}
        {stage === 'input' && (
          <div className="relative">
            <div className="grid md:grid-cols-12 gap-8 items-end mb-16">
              <div className="md:col-span-8">
                <div className="mono text-xs uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
                  ⎯ 01 / Brief
                </div>
                <h1 className="serif leading-[0.92] text-5xl md:text-7xl" style={{ fontWeight: 300 }}>
                  I'm the new <em style={{ color: ACCENT, fontStyle: 'italic', fontWeight: 400 }}>CMO</em>.
                  <br />
                  I start <span style={{ fontWeight: 600 }}>Monday</span>.
                  <br />
                  Tell me what to do.
                </h1>
              </div>
              <div className="md:col-span-4">
                <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                  Drop a URL and one line about your audience. In under 60 seconds you get a positioning angle, three campaign concepts with rationale, and a 7-day content calendar across platforms. Then — and only then — the copy.
                </p>
              </div>
            </div>

            <div className="relative p-8 md:p-12 border" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
              <div className="absolute top-0 left-0 w-12 h-[2px]" style={{ background: ACCENT }} />
              <div className="absolute top-0 left-0 w-[2px] h-12" style={{ background: ACCENT }} />
              <div className="absolute bottom-0 right-0 w-12 h-[2px]" style={{ background: ACCENT }} />
              <div className="absolute bottom-0 right-0 w-[2px] h-12" style={{ background: ACCENT }} />

              <div className="grid md:grid-cols-2 gap-8 mb-8">
                <div>
                  <label className="mono text-[10px] uppercase tracking-widest mb-3 block" style={{ color: MUTED }}>
                    01 · Product URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://yourbrand.com"
                    className="input-field w-full pb-2 text-lg"
                  />
                </div>
                <div>
                  <label className="mono text-[10px] uppercase tracking-widest mb-3 block" style={{ color: MUTED }}>
                    02 · Audience (one line)
                  </label>
                  <input
                    type="text"
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    placeholder="Hardcore PvP gamers, 18-34"
                    className="input-field w-full pb-2 text-lg"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 mono text-xs mb-6 p-3" style={{ color: ACCENT, background: '#1f0608', border: `1px solid ${ACCENT_DIM}` }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-4" style={{ borderTop: `1px solid ${ACCENT_DIM}` }}>
                <button onClick={() => run(false)} className="btn-red px-8 py-4 mono text-sm uppercase tracking-widest font-bold inline-flex items-center gap-3">
                  <Play size={14} fill="currentColor" /> Run live research
                </button>
                <button onClick={() => run(true)} className="mono text-xs uppercase tracking-widest underline decoration-dotted underline-offset-4" style={{ color: MUTED }}>
                  or · run with demo data
                </button>
              </div>
            </div>

            {/* Differentiator strip */}
            <div className="grid md:grid-cols-3 gap-4 mt-12">
              {[
                { tag: 'Research', text: 'Actually browses the web. Reads your competitors. Reports what it found.' },
                { tag: 'Strategy', text: 'Outputs positioning, concepts and a calendar — not just captions.' },
                { tag: 'Copy last', text: 'Generates the actual post only when you ask. After the reasoning.' },
              ].map((x, i) => (
                <div key={i} className="p-5 border dash-border" style={{ borderColor: ACCENT_DIM, borderBottom: 0 }}>
                  <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>{x.tag}</div>
                  <div className="text-sm leading-relaxed">{x.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ WORKING STAGE ============ */}
        {stage === 'working' && (
          <div className="relative">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Terminal size={14} style={{ color: ACCENT }} />
                <span className="mono text-xs uppercase tracking-widest">Agent · Research</span>
                <div className="w-2 h-2 rounded-full pulse" style={{ background: ACCENT }} />
              </div>
              <div className="mono text-xs" style={{ color: MUTED }}>
                t+{String(Math.floor(elapsed / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
              </div>
            </div>

            <div className="relative grid-bg border p-6 md:p-10 min-h-[480px]" style={{ borderColor: ACCENT_DIM, background: BG_2 }}>
              <div className="noise absolute inset-0" />

              <div className="relative">
                <div className="mono text-[11px] mb-6" style={{ color: MUTED }}>
                  $ cmo-agent run --url "{url}" --audience "{audience.slice(0, 40)}{audience.length > 40 ? '…' : ''}"
                </div>

                <div className="space-y-2">
                  {researchSteps.map((step, i) => (
                    <div key={i} className="reveal flex items-start gap-3 mono text-sm">
                      <div className="mt-[6px] flex-shrink-0 w-4 flex items-center justify-center">
                        {step.status === 'running' && <Loader2 size={12} className="spin-slow" style={{ color: ACCENT }} />}
                        {step.status === 'done' && <Check size={13} style={{ color: ACCENT }} />}
                        {step.status === 'pending' && <div className="w-1.5 h-1.5 rounded-full" style={{ background: MUTED }} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2">
                          <span style={{ color: step.status === 'pending' ? MUTED : INK }}>▸ {step.label}</span>
                          {step.status === 'running' && <span className="cursor" style={{ color: ACCENT }}>▋</span>}
                        </div>
                        {step.finding && (
                          <div className="text-xs mt-1 pl-3 border-l" style={{ color: MUTED, borderColor: ACCENT_DIM }}>
                            {step.finding}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {researchSteps.length >= 5 && (
                  <div className="reveal mt-8 pt-6" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
                    <div className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
                      Synthesizing strategic brief<span className="cursor">▋</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 mono text-[11px] flex items-center gap-4" style={{ color: MUTED }}>
              <span>Model · claude-sonnet-4</span>
              <span>·</span>
              <span>Tools · web_search</span>
              <span>·</span>
              <span>Output · JSON</span>
            </div>
          </div>
        )}

        {/* ============ BRIEF STAGE ============ */}
        {stage === 'brief' && brief && (
          <div className="relative reveal">
            {/* Masthead */}
            <div className="flex items-end justify-between mb-10 pb-6" style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}>
              <div>
                <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: ACCENT }}>
                  The Brief · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                <h2 className="serif text-2xl md:text-3xl" style={{ fontWeight: 400 }}>
                  {brief.company_summary}
                </h2>
              </div>
              <div className="mono text-[10px] uppercase tracking-widest text-right hidden md:block" style={{ color: MUTED }}>
                Issue 001<br />cmo.box
              </div>
            </div>

            {/* Positioning statement — the headline */}
            <div className="grid md:grid-cols-12 gap-8 mb-16">
              <div className="md:col-span-2">
                <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                  ⎯ Positioning
                </div>
              </div>
              <div className="md:col-span-10">
                <div className="relative">
                  <Quote size={40} className="absolute -top-2 -left-2 opacity-10" style={{ color: ACCENT }} />
                  <h3 className="serif italic text-4xl md:text-6xl leading-[1.05] mb-6 pl-8" style={{ fontWeight: 400 }}>
                    "{brief.positioning.angle}."
                  </h3>
                  <p className="text-base md:text-lg pl-8" style={{ color: INK, maxWidth: '48rem' }}>
                    {brief.positioning.rationale}
                  </p>
                </div>
              </div>
            </div>

            {/* Market gap */}
            <div className="grid md:grid-cols-12 gap-8 mb-16">
              <div className="md:col-span-2">
                <div className="mono text-[10px] uppercase tracking-widest" style={{ color: ACCENT }}>
                  ⎯ Gap
                </div>
              </div>
              <div className="md:col-span-10">
                <p className="text-lg md:text-xl leading-relaxed" style={{ maxWidth: '52rem' }}>
                  {brief.market_gap}
                </p>
                <div className="mt-4 pl-0 space-y-1">
                  {brief.research_findings.slice(0, 4).map((f, i) => (
                    <div key={i} className="mono text-xs flex gap-3" style={{ color: MUTED }}>
                      <span style={{ color: ACCENT }}>◆</span>
                      <span><span style={{ color: INK }}>{f.source}:</span> {f.finding}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Concepts */}
            <div className="mb-16">
              <div className="flex items-baseline justify-between mb-6 pb-3" style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}>
                <h4 className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
                  ⎯ 02 / Campaign Concepts
                </h4>
                <span className="mono text-[10px]" style={{ color: MUTED }}>03 ideas</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4">
                {brief.concepts.map((c, i) => (
                  <div key={c.id} className="p-6 relative group transition-all" style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}>
                    <div className="mono text-[10px] uppercase tracking-widest mb-4" style={{ color: ACCENT }}>
                      Concept {String(i + 1).padStart(2, '0')}
                    </div>
                    <h5 className="serif text-2xl mb-4 leading-tight" style={{ fontWeight: 600 }}>
                      {c.name}
                    </h5>
                    <p className="text-sm leading-relaxed mb-4" style={{ color: INK }}>
                      {c.hook}
                    </p>
                    <div className="pt-4 mt-4" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
                      <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>Why now</div>
                      <p className="text-xs leading-relaxed" style={{ color: MUTED }}>{c.why_now}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calendar */}
            <div className="mb-8">
              <div className="flex items-baseline justify-between mb-6 pb-3" style={{ borderBottom: `1px solid ${ACCENT_DIM}` }}>
                <h4 className="mono text-xs uppercase tracking-widest" style={{ color: ACCENT }}>
                  ⎯ 03 / 7-Day Calendar
                </h4>
                <span className="mono text-[10px]" style={{ color: MUTED }}>click an entry → generate copy</span>
              </div>
              <div className="space-y-1">
                {brief.calendar.map((entry, i) => {
                  const platform = PLATFORM_STYLES[entry.platform] || { bg: ACCENT_DIM, fg: INK, label: entry.platform.toUpperCase() };
                  const concept = brief.concepts.find(c => c.id === entry.concept_id);
                  const conceptIdx = brief.concepts.findIndex(c => c.id === entry.concept_id);
                  return (
                    <button
                      key={i}
                      onClick={() => generateCopy(entry)}
                      className="w-full text-left p-4 md:p-5 grid grid-cols-12 gap-4 items-center group transition-all hover:translate-x-1"
                      style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
                    >
                      <div className="col-span-2 md:col-span-1">
                        <div className="serif text-2xl leading-none" style={{ fontWeight: 600 }}>{entry.day}</div>
                        <div className="mono text-[10px] mt-1" style={{ color: MUTED }}>{entry.time}</div>
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <div className="mono text-[10px] uppercase tracking-widest px-2 py-1 inline-block" style={{ background: platform.bg, color: platform.fg }}>
                          {platform.label}
                        </div>
                      </div>
                      <div className="col-span-7 md:col-span-7 min-w-0">
                        <div className="text-sm md:text-base mb-1 truncate md:whitespace-normal">{entry.post_idea}</div>
                        <div className="mono text-[11px] flex items-start gap-2" style={{ color: MUTED }}>
                          <span style={{ color: ACCENT }}>↳</span>
                          <span className="truncate md:whitespace-normal">{entry.rationale}</span>
                        </div>
                      </div>
                      <div className="hidden md:flex col-span-1 items-center justify-center">
                        <span className="mono text-[10px] px-2 py-1" style={{ background: BG_3, color: MUTED }}>
                          C{conceptIdx + 1}
                        </span>
                      </div>
                      <div className="col-span-12 md:col-span-1 flex justify-end">
                        <ChevronRight size={18} style={{ color: ACCENT }} className="transition-transform group-hover:translate-x-1" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="text-center pt-10" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
              <p className="serif italic text-2xl md:text-3xl mb-2" style={{ fontWeight: 300 }}>
                Jasper starts here.
              </p>
              <p className="serif text-2xl md:text-3xl" style={{ fontWeight: 600, color: ACCENT }}>
                We end here.
              </p>
            </div>
          </div>
        )}

        {/* ============ COPY MODAL ============ */}
        {selectedEntry && (
          <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
            style={{ background: 'rgba(0,0,0,0.85)' }}
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="relative w-full md:max-w-2xl max-h-[90vh] overflow-auto scrollbar-thin reveal"
              style={{ background: BG_2, border: `1px solid ${ACCENT_DIM}` }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="sticky top-0 z-10 flex items-center justify-between p-5 md:p-6" style={{ background: BG_2, borderBottom: `1px solid ${ACCENT_DIM}` }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div className="mono text-[10px] uppercase tracking-widest px-2 py-1 flex-shrink-0" style={{ background: (PLATFORM_STYLES[selectedEntry.platform] || {}).bg, color: (PLATFORM_STYLES[selectedEntry.platform] || {}).fg }}>
                    {selectedEntry.platform}
                  </div>
                  <div className="mono text-xs truncate" style={{ color: MUTED }}>
                    {selectedEntry.day} · {selectedEntry.time}
                  </div>
                </div>
                <button onClick={() => setSelectedEntry(null)} className="p-1 flex-shrink-0">
                  <XIcon size={18} style={{ color: MUTED }} />
                </button>
              </div>

              <div className="p-6 md:p-8">
                {copyLoading ? (
                  <div className="flex flex-col items-center gap-4 py-12">
                    <Loader2 size={24} className="spin-slow" style={{ color: ACCENT }} />
                    <div className="mono text-xs uppercase tracking-widest" style={{ color: MUTED }}>
                      Writing the post<span className="cursor">▋</span>
                    </div>
                  </div>
                ) : copyData ? (
                  <div className="space-y-8">
                    <div>
                      <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                        ⎯ Hook
                      </div>
                      <div className="serif italic text-2xl md:text-3xl leading-tight" style={{ fontWeight: 400 }}>
                        "{copyData.hook}"
                      </div>
                    </div>

                    <div>
                      <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                        ⎯ Caption
                      </div>
                      <div className="text-base leading-relaxed whitespace-pre-wrap p-4" style={{ background: BG, border: `1px solid ${ACCENT_DIM}` }}>
                        {copyData.caption}
                      </div>
                    </div>

                    <div>
                      <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                        ⎯ Visual Direction
                      </div>
                      <p className="text-sm leading-relaxed" style={{ color: MUTED }}>
                        {copyData.visual_direction}
                      </p>
                    </div>

                    {copyData.hashtags && copyData.hashtags.length > 0 && (
                      <div>
                        <div className="mono text-[10px] uppercase tracking-widest mb-3" style={{ color: ACCENT }}>
                          ⎯ Tags
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {copyData.hashtags.map((tag, i) => (
                            <span key={i} className="mono text-xs px-2 py-1" style={{ background: BG_3, color: ACCENT }}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {copyData.cta && (
                      <div className="pt-6" style={{ borderTop: `1px dashed ${ACCENT_DIM}` }}>
                        <div className="mono text-[10px] uppercase tracking-widest mb-2" style={{ color: MUTED }}>
                          CTA
                        </div>
                        <div className="mono text-sm" style={{ color: INK }}>
                          → {copyData.cta}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom marker */}
      <div className="text-center py-6 mono text-[10px] uppercase tracking-widest" style={{ color: MUTED }}>
        cmo.box · strategy before copy · v0.1
      </div>
    </div>
  );
}
