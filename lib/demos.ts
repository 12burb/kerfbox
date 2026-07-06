/**
 * Pre-baked Kerfs shown on the landing as proof-of-output.
 *
 * Three verticals: gaming studio (live-ops PvP), B2B marketing platform
 * (PLG-era), DTC coffee. Each one is a hand-written Kerf that itself
 * passes the refusal rule — moat names competitors from the cluster map
 * and gives a structural reason. The demos ARE the product, so they
 * have to model what good looks like.
 *
 * These are imported by:
 *   - app/page.tsx (landing carousel)
 *   - lib/demo.ts (DEMO_KERF re-export, used by /api/strategy demo path)
 */
import type { Kerf, Copy } from "./schema";

/* ================================================================
 * 01 — Gaming studio
 * ================================================================ */

export const GAMING_KERF: Kerf = {
  company_summary:
    "A mid-size PvP-focused gaming studio building hardcore competitive experiences",
  cluster_map: [
    {
      cluster: "Gameplay-clip churn",
      examples: ["Apex Legends", "Valorant", "Call of Duty Warzone", "Rainbow Six Siege"],
      pattern:
        "All four publishers post highlight reels and pro-play clips at high frequency — the audience has tuned them out.",
    },
    {
      cluster: "Polished cinematic drops",
      examples: ["Riot Games", "Bungie"],
      pattern:
        "Quarterly trailers and cinematics designed for marketing, not for community — high gloss, zero personality.",
    },
  ],
  kerf: {
    cut: "The studio that lets you watch the people building it lose to you.",
    why_now:
      "TikTok #BTS for gaming is up 340% YoY and r/gaming threads show clip-fatigue with rising demand for dev-story content.",
  },
  wedge: {
    claim: "Devs in the queue. No private lobbies.",
    proof: [
      "Lead combat designer streams ranked weekly with a public account.",
      "Patch notes have historically credited specific community-found bugs by username.",
      "Studio has 18 designers vs Riot's 4,500 — small enough that individual devs can be the face.",
    ],
    moat:
      "Riot Games and Bungie cannot follow this without contradicting their existing positioning lock-in: their cinematic-first marketing has trained audiences to expect distance and polish, and their headcount means any individual dev's voice is structurally diluted. Apex and Valorant can't credibly run dev-vs-community ranked because their pro-play industrial complex has trained audiences to read 'dev play' as a marketing stunt, not a humility signal. The moat is incentive structure, not effort.",
  },
  signals: [
    {
      source: "Landing page scan",
      finding: "Positioning anchored hard on 'skill-based combat' and 'no pay-to-win'",
      citations: [{ title: "Off The Grid — Official Site", url: "https://offthegrid.game" }],
    },
    {
      source: "Competitor scan",
      finding: "Top 5 competitors all running gameplay-clip-heavy feeds — oversaturated",
      citations: [
        { title: "Gaming social benchmark 2026", url: "https://www.newzoo.com/insights" },
        { title: "Content trends in PvP", url: "https://www.gamesindustry.biz" },
      ],
    },
    {
      source: "Competitor scan",
      finding: "Only 1 of 5 is posting creator/community content — wide-open lane",
      citations: [{ title: "PvP studio social audit", url: "https://blog.hootsuite.com/gaming" }],
    },
    {
      source: "Gaming discourse",
      finding: "r/gaming trending: burnout on montages, rising appetite for 'dev stories'",
      citations: [{ title: "r/gaming — weekly meta thread", url: "https://www.reddit.com/r/gaming" }],
    },
    {
      source: "Platform analysis",
      finding: "TikTok #BTS for gaming up 340% YoY; Twitch dev streams trending",
      citations: [
        { title: "TikTok Creative Center — Gaming", url: "https://ads.tiktok.com/business/creativecenter" },
        { title: "Twitch annual recap", url: "https://blog.twitch.tv" },
      ],
    },
    {
      source: "Audience analysis",
      finding: "Hardcore PvP audiences over-index on creator content vs broader gaming",
      citations: [],
    },
  ],
  concepts: [
    {
      id: "c1",
      name: "Dev in the Arena",
      embodies_wedge:
        "The wedge IS this concept — devs playing the public queue, losing, and narrating it. Riot and Bungie structurally can't run this format with the same credibility.",
      why_now:
        "r/gaming is exhausted by montages and asking for 'dev stories' — filling the exact gap competitors leave",
      hook: "Your developers play against your community on-stream, weekly, losses included.",
    },
    {
      id: "c2",
      name: "Underdog Arcs",
      embodies_wedge:
        "Narrative content about real low-ranked players — proof that the studio sees the queue, not just the pro stage. Competitors with pro-play industrial complexes can't credibly center a low-rank player.",
      why_now:
        "TikTok gaming #BTS is up 340% YoY — narrative-driven content beats clips in this cycle",
      hook: "Follow one low-ranked tournament player across a season — failures, redemption, all of it.",
    },
    {
      id: "c3",
      name: "The Skill Receipt",
      embodies_wedge:
        "Public, falsifiable proof that wins came from skill — backs the wedge with evidence the F2P/pay-to-win cluster can't generate without dismantling their monetization model.",
      why_now:
        "'No pay-to-win' is your most defensible moat — turn it into provable, shareable content",
      hook: "Weekly breakdown of a pro match that couldn't have been bought — just skill.",
    },
  ],
  calendar: [
    { day: "Mon", time: "9:00 AM", platform: "X", concept_id: "c3", post_idea: "Thread breaking down Sunday's pro final — every key moment tied to pure skill", rationale: "Monday 9am is peak industry check-in on X; thread format rewards 'skill receipt' evidence" },
    { day: "Tue", time: "2:00 PM", platform: "TikTok", concept_id: "c1", post_idea: "Lead dev plays ranked, loses, talks about why", rationale: "BTS content is trending; hits the creator-driven gap competitors ignore" },
    { day: "Wed", time: "7:00 PM", platform: "YouTube", concept_id: "c2", post_idea: "Episode 1 of tournament underdog series — first practice week", rationale: "Wed evening YouTube peak for long-form; pilot establishes the series" },
    { day: "Thu", time: "12:00 PM", platform: "Reddit", concept_id: "c1", post_idea: "r/[game] AMA with the combat designer on balance questions", rationale: "Thursday lunch is peak Reddit; lives where your hardcore audience actually is" },
    { day: "Fri", time: "4:00 PM", platform: "Instagram", concept_id: "c2", post_idea: "Carousel: the underdog's week — practice, failures, small wins", rationale: "Friday afternoon drives highest engagement; carousel fits narrative content" },
    { day: "Sat", time: "1:00 PM", platform: "TikTok", concept_id: "c3", post_idea: "60-sec edit of the best skill-only community play of the week", rationale: "Saturday TikTok peak; UGC spotlight reinforces positioning and rewards creators" },
    { day: "Sun", time: "6:00 PM", platform: "X", concept_id: "c1", post_idea: "Announce Monday's dev-vs-community stream with stakes", rationale: "Sunday evening builds Monday anticipation; weekly ritual compounds viewership" },
  ],
};

