export type SymbolSector =
  | "BTC"
  | "ETH_BETA"
  | "L1"
  | "L2"
  | "MEME"
  | "AI"
  | "RWA"
  | "EXCHANGE"
  | "UNKNOWN"

export interface SymbolContext {
  symbol: string
  base: string
  sector: SymbolSector
  narrative: string
  macroRole: string
  relatedSymbols: string[]
  preferredPanels: string[]
  riskNotes: string[]
}

const contexts: Record<string, SymbolContext> = {
  BTCUSDT: {
    symbol: "BTCUSDT",
    base: "BTC",
    sector: "BTC",
    narrative: "Macro anchor and defensive liquidity benchmark.",
    macroRole: "Risk appetite anchor",
    relatedSymbols: ["ETHUSDT", "SOLUSDT", "BNBUSDT"],
    preferredPanels: ["Liquidity", "Correlation", "Market Map", "Orderbook"],
    riskNotes: ["BTC weakness can trigger beta-sector drawdown.", "Watch DXY/US10Y confirmation."],
  },
  ETHUSDT: {
    symbol: "ETHUSDT",
    base: "ETH",
    sector: "ETH_BETA",
    narrative: "ETH beta and L1 sentiment proxy.",
    macroRole: "Beta confirmation layer",
    relatedSymbols: ["BTCUSDT", "SOLUSDT", "L2"],
    preferredPanels: ["Flow", "ETH/BTC", "Scenario", "Market Map"],
    riskNotes: ["ETH/BTC weakness can invalidate beta continuation.", "Spot confirmation matters more than perp-only strength."],
  },
  SOLUSDT: {
    symbol: "SOLUSDT",
    base: "SOL",
    sector: "L1",
    narrative: "High-beta L1 rotation candidate.",
    macroRole: "Risk-on beta proxy",
    relatedSymbols: ["BTCUSDT", "ETHUSDT", "JUPUSDT"],
    preferredPanels: ["Charts", "Flow", "Narrative", "Rotation"],
    riskNotes: ["High beta can reverse quickly during BTC weakness."],
  },
  BNBUSDT: {
    symbol: "BNBUSDT",
    base: "BNB",
    sector: "EXCHANGE",
    narrative: "Exchange ecosystem and liquidity proxy.",
    macroRole: "CEX ecosystem flow",
    relatedSymbols: ["BTCUSDT", "ETHUSDT"],
    preferredPanels: ["Orderbook", "Liquidity", "Flow"],
    riskNotes: ["Exchange narratives can be event-driven and discontinuous."],
  },
  XRPUSDT: {
    symbol: "XRPUSDT",
    base: "XRP",
    sector: "L1",
    narrative: "Legacy high-liquidity L1 rotation asset.",
    macroRole: "Retail liquidity proxy",
    relatedSymbols: ["BTCUSDT", "ETHUSDT"],
    preferredPanels: ["Charts", "Flow", "Alerts"],
    riskNotes: ["Retail spikes may fade without spot follow-through."],
  },
  DOGEUSDT: {
    symbol: "DOGEUSDT",
    base: "DOGE",
    sector: "MEME",
    narrative: "MEME sector liquidity and retail aggression proxy.",
    macroRole: "Retail risk appetite",
    relatedSymbols: ["BTCUSDT", "PEPEUSDT", "SHIBUSDT"],
    preferredPanels: ["Flow", "Narrative", "Risk"],
    riskNotes: ["MEME exhaustion can precede broader beta weakness."],
  },
  TRXUSDT: {
    symbol: "TRXUSDT",
    base: "TRX",
    sector: "L1",
    narrative: "Stablecoin rails and defensive L1 flow.",
    macroRole: "Defensive liquidity rail",
    relatedSymbols: ["BTCUSDT", "USDT"],
    preferredPanels: ["Liquidity", "Charts", "Orderbook"],
    riskNotes: ["Can decouple from broad beta during defensive migration."],
  },
  HYPEUSDT: {
    symbol: "HYPEUSDT",
    base: "HYPE",
    sector: "EXCHANGE",
    narrative: "Perp-native high-beta exchange ecosystem asset.",
    macroRole: "Speculative perp sentiment",
    relatedSymbols: ["BTCUSDT", "ETHUSDT"],
    preferredPanels: ["Flow", "Orderbook", "Scenario"],
    riskNotes: ["Perp-heavy assets require strict execution confirmation."],
  },
}

export function getSymbolContext(symbol: string): SymbolContext {
  return contexts[symbol] ?? {
    symbol,
    base: symbol.replace("USDT", ""),
    sector: "UNKNOWN",
    narrative: "No specific symbol context is mapped yet.",
    macroRole: "Unknown",
    relatedSymbols: ["BTCUSDT", "ETHUSDT"],
    preferredPanels: ["Charts", "Flow"],
    riskNotes: ["Fallback context. Validate manually."],
  }
}

export function shouldRouteWidget({
  scope,
  widget,
}: {
  scope: string
  widget: "FLOW" | "CHARTS" | "ORDERBOOK" | "ALERTS"
}) {
  return scope === "GLOBAL" || scope === widget
}
