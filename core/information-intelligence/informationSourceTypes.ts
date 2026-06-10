export type InformationSourceCategory =
  | "news"
  | "social"
  | "research"
  | "prediction_market"
  | "exchange"
  | "macro"
  | "onchain"

export type InformationSourceProvider =
  | "coinness"
  | "jinse"
  | "x"
  | "reddit"
  | "etf_flow"
  | "polymarket"
  | "kalshi"
  | "exchange_announcement"
  | "macro_calendar"
  | "onchain_provider"
  | "manual"
  | "unknown"

export type InformationSourceAccessMode = "manual" | "mock" | "adapter_pending" | "api" | "web" | "stream"
export type InformationSourceVerificationMode = "unverified" | "single_source" | "corroborated" | "official" | "market_priced"

export interface InformationSourceClassification {
  provider: InformationSourceProvider
  category: InformationSourceCategory
  displayName: string
  accessMode: InformationSourceAccessMode
  verificationMode: InformationSourceVerificationMode
  expectedStrengths: string[]
  expectedWeaknesses: string[]
  defaultReputationScore: number
}

export const informationSourceClassifications: InformationSourceClassification[] = [
  {
    provider: "coinness",
    category: "news",
    displayName: "Coinness",
    accessMode: "adapter_pending",
    verificationMode: "single_source",
    expectedStrengths: ["fast crypto news", "exchange and policy headlines"],
    expectedWeaknesses: ["headline compression", "needs corroboration"],
    defaultReputationScore: 68,
  },
  {
    provider: "jinse",
    category: "news",
    displayName: "Jinse",
    accessMode: "adapter_pending",
    verificationMode: "single_source",
    expectedStrengths: ["Asia crypto coverage", "policy and exchange flow"],
    expectedWeaknesses: ["translation ambiguity", "regional narrative bias"],
    defaultReputationScore: 64,
  },
  {
    provider: "x",
    category: "social",
    displayName: "X",
    accessMode: "adapter_pending",
    verificationMode: "unverified",
    expectedStrengths: ["speed", "narrative formation", "expert threads"],
    expectedWeaknesses: ["rumor propagation", "engagement manipulation"],
    defaultReputationScore: 48,
  },
  {
    provider: "reddit",
    category: "social",
    displayName: "Reddit",
    accessMode: "adapter_pending",
    verificationMode: "unverified",
    expectedStrengths: ["community disagreement", "retail attention"],
    expectedWeaknesses: ["lagging consensus", "subreddit selection bias"],
    defaultReputationScore: 46,
  },
  {
    provider: "etf_flow",
    category: "research",
    displayName: "ETF Flow",
    accessMode: "adapter_pending",
    verificationMode: "corroborated",
    expectedStrengths: ["institutional flow context", "daily demand signal"],
    expectedWeaknesses: ["delayed publication", "not always causal intraday"],
    defaultReputationScore: 76,
  },
  {
    provider: "polymarket",
    category: "prediction_market",
    displayName: "Polymarket",
    accessMode: "adapter_pending",
    verificationMode: "market_priced",
    expectedStrengths: ["crowd expectation", "probability changes", "money-backed disagreement"],
    expectedWeaknesses: ["liquidity constraints", "market framing bias"],
    defaultReputationScore: 72,
  },
  {
    provider: "kalshi",
    category: "prediction_market",
    displayName: "Kalshi",
    accessMode: "adapter_pending",
    verificationMode: "market_priced",
    expectedStrengths: ["regulated event market context", "macro expectation"],
    expectedWeaknesses: ["limited market coverage", "contract framing bias"],
    defaultReputationScore: 74,
  },
  {
    provider: "exchange_announcement",
    category: "exchange",
    displayName: "Exchange Announcement",
    accessMode: "adapter_pending",
    verificationMode: "official",
    expectedStrengths: ["official listings", "delistings", "maintenance", "regulatory notices"],
    expectedWeaknesses: ["venue-specific", "may arrive after positioning"],
    defaultReputationScore: 82,
  },
]