/* ================================================================
 * 02 — B2B marketing platform (PLG-era)
 * ================================================================ */

export const MARKETING_KERF: Kerf = {
  company_summary:
    "A marketing platform for product-led SaaS companies between $1M and $10M ARR — past founder-led growth, before a marketing team",
  cluster_map: [
    {
      cluster: "All-in-one suites",
      examples: ["HubSpot", "Marketo", "Salesforce Marketing Cloud", "Pardot"],
      pattern:
        "Sold as 'one platform for everything,' shipped as a blank canvas. The core revenue stream is implementation services and certified-partner ecosystems — the empty configuration IS the product.",
    },
    {
      cluster: "Channel point tools",
      examples: ["Klaviyo", "Customer.io", "Iterable", "Braze"],
      pattern:
        "Deep on one channel — email, lifecycle, push — priced per message or per profile. Owned by lifecycle/growth ops, not marketing leadership. Defaults are intentionally generic so customers tune them and grow send volume.",
    },
  ],
  kerf: {
    cut: "The marketing platform that ships a working playbook on day one, not a blank canvas after week six.",
    why_now:
      "PLG SaaS founders crossed $1M ARR without a marketing team and now hit a wall: HubSpot's six-week setup is too slow, point tools require an ops team they don't have. 2026 G2 data shows 'time-to-first-campaign' is now the #1 stated reason for marketing-platform churn.",
  },
  wedge: {
    claim: "Configure your business once. The platform writes the playbook.",
    proof: [
      "Default playbooks are version-controlled — you can see every change shipped to all 800+ customer accounts in the last 90 days.",
      "Founder ran lifecycle at Stripe through the $1M→$1B ARR window — the playbooks are extracted from systems that worked, not invented from scratch.",
      "Pricing is a flat per-account fee tied to active campaigns, not message volume — when defaults reduce sends, our revenue is unaffected.",
    ],
    moat:
      "HubSpot, Marketo, and Salesforce structurally cannot ship working defaults: their gross margin depends on a multi-billion-dollar implementation-partner ecosystem (HubSpot Solutions Partners alone moved $2.5B GMV in 2025) that exists precisely because the canvas is blank. Shipping defaults would collapse partner revenue and the certification economy that funds their go-to-market. Klaviyo and Customer.io can't because their per-message pricing means any default that reduces sends is a direct revenue cut — they are aligned with their customers' send volume, not their customers' outcomes. We monetize on accounts and active campaigns, not setup hours or send volume, so working defaults make our economics better.",
  },
  signals: [
    {
      source: "Competitor pricing scan",
      finding: "HubSpot Pro starts at $890/mo + onboarding fee; Marketo Engage requires annual contracts averaging $40k+",
      citations: [
        { title: "HubSpot Pricing — 2026", url: "https://www.hubspot.com/pricing/marketing" },
        { title: "Marketo Pricing Analysis", url: "https://www.g2.com/products/marketo-engage/pricing" },
      ],
    },
    {
      source: "G2 review analysis",
      finding: "Top complaint across HubSpot/Marketo/Salesforce: 'took us 8+ weeks to get a single campaign live'",
      citations: [
        { title: "G2 Marketing Automation Category", url: "https://www.g2.com/categories/marketing-automation" },
      ],
    },
    {
      source: "Reddit discourse",
      finding: "r/SaaS and r/marketing both surface the 'we have HubSpot but no one to run it' problem weekly",
      citations: [
        { title: "r/SaaS — marketing-tools megathread", url: "https://www.reddit.com/r/SaaS" },
      ],
    },
    {
      source: "Partner-economy analysis",
      finding: "HubSpot Solutions Partners ecosystem moved ~$2.5B in attached services GMV in 2025 (per HubSpot 10-K)",
      citations: [
        { title: "HubSpot 2025 Annual Report", url: "https://ir.hubspot.com" },
      ],
    },
    {
      source: "Pricing-model analysis",
      finding: "Klaviyo, Customer.io, Iterable all price on profiles or messages — defaults that reduce sends reduce their revenue",
      citations: [
        { title: "Klaviyo Pricing", url: "https://www.klaviyo.com/pricing" },
        { title: "Customer.io Pricing", url: "https://customer.io/pricing" },
      ],
    },
    {
      source: "Audience analysis",
      finding: "PLG SaaS founders at $1M-10M ARR consistently say marketing is their #1 unsolved problem — but won't hire a head of marketing yet",
      citations: [],
    },
  ],
  concepts: [
    {
      id: "c1",
      name: "Day 1 Playbook",
      embodies_wedge:
        "Every onboarding ends with a working welcome series, activation campaign, and re-engagement flow live in production. HubSpot ships an empty canvas; we ship the canvas already painted. The wedge IS the product experience.",
      why_now:
        "Time-to-first-campaign is 2026's most-cited churn reason — founders need value Monday, not in week six",
      hook: "Sign up Monday. Three campaigns running by Tuesday — built from the playbook that worked at Stripe.",
    },
    {
      id: "c2",
      name: "Public Playbook Diffs",
      embodies_wedge:
        "We publish every change to the default playbook — what changed, why, with screenshots. It's the inverse of black-box marketing AI: the playbook is auditable. HubSpot can't run this without revealing how empty their defaults are; Klaviyo can't without admitting their defaults are tuned for send volume.",
      why_now:
        "Trust in marketing AI is collapsing — public version control is the antidote",
      hook: "Every Friday, we ship a public diff of the playbook and explain the change.",
    },
    {
      id: "c3",
      name: "The Six-Week Receipt",
      embodies_wedge:
        "Side-by-side timelines: a real customer's HubSpot setup vs their migration onto our platform, hour-by-hour. Proof, not pitch. The wedge is time-to-value, so we make time-to-value the content.",
      why_now:
        "PLG founders evaluate by ROI per week of founder time — receipts beat case studies in this cycle",
      hook: "We rebuilt one customer's stack in 90 minutes. Here's the timer.",
    },
  ],
  calendar: [
    { day: "Mon", time: "8:00 AM", platform: "LinkedIn", concept_id: "c3", post_idea: "Carousel: 'HubSpot setup: week 6. Our setup: 90 minutes. Here's what shipped each hour.'", rationale: "LinkedIn Mon 8am hits founder/CMO scroll; receipt format outperforms claims in this segment" },
    { day: "Tue", time: "11:00 AM", platform: "X", concept_id: "c1", post_idea: "Thread: 'A welcome series that converts at 9.2%. Here's the playbook — copy-paste yours.'", rationale: "Tuesday late-morning peak for SaaS X; specific stat + giveaway drives saves and replies" },
    { day: "Wed", time: "9:00 AM", platform: "LinkedIn", concept_id: "c2", post_idea: "This week's playbook diff: re-engagement window dropped from 30→21 days. Here's why and what data we saw.", rationale: "Mid-week long-form post; 'public diff' format is novel and shareable inside marketing teams" },
    { day: "Thu", time: "1:00 PM", platform: "YouTube", concept_id: "c3", post_idea: "Live migration of a real customer's HubSpot stack — cameras on, timer running", rationale: "Thursday lunch for long-form; live-stream format makes the speed claim falsifiable" },
    { day: "Fri", time: "10:00 AM", platform: "X", concept_id: "c2", post_idea: "Public diff post — what we shipped to everyone's playbook this week, in 1 thread", rationale: "Friday recap slot; weekly cadence builds an audience that checks in for the diff" },
    { day: "Sat", time: "9:00 AM", platform: "Reddit", concept_id: "c1", post_idea: "r/SaaS post: 'We extracted Stripe's 2018 lifecycle playbook. Free if you want it.'", rationale: "Saturday is r/SaaS peak; gift-economy post avoids ad-flagging and seeds founder DMs" },
    { day: "Sun", time: "5:00 PM", platform: "LinkedIn", concept_id: "c3", post_idea: "Founder reflection: 'I spent 3 years at Stripe watching marketing get built. Here's what's missing from every PLG tool.'", rationale: "Sunday LinkedIn drives founder-to-founder shares; reflection format opens trust without selling" },
  ],
};

