import type { ReplayAgentName, ReplayAgentTone, ReplaySentiment, ReplaySeverity, ReplayVerdict } from "./replayTypes"

export type MockReplayEventType = "macro" | "crypto_policy" | "liquidity" | "narrative_shock"
export type MockReplayShockLevel = "low" | "medium" | "high"

export type MockReplayPricePoint = {
  label: string
  price: number
  volume?: number
}

export type MockReplayNewsItem = {
  time: string
  source: string
  headline: string
  sentiment: ReplaySentiment
  narrative: string
}

export type MockReplayTimelineEvent = {
  id: string
  time: string
  title: string
  severity: ReplaySeverity
  description: string
}

export type MockReplayAgentSummary = {
  agent: Exclude<ReplayAgentName, "Final Verdict / Narrative vs Reality">
  tone: ReplayAgentTone
  confidence: number
  summary: string
  watch: string
}

export type MockReplayDriver = {
  driver: string
  confidence: number
  evidence: string
}

export type MockReplaySourceCase = {
  id: string
  title: string
  symbol: string
  eventType: MockReplayEventType
  shockLevel: MockReplayShockLevel
  window: string
  setup: string
  outcome: string
  verdict: ReplayVerdict
  verdictSummary: string
  realityCheck: string
  primaryNarrative: string
  narrativeSummary: string
  predictionExpectation: {
    market: string
    expectedProbability: number
    actualResolution: string
    note: string
  }
  derivatives: {
    fundingRate: number
    openInterestChange: number
    oiNotional: string
    crowdingRead: string
  }
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH"
    summary: string
    invalidation: string
    risks: string[]
  }
  possibleDrivers: MockReplayDriver[]
  pricePath: MockReplayPricePoint[]
  events: MockReplayTimelineEvent[]
  news: MockReplayNewsItem[]
  agents: MockReplayAgentSummary[]
}

export const MOCK_REPLAY_SOURCE_CASES: MockReplaySourceCase[] = [
  {
    id: "btc-spacex-ipo-selloff",
    title: "BTC Selloff / SpaceX IPO Narrative",
    symbol: "BTCUSDT",
    eventType: "narrative_shock",
    shockLevel: "high",
    window: "75m replay",
    setup: "BTC sold off after traders attributed risk-off pressure to a SpaceX IPO narrative and broader liquidity caution.",
    outcome: "The selloff extended first, then stabilized as derivatives pressure explained more of the move than the headline.",
    verdict: "Reality Diverged",
    verdictSummary: "The SpaceX IPO narrative explained attention, but derivatives de-risking and weak bid depth better explained the price path.",
    realityCheck: "Narrative was a useful trigger label, not the dominant causal driver.",
    primaryNarrative: "SpaceX IPO risk-off attribution",
    narrativeSummary: "Social and news flow framed the BTC selloff as SpaceX IPO related, while market structure pointed to leverage unwind.",
    predictionExpectation: {
      market: "SpaceX IPO timing placeholder",
      expectedProbability: 38,
      actualResolution: "No prediction market resolution inside replay window",
      note: "Mock expectation snapshot. Future adapter can map Polymarket/Kalshi-style history here.",
    },
    derivatives: {
      fundingRate: 0.021,
      openInterestChange: -4.8,
      oiNotional: "$8.9B",
      crowdingRead: "OI contracted while price fell, suggesting leverage reduction rather than fresh directional conviction.",
    },
    risk: {
      level: "HIGH",
      summary: "Execution risk stayed elevated while the market searched for the real driver.",
      invalidation: "Risk read improves only if price reclaims the first breakdown level with OI stabilization.",
      risks: [
        "Headline attribution may hide leverage unwind.",
        "Thin bids can exaggerate downside candles.",
        "Late shorts risk squeeze if narrative is disproven.",
      ],
    },
    possibleDrivers: [
      {
        driver: "Derivatives de-risking",
        confidence: 82,
        evidence: "Open interest fell while price declined, consistent with forced or voluntary leverage reduction.",
      },
      {
        driver: "Weak bid depth",
        confidence: 74,
        evidence: "Price moved quickly through the first support zone before liquidity stabilized.",
      },
      {
        driver: "SpaceX IPO narrative",
        confidence: 49,
        evidence: "The story drove attention, but did not produce a direct resolution or confirming macro shock.",
      },
    ],
    pricePath: [
      { label: "T-30", price: 69420, volume: 1220 },
      { label: "T-20", price: 69180, volume: 1380 },
      { label: "T-10", price: 68840, volume: 1810 },
      { label: "T+00", price: 68160, volume: 2440 },
      { label: "T+10", price: 67620, volume: 3120 },
      { label: "T+25", price: 67290, volume: 2860 },
      { label: "T+45", price: 67540, volume: 1960 },
      { label: "T+60", price: 67820, volume: 1640 },
    ],
    events: [
      {
        id: "spacex-narrative-emerges",
        time: "13:05",
        title: "SpaceX IPO narrative emerges",
        severity: "MEDIUM",
        description: "Traders begin attributing BTC weakness to risk-off speculation around a SpaceX IPO headline cycle.",
      },
      {
        id: "breakdown-accelerates",
        time: "13:18",
        title: "Breakdown accelerates",
        severity: "HIGH",
        description: "BTC loses the first support shelf as bid depth thins and futures flow turns defensive.",
      },
      {
        id: "oi-compression-confirmed",
        time: "13:42",
        title: "OI compression confirms",
        severity: "HIGH",
        description: "Open interest contracts into the selloff, raising the probability that leverage unwind was the main driver.",
      },
    ],
    news: [
      {
        time: "13:01",
        source: "MockWire",
        headline: "SpaceX IPO speculation returns to trader feeds",
        sentiment: "neutral",
        narrative: "SpaceX IPO attention",
      },
      {
        time: "13:17",
        source: "FlowDesk",
        headline: "BTC downside move coincides with futures OI compression",
        sentiment: "negative",
        narrative: "Leverage unwind",
      },
      {
        time: "13:39",
        source: "MacroDesk",
        headline: "Dollar bid and weak crypto depth keep risk appetite selective",
        sentiment: "negative",
        narrative: "Macro liquidity pressure",
      },
    ],
    agents: [
      {
        agent: "Technical Agent",
        tone: "BEARISH",
        confidence: 78,
        summary: "Support failed with expanding range and only partial reclaim after the liquidation leg.",
        watch: "Reclaim of the first breakdown shelf.",
      },
      {
        agent: "Flow Agent",
        tone: "DEFENSIVE",
        confidence: 82,
        summary: "OI compression and defensive futures flow mattered more than the headline label.",
        watch: "OI stabilization with bid refill.",
      },
      {
        agent: "Narrative Agent",
        tone: "MIXED",
        confidence: 61,
        summary: "The SpaceX IPO story provided attribution, but evidence for direct causality remained weak.",
        watch: "Second-source confirmation or prediction repricing.",
      },
      {
        agent: "Expectation Agent",
        tone: "MIXED",
        confidence: 52,
        summary: "Mock expectation stayed below decisive levels and did not explain the full selloff.",
        watch: "Expectation probability leading price, not lagging it.",
      },
      {
        agent: "Risk Agent",
        tone: "DEFENSIVE",
        confidence: 86,
        summary: "Driver uncertainty and thin liquidity made chasing either direction unattractive.",
        watch: "Failed reclaim followed by renewed OI build.",
      },
    ],
  },
  {
    id: "btc-etf-fade",
    title: "ETF Headline Fade",
    symbol: "BTCUSDT",
    eventType: "crypto_policy",
    shockLevel: "medium",
    window: "90m replay",
    setup: "Bullish headline impulse met crowded perp positioning and weak spot follow-through.",
    outcome: "Initial breakout failed, price rotated back into the pre-news range.",
    verdict: "Reality Diverged",
    verdictSummary: "Narrative was directionally bullish, but execution quality deteriorated after the first impulse.",
    realityCheck: "The replay suggests the headline created attention, not durable demand.",
    primaryNarrative: "ETF approval optimism",
    narrativeSummary: "ETF headlines created attention, but spot confirmation did not validate the breakout.",
    predictionExpectation: {
      market: "ETF approval odds placeholder",
      expectedProbability: 72,
      actualResolution: "No resolution in replay window",
      note: "Mock expectation layer. Replace with prediction market snapshots when historical data is available.",
    },
    derivatives: {
      fundingRate: 0.018,
      openInterestChange: 6.4,
      oiNotional: "$9.8B",
      crowdingRead: "Long crowding expanded faster than spot confirmation.",
    },
    risk: {
      level: "HIGH",
      summary: "Crowded long exposure made the upside impulse fragile.",
      invalidation: "Risk improves if spot demand confirms above the failed breakout zone.",
      risks: ["Crowded longs", "Weak spot confirmation", "Late breakout chasing"],
    },
    possibleDrivers: [
      {
        driver: "ETF headline impulse",
        confidence: 78,
        evidence: "Initial move followed the headline timestamp.",
      },
      {
        driver: "Crowded perp longs",
        confidence: 73,
        evidence: "Funding and OI expanded faster than spot confirmation.",
      },
      {
        driver: "Macro friction",
        confidence: 46,
        evidence: "Dollar strength limited broader risk appetite.",
      },
    ],
    pricePath: [
      { label: "T-45", price: 67280, volume: 980 },
      { label: "T-35", price: 67410, volume: 1010 },
      { label: "T-25", price: 68120, volume: 1880 },
      { label: "T-15", price: 68640, volume: 2350 },
      { label: "T-05", price: 68420, volume: 2100 },
      { label: "T+05", price: 67980, volume: 1980 },
      { label: "T+15", price: 67590, volume: 1720 },
      { label: "T+30", price: 67330, volume: 1440 },
    ],
    events: [
      {
        id: "headline-hit",
        time: "14:05",
        title: "ETF headline hits tape",
        severity: "HIGH",
        description: "Narrative impulse triggered broad attention and immediate long chasing.",
      },
      {
        id: "perp-expansion",
        time: "14:12",
        title: "Perp aggression expands",
        severity: "MEDIUM",
        description: "Open interest rose while spot confirmation lagged.",
      },
      {
        id: "failed-hold",
        time: "14:33",
        title: "Breakout hold failed",
        severity: "HIGH",
        description: "Price lost the impulse range and rotated back toward prior liquidity.",
      },
    ],
    news: [
      {
        time: "14:04",
        source: "MockWire",
        headline: "ETF decision window narrows as issuers update filings",
        sentiment: "positive",
        narrative: "ETF approval optimism",
      },
      {
        time: "14:20",
        source: "MacroDesk",
        headline: "Dollar bid limits broader risk appetite during crypto rally",
        sentiment: "neutral",
        narrative: "Macro friction",
      },
      {
        time: "14:36",
        source: "FlowWatch",
        headline: "Derivatives desks flag crowded BTC long positioning",
        sentiment: "negative",
        narrative: "Crowding risk",
      },
    ],
    agents: [
      {
        agent: "Technical Agent",
        tone: "MIXED",
        confidence: 64,
        summary: "Impulse cleared the local high but failed to build acceptance above the breakout level.",
        watch: "Reclaim of failed breakout zone.",
      },
      {
        agent: "Flow Agent",
        tone: "DEFENSIVE",
        confidence: 71,
        summary: "Futures volume led the move while spot participation stayed below confirmation threshold.",
        watch: "OI expansion without spot delta.",
      },
      {
        agent: "Narrative Agent",
        tone: "BULLISH",
        confidence: 68,
        summary: "Headline quality was strong enough to create attention, but the story had no resolution inside the window.",
        watch: "Follow-up source confirmation.",
      },
      {
        agent: "Expectation Agent",
        tone: "MIXED",
        confidence: 58,
        summary: "Mock expectation remained elevated, but did not improve after the initial event.",
        watch: "Probability repricing after second source.",
      },
      {
        agent: "Risk Agent",
        tone: "DEFENSIVE",
        confidence: 76,
        summary: "Crowded longs and failed acceptance made chase entries unattractive after the first candle.",
        watch: "Forced unwind below impulse origin.",
      },
    ],
  },
  {
    id: "eth-etf-approval-repricing",
    title: "ETH ETF Approval Repricing",
    symbol: "ETHUSDT",
    eventType: "crypto_policy",
    shockLevel: "high",
    window: "2h replay",
    setup: "ETH repriced after traders shifted from low approval odds to a credible approval path.",
    outcome: "The first move held, then ETH expanded as expectation repricing aligned with spot and derivatives confirmation.",
    verdict: "Narrative Confirmed",
    verdictSummary: "The approval repricing narrative was supported by expectation movement, constructive structure, and controlled leverage.",
    realityCheck: "This replay favors buying confirmation after the reset, not chasing the first headline candle.",
    primaryNarrative: "ETH ETF approval odds repricing",
    narrativeSummary: "Policy expectations moved from skepticism to credible approval, creating a durable ETH-specific repricing event.",
    predictionExpectation: {
      market: "ETH ETF approval odds placeholder",
      expectedProbability: 68,
      actualResolution: "Expectation repriced higher during the replay window",
      note: "Mock expectation snapshot for future prediction market history.",
    },
    derivatives: {
      fundingRate: 0.011,
      openInterestChange: 5.7,
      oiNotional: "$4.2B",
      crowdingRead: "OI expanded with price, but funding stayed below panic-chase levels.",
    },
    risk: {
      level: "MEDIUM",
      summary: "Policy repricing was strong, but late entries still carried gap-risk.",
      invalidation: "Narrative weakens if ETH loses the post-headline reset low with OI still rising.",
      risks: [
        "Policy language can reverse quickly.",
        "ETH beta can fade if BTC does not confirm.",
        "Late longs become vulnerable if approval odds stall.",
      ],
    },
    possibleDrivers: [
      {
        driver: "Approval probability repricing",
        confidence: 86,
        evidence: "Mock expectation probability rose alongside sustained ETH demand.",
      },
      {
        driver: "ETH-specific rotation",
        confidence: 78,
        evidence: "ETH outperformed BTC while news flow stayed policy-focused.",
      },
      {
        driver: "Controlled leverage expansion",
        confidence: 64,
        evidence: "OI increased, but funding remained moderate during continuation.",
      },
    ],
    pricePath: [
      { label: "T-45", price: 3420, volume: 820 },
      { label: "T-30", price: 3448, volume: 900 },
      { label: "T-15", price: 3520, volume: 1480 },
      { label: "T+00", price: 3615, volume: 2310 },
      { label: "T+20", price: 3584, volume: 1680 },
      { label: "T+40", price: 3668, volume: 2040 },
      { label: "T+70", price: 3725, volume: 1880 },
      { label: "T+95", price: 3708, volume: 1420 },
    ],
    events: [
      {
        id: "eth-approval-odds-jump",
        time: "09:10",
        title: "ETH approval odds jump",
        severity: "HIGH",
        description: "Mock policy expectation moves sharply higher and ETH leads the majors.",
      },
      {
        id: "reset-holds",
        time: "09:46",
        title: "Post-headline reset holds",
        severity: "MEDIUM",
        description: "ETH holds the first pullback while BTC remains stable.",
      },
      {
        id: "continuation-confirms",
        time: "10:28",
        title: "Continuation confirms",
        severity: "HIGH",
        description: "Price expands again with OI growth and moderate funding.",
      },
    ],
    news: [
      {
        time: "09:08",
        source: "PolicyDesk",
        headline: "ETH ETF approval chatter reprices after constructive regulator signal",
        sentiment: "positive",
        narrative: "Crypto policy repricing",
      },
      {
        time: "09:42",
        source: "FlowDesk",
        headline: "ETH reset holds as derivatives positioning expands gradually",
        sentiment: "positive",
        narrative: "Healthy continuation",
      },
      {
        time: "10:18",
        source: "RiskDesk",
        headline: "Late ETH longs face headline reversal risk if approval language softens",
        sentiment: "neutral",
        narrative: "Policy risk",
      },
    ],
    agents: [
      {
        agent: "Technical Agent",
        tone: "BULLISH",
        confidence: 80,
        summary: "ETH built acceptance above the impulse zone and defended the first reset.",
        watch: "Higher low above the post-headline base.",
      },
      {
        agent: "Flow Agent",
        tone: "BULLISH",
        confidence: 74,
        summary: "OI growth confirmed participation without funding becoming extreme.",
        watch: "Funding acceleration above continuation zone.",
      },
      {
        agent: "Narrative Agent",
        tone: "BULLISH",
        confidence: 84,
        summary: "Policy narrative and price action reinforced each other through the replay window.",
        watch: "Regulatory source quality.",
      },
      {
        agent: "Expectation Agent",
        tone: "BULLISH",
        confidence: 79,
        summary: "Mock approval probability repriced before the second leg, helping validate the move.",
        watch: "Probability failing to hold above the repricing threshold.",
      },
      {
        agent: "Risk Agent",
        tone: "MIXED",
        confidence: 66,
        summary: "Risk was acceptable after the reset, but poor for late chase entries.",
        watch: "Headline reversal while OI remains elevated.",
      },
    ],
  },
  {
    id: "fomc-expected-hold-low-shock",
    title: "FOMC Expected Hold / Low Shock Event",
    symbol: "BTCUSDT",
    eventType: "macro",
    shockLevel: "low",
    window: "60m replay",
    setup: "The market expected a Fed hold, so the event carried low directional shock unless guidance surprised.",
    outcome: "BTC chopped inside range as macro expectations were already priced.",
    verdict: "Narrative Confirmed",
    verdictSummary: "The expected-hold narrative matched the muted price reaction and stable derivatives profile.",
    realityCheck: "The right tactical read was patience: low shock, low edge, wait for post-event liquidity.",
    primaryNarrative: "Expected FOMC hold with limited shock",
    narrativeSummary: "Macro expectation was already priced, so the event produced volatility compression rather than trend.",
    predictionExpectation: {
      market: "Fed hold probability placeholder",
      expectedProbability: 91,
      actualResolution: "Expected hold realized inside mock replay",
      note: "Mock macro expectation snapshot for future calendar/prediction data.",
    },
    derivatives: {
      fundingRate: 0.004,
      openInterestChange: -0.6,
      oiNotional: "$7.4B",
      crowdingRead: "OI stayed flat-to-lower, indicating no strong directional positioning impulse.",
    },
    risk: {
      level: "LOW",
      summary: "Low shock reduced directional edge and favored range discipline.",
      invalidation: "Risk rises if press-conference language creates dollar or yield shock.",
      risks: [
        "False breakout around statement release.",
        "Low volatility can invite overtrading.",
        "Guidance surprise can arrive after the headline.",
      ],
    },
    possibleDrivers: [
      {
        driver: "Expected policy hold",
        confidence: 88,
        evidence: "Mock expectation probability was already above 90 percent before the event.",
      },
      {
        driver: "Range liquidity behavior",
        confidence: 70,
        evidence: "Price repeatedly reverted toward the pre-event midpoint.",
      },
      {
        driver: "No leverage impulse",
        confidence: 62,
        evidence: "OI and funding remained muted through the window.",
      },
    ],
    pricePath: [
      { label: "T-25", price: 66880, volume: 740 },
      { label: "T-15", price: 66940, volume: 780 },
      { label: "T-05", price: 67120, volume: 1220 },
      { label: "T+00", price: 67010, volume: 1520 },
      { label: "T+10", price: 66890, volume: 1190 },
      { label: "T+25", price: 67040, volume: 980 },
      { label: "T+40", price: 66970, volume: 820 },
      { label: "T+55", price: 67020, volume: 700 },
    ],
    events: [
      {
        id: "fed-hold-priced",
        time: "18:55",
        title: "Fed hold fully priced",
        severity: "LOW",
        description: "Mock expectation layer shows a high probability of no rate change before release.",
      },
      {
        id: "statement-released",
        time: "19:00",
        title: "Statement released with low surprise",
        severity: "MEDIUM",
        description: "BTC briefly widens range but fails to trend.",
      },
      {
        id: "range-reversion",
        time: "19:32",
        title: "Range reversion dominates",
        severity: "LOW",
        description: "Price returns to the event midpoint as derivatives remain calm.",
      },
    ],
    news: [
      {
        time: "18:52",
        source: "MacroDesk",
        headline: "Fed hold nearly fully priced before statement",
        sentiment: "neutral",
        narrative: "Expected macro event",
      },
      {
        time: "19:04",
        source: "MockWire",
        headline: "FOMC statement lands close to consensus",
        sentiment: "neutral",
        narrative: "Low shock policy",
      },
      {
        time: "19:28",
        source: "FlowDesk",
        headline: "Crypto majors stay range-bound after low-surprise Fed decision",
        sentiment: "neutral",
        narrative: "Range compression",
      },
    ],
    agents: [
      {
        agent: "Technical Agent",
        tone: "MIXED",
        confidence: 67,
        summary: "Price stayed inside the pre-event range and did not confirm directional expansion.",
        watch: "Break and acceptance outside event range.",
      },
      {
        agent: "Flow Agent",
        tone: "MIXED",
        confidence: 64,
        summary: "Muted OI and funding suggested little conviction from leveraged traders.",
        watch: "Post-event OI build with range break.",
      },
      {
        agent: "Narrative Agent",
        tone: "MIXED",
        confidence: 76,
        summary: "The low-shock macro narrative matched the muted market reaction.",
        watch: "Press-conference wording that changes the macro read.",
      },
      {
        agent: "Expectation Agent",
        tone: "DEFENSIVE",
        confidence: 83,
        summary: "Expectation was already priced, leaving little room for directional surprise.",
        watch: "Probability divergence before the next macro event.",
      },
      {
        agent: "Risk Agent",
        tone: "DEFENSIVE",
        confidence: 72,
        summary: "Low edge and event noise favored avoiding forced trades.",
        watch: "Fake breakout around calendar timestamps.",
      },
    ],
  },
  {
    id: "funding-overheated-long-squeeze",
    title: "Funding Overheated Long Squeeze",
    symbol: "BTCUSDT",
    eventType: "liquidity",
    shockLevel: "high",
    window: "80m replay",
    setup: "Funding became overheated while price stalled near resistance, creating squeeze risk.",
    outcome: "A failed breakout trapped late longs and triggered a sharp liquidation-driven flush.",
    verdict: "Narrative Confirmed",
    verdictSummary: "The overheated funding warning correctly anticipated a vulnerable long squeeze setup.",
    realityCheck: "The dominant driver was positioning fragility, not a fresh bearish macro or news catalyst.",
    primaryNarrative: "Overheated funding long squeeze",
    narrativeSummary: "Crowded longs paid up for exposure while price failed to accept above resistance.",
    predictionExpectation: {
      market: "Crowded long unwind placeholder",
      expectedProbability: 64,
      actualResolution: "Long squeeze realized after failed breakout",
      note: "Mock expectation snapshot for future positioning expectation history.",
    },
    derivatives: {
      fundingRate: 0.046,
      openInterestChange: -8.9,
      oiNotional: "$10.6B",
      crowdingRead: "Funding was elevated before OI compressed aggressively into the flush.",
    },
    risk: {
      level: "HIGH",
      summary: "Execution risk was extreme for late longs once acceptance failed.",
      invalidation: "Squeeze risk fades only if funding cools while price reclaims resistance with spot support.",
      risks: [
        "Late longs crowded into resistance.",
        "Liquidation cascade can overshoot support.",
        "Shorting after the flush risks reflexive bounce.",
      ],
    },
    possibleDrivers: [
      {
        driver: "Overheated funding",
        confidence: 90,
        evidence: "Funding was elevated before the failed breakout and flush.",
      },
      {
        driver: "Failed resistance acceptance",
        confidence: 82,
        evidence: "Price rejected the breakout zone before liquidation pressure accelerated.",
      },
      {
        driver: "Long liquidation cascade",
        confidence: 79,
        evidence: "OI contracted sharply as price moved lower.",
      },
    ],
    pricePath: [
      { label: "T-35", price: 71320, volume: 1540 },
      { label: "T-25", price: 71680, volume: 1810 },
      { label: "T-15", price: 71840, volume: 2140 },
      { label: "T-05", price: 71710, volume: 2020 },
      { label: "T+05", price: 71180, volume: 2860 },
      { label: "T+20", price: 70420, volume: 3910 },
      { label: "T+40", price: 69960, volume: 3550 },
      { label: "T+65", price: 70340, volume: 2480 },
    ],
    events: [
      {
        id: "funding-overheated",
        time: "22:05",
        title: "Funding overheats near resistance",
        severity: "HIGH",
        description: "Longs pay elevated funding while price struggles to build acceptance.",
      },
      {
        id: "breakout-fails",
        time: "22:22",
        title: "Breakout fails",
        severity: "HIGH",
        description: "Price rejects the resistance shelf and late longs lose momentum support.",
      },
      {
        id: "long-squeeze-confirms",
        time: "22:44",
        title: "Long squeeze confirms",
        severity: "HIGH",
        description: "OI compresses as price flushes through the lower liquidity pocket.",
      },
    ],
    news: [
      {
        time: "22:02",
        source: "FlowWatch",
        headline: "BTC funding reaches overheated zone as price tests resistance",
        sentiment: "negative",
        narrative: "Crowded leverage",
      },
      {
        time: "22:24",
        source: "MockTape",
        headline: "Failed breakout exposes late long positioning",
        sentiment: "negative",
        narrative: "Failed acceptance",
      },
      {
        time: "22:47",
        source: "DerivativesDesk",
        headline: "OI compression confirms liquidation-led BTC flush",
        sentiment: "negative",
        narrative: "Long squeeze",
      },
    ],
    agents: [
      {
        agent: "Technical Agent",
        tone: "BEARISH",
        confidence: 84,
        summary: "Resistance rejection and lower liquidity break confirmed failed acceptance.",
        watch: "Reclaim of failed breakout level.",
      },
      {
        agent: "Flow Agent",
        tone: "DEFENSIVE",
        confidence: 88,
        summary: "Funding and OI behavior strongly supported a positioning-driven flush.",
        watch: "OI rebuild after funding reset.",
      },
      {
        agent: "Narrative Agent",
        tone: "MIXED",
        confidence: 62,
        summary: "No external news was needed; the narrative was internal market crowding.",
        watch: "Traders inventing weak headline explanations after the move.",
      },
      {
        agent: "Expectation Agent",
        tone: "BEARISH",
        confidence: 73,
        summary: "Mock squeeze probability was elevated before the breakdown.",
        watch: "Squeeze expectation falling after funding normalizes.",
      },
      {
        agent: "Risk Agent",
        tone: "DEFENSIVE",
        confidence: 91,
        summary: "Late long risk was unacceptable once price failed to hold above resistance.",
        watch: "Reflexive bounce after liquidation exhaustion.",
      },
    ],
  },
]