/* ================================================================
 * 03 — DTC specialty coffee
 * ================================================================ */

export const COFFEE_KERF: Kerf = {
  company_summary:
    "A specialty coffee roaster selling subscription beans direct-to-consumer to home brewers with a grinder",
  cluster_map: [
    {
      cluster: "Heritage roasteries",
      examples: ["Blue Bottle", "Stumptown", "Intelligentsia", "Counter Culture"],
      pattern:
        "Café-first identity — brick-and-mortar locations are the product, mail order is a side channel. Roast schedules built around café espresso, where beans peak at 4–7 days. Story is origin, terroir, and roastmaster pedigree.",
    },
    {
      cluster: "Subscription matchmaking",
      examples: ["Trade Coffee", "Atlas Coffee Club", "Driftaway"],
      pattern:
        "Curate a long tail of micro-roasters and rotate the customer through them — 'we'll match you with your perfect coffee.' The product is the algorithm, not the bean. Customer rarely sees the same coffee twice.",
    },
  ],
  kerf: {
    cut: "The roastery that ages its coffees on purpose — and tells you the day to drink them.",
    why_now:
      "2026 Specialty Coffee Association data shows 'days off roast' is now the #1 question on coffee-subreddit unboxing posts, but no major brand owns the answer. Home-grinder ownership crossed 38% of US coffee buyers in 2025 — there are finally enough enthusiasts to support a calendar-based product.",
  },
  wedge: {
    claim: "Coffee with a release date. Drink it on time.",
    proof: [
      "Every bag ships with a peak window stamped on it — e.g. 'Best Day 14–Day 28 from roast.' If we miss the window in our warehouse, we don't ship it.",
      "Roastmaster Yuki Tanaka spent 8 years at La Cabra developing the rest-and-release protocol; the protocol is documented and public.",
      "Last quarter we composted 1,840 lbs of in-spec coffee that aged past its window in our warehouse — published in the monthly transparency report.",
    ],
    moat:
      "Blue Bottle, Stumptown, and Intelligentsia cannot follow without contradicting their café-first model: café espresso wants 4–7 days off roast for crema stability, residential pour-over and AeroPress want 14–28 days for clarity. Their roast schedules, supply chain, and SKU-level inventory are built around café throughput — re-architecting for residential-only release windows would compromise their café customers, who are still 60–70% of revenue. Trade Coffee and Atlas can't follow because their entire product is rotation through a long tail of 50+ micro-roasters monthly — they have no protocol to enforce, only logistics. The moat is the calendar, not the bean: it requires a single-roaster supply chain optimized for a window, which the heritage cluster won't sacrifice and the matchmaking cluster can't even attempt.",
  },
  signals: [
    {
      source: "SCA market report",
      finding: "Home-grinder ownership crossed 38% of US coffee buyers in 2025 — first year over the enthusiast threshold",
      citations: [
        { title: "SCA — 2026 Coffee Consumer Trends", url: "https://sca.coffee/research" },
      ],
    },
    {
      source: "Reddit discourse",
      finding: "'Days off roast' is the most-asked question on r/coffee unboxing posts, by 3:1 over origin/varietal",
      citations: [
        { title: "r/coffee — top unboxing threads 2025", url: "https://www.reddit.com/r/coffee" },
      ],
    },
    {
      source: "Competitor scan",
      finding: "Heritage roasters ship within 3–7 days of roast; subscription clubs average 5–9 days. Nobody publishes a peak-window date.",
      citations: [
        { title: "Blue Bottle — Subscription FAQ", url: "https://bluebottlecoffee.com/subscriptions" },
        { title: "Stumptown — Subscriptions", url: "https://www.stumptowncoffee.com/subscription" },
      ],
    },
    {
      source: "Pricing analysis",
      finding: "Specialty mail-order beans cluster at $18–24 per 12oz — calendar product can support $24–28 with provable freshness",
      citations: [
        { title: "Stumptown pricing", url: "https://www.stumptowncoffee.com/products" },
        { title: "Trade Coffee pricing", url: "https://www.drinktrade.com" },
      ],
    },
    {
      source: "Audience analysis",
      finding: "Home-brew enthusiasts report 'wasted bag' (stale or under-rested) as their #1 frustration — calendar fixes the exact pain",
      citations: [],
    },
    {
      source: "Cultural trend",
      finding: "'Drop culture' from streetwear and natural wine has migrated to coffee — release-date framing reads native to this audience",
      citations: [
        { title: "Eater — coffee drop culture", url: "https://www.eater.com" },
      ],
    },
  ],
  concepts: [
    {
      id: "c1",
      name: "The Calendar",
      embodies_wedge:
        "A public release calendar showing what roasts hit their drink-by-window each week, with countdowns. The wedge IS the calendar — you cannot have a calendar without a protocol, and the heritage and matchmaking clusters have neither.",
      why_now:
        "Drop culture has trained audiences to refresh release pages — coffee has never had one because no one had a protocol",
      hook: "This week's drops: three roasts entering their peak window Friday. Set a reminder.",
    },
    {
      id: "c2",
      name: "We Composted This",
      embodies_wedge:
        "Monthly transparency post: how many pounds of in-spec coffee we threw away because it aged past its window in our warehouse. Heritage roasters can't run this without admitting their café-first economics; matchmaking clubs can't because they don't hold inventory long enough to age it.",
      why_now:
        "Anti-greenwashing sentiment is at all-time high — 'we threw out money to keep our promise' is the most credible sustainability story in the category",
      hook: "We composted 1,840 lbs this month so you didn't drink it past peak.",
    },
    {
      id: "c3",
      name: "Brew Day",
      embodies_wedge:
        "Short-form video on each bag's recommended drink-day, with the roastmaster brewing it on camera and tasting against an out-of-window control. Proves the protocol works on falsifiable terms. Subscription clubs can't make this content because they don't roast; heritage roasters won't because it indicts their own ship-window.",
      why_now:
        "Side-by-side tasting content has overtaken origin-story content on coffee TikTok — the audience wants proof, not pedigree",
      hook: "Same bean, day 5 vs day 21. Watch the cup change.",
    },
  ],
  calendar: [
    { day: "Mon", time: "10:00 AM", platform: "Instagram", concept_id: "c1", post_idea: "Carousel: 'this week's drops — 3 roasts hitting peak window Fri/Sat/Sun'", rationale: "Monday morning IG hits enthusiasts checking the week — calendar framing rewards recurring viewers" },
    { day: "Tue", time: "6:00 PM", platform: "TikTok", concept_id: "c3", post_idea: "Brew Day: same bean, day 5 vs day 21. Side-by-side tasting on camera.", rationale: "Tuesday evening TikTok peak; falsifiable side-by-side outperforms origin-story content in current cycle" },
    { day: "Wed", time: "9:00 AM", platform: "X", concept_id: "c2", post_idea: "Monthly transparency post: 'we composted 1,840 lbs of in-spec coffee this month — here's the math'", rationale: "Wed morning X is the recurring transparency slot; numbers + receipts post drives quote-replies and credibility" },
    { day: "Thu", time: "12:00 PM", platform: "Reddit", concept_id: "c3", post_idea: "r/coffee post: 'we tested our bag at day 5 vs day 21 — full notes, photos, scoresheet'", rationale: "Thursday lunch peak on r/coffee; long-form data post earns top-thread placement and inbound subs" },
    { day: "Fri", time: "11:00 AM", platform: "Instagram", concept_id: "c1", post_idea: "Drop reminder: today's roast hits peak. Buy now or wait for next batch.", rationale: "Friday late-morning aligns with weekend prep window; scarcity framing fits drop culture and protects margin" },
    { day: "Sat", time: "8:00 AM", platform: "YouTube", concept_id: "c3", post_idea: "10-min video: roastmaster walks through one bag's full lifecycle, day-by-day", rationale: "Saturday morning long-form for ritual brewers; deep content seeds organic search for 'days off roast'" },
    { day: "Sun", time: "7:00 PM", platform: "X", concept_id: "c2", post_idea: "Reflection thread from the roastmaster: 'why we'd rather lose the bag than ship it past window'", rationale: "Sunday evening reflective slot; founder-voice post builds trust without selling and seeds Monday's drops" },
  ],
};

/* ================================================================
 * Indexed export for the landing carousel
 * ================================================================ */

export type DemoId = "gaming" | "marketing" | "coffee";

export type DemoMeta = {
  id: DemoId;
  vertical: string;
  brand_label: string;
  short_description: string;
  kerf: Kerf;
};

export const DEMOS: DemoMeta[] = [
  {
    id: "gaming",
    vertical: "Gaming",
    brand_label: "PvP studio",
    short_description: "Hardcore PvP studio in a feed of identical highlight reels. Cuts toward devs-in-the-queue.",
    kerf: GAMING_KERF,
  },
  {
    id: "marketing",
    vertical: "B2B SaaS",
    brand_label: "Marketing platform",
    short_description: "Marketing platform for PLG companies past founder-led growth. Cuts toward working-defaults.",
    kerf: MARKETING_KERF,
  },
  {
    id: "coffee",
    vertical: "DTC",
    brand_label: "Specialty coffee",
    short_description: "Specialty coffee roaster against heritage cafés and matchmaking clubs. Cuts toward calendar-based release.",
    kerf: COFFEE_KERF,
  },
];

/* Demo copy for the gaming demo's calendar — used by /api/copy fallback */
export const DEMO_COPY: Copy = {
  hook: "Our devs play your ranked queue. They lose. A lot.",
  caption:
    "every tuesday at 2pm CT, our lead combat designer hops into ranked. no dev matchmaking. no private lobbies. real queue, real losses.\n\nthis week: Jamie got bodied round one by a build they personally nerfed last patch. they called it 'humbling' — dev-speak for 'I'm going to fix this'.\n\nclip in comments. full vod on twitch.",
  visual_direction:
    "Split-screen: top half gameplay feed with the loss moment, bottom half dev face-cam reacting in real time. Cut to a short post-match where they explain what went wrong. Native lowercase captions, red text on black for the 'humbled' beat.",
  hashtags: ["#gamedev", "#devsplay", "#gamingtiktok", "#BTS", "#devlife"],
  cta: "full match — twitch link in bio",
};
