import type { MacroSignalInput } from "./macroReasoningEngine"
import type { TacticalOpportunityCandidate } from "./tacticalOpportunityRouter"
import type { TacticalVerdictInput } from "./tacticalVerdictEngine"

type AnyRecord = Record<string, any>

export type TacticalLiveAdapterInput = {
  symbol: string
  ticker?: AnyRecord | null
  tickers?: AnyRecord[]
  orderbook?: {
    bids?: Array<{ price?: number; quantity?: number; qty?: number }>
    asks?: Array<{ price?: number; quantity?: number; qty?: number }>
    spread?: number
    imbalance?: number
  } | null
  flow?: AnyRecord | null
  liquidations?: AnyRecord[]
  scoredSectors?: AnyRecord[]
}

export type TacticalLiveAdapterResult = {
  symbol: string
  brainInput: TacticalVerdictInput
  opportunityCandidates: TacticalOpportunityCandidate[]
  macroInput: MacroSignalInput
  freshness: {
    hasTicker: boolean
    hasOrderbook: boolean
    hasFlow: boolean
    hasLiquidations: boolean
    hasRotation: boolean
  }
}

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return 50
  return Math.min(max, Math.max(min, value))
}

function num(value: unknown, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function normalizeSymbol(symbol: string) {
  return (symbol || "BTCUSDT").replace("/", "").toUpperCase()
}

function getTickerForSymbol(tickers: AnyRecord[] = [], symbol: string, direct?: AnyRecord | null) {
  const key = normalizeSymbol(symbol)
  if (direct && normalizeSymbol(String(direct.symbol ?? key)) === key) return direct
  return tickers.find((ticker) => normalizeSymbol(String(ticker.symbol ?? "")) === key) ?? direct ?? null
}

function sumDepth(levels?: Array<{ price?: number; quantity?: number; qty?: number }>) {
  return (levels ?? []).slice(0, 10).reduce((sum, level) => sum + num(level.quantity ?? level.qty, 0), 0)
}

function deriveLiquidityScore(orderbook: TacticalLiveAdapterInput["orderbook"], ticker?: AnyRecord | null) {
  if (!orderbook) return 50
  const bestBid = num(orderbook.bids?.[0]?.price, 0)
  const bestAsk = num(orderbook.asks?.[0]?.price, 0)
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : num(ticker?.price ?? ticker?.lastPrice, 0)
  const spread = num(orderbook.spread, bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0)
  const spreadPct = mid > 0 ? (spread / mid) * 100 : 0.04
  const bidDepth = sumDepth(orderbook.bids)
  const askDepth = sumDepth(orderbook.asks)
  const depthScore = clamp(Math.log10(Math.max(1, bidDepth + askDepth)) * 20, 20, 85)
  const spreadScore = clamp(100 - spreadPct * 900, 20, 95)
  return Math.round(clamp(spreadScore * 0.62 + depthScore * 0.38))
}

function deriveExecutionScore(orderbook: TacticalLiveAdapterInput["orderbook"], liquidityScore: number, volatilityScore: number) {
  const imbalanceRaw = num(orderbook?.imbalance, 0)
  const imbalance = Math.abs(imbalanceRaw) <= 1 ? Math.abs(imbalanceRaw) * 100 : Math.abs(imbalanceRaw)
  const imbalancePenalty = imbalance > 75 ? 12 : imbalance > 55 ? 6 : 0
  const volatilityPenalty = volatilityScore > 72 ? 12 : volatilityScore > 62 ? 6 : 0
  return Math.round(clamp(liquidityScore * 0.72 + 28 - imbalancePenalty - volatilityPenalty))
}

function deriveFlowScore(flow?: AnyRecord | null) {
  if (!flow) return 52
  const buyPressure = num(flow.buyPressure, NaN)
  if (Number.isFinite(buyPressure)) return Math.round(clamp(buyPressure))
  const buy = num(flow.buyVolume, 0)
  const sell = num(flow.sellVolume, 0)
  const total = buy + sell
  if (total <= 0) return 52
  return Math.round(clamp((buy / total) * 100))
}

function deriveLiquidationPressure(liquidations: AnyRecord[] = [], symbol: string) {
  const key = normalizeSymbol(symbol)
  const relevant = liquidations.filter((item) => {
    const itemSymbol = normalizeSymbol(String(item.symbol ?? item.s ?? key))
    return !item.symbol || itemSymbol === key
  })
  const sizeScore = relevant.slice(0, 20).reduce((sum, item) => {
    const qty = num(item.quantity ?? item.qty ?? item.q, 0)
    const price = num(item.price ?? item.p, 1)
    return sum + Math.log10(Math.max(1, qty * price)) * 4
  }, 0)
  return Math.round(clamp(relevant.length * 5 + sizeScore, 25, 92))
}

function deriveRotationScore(scoredSectors: AnyRecord[] = []) {
  if (!scoredSectors.length) return 50
  const values = scoredSectors
    .map((sector) => num(sector.score ?? sector.rotationScore ?? sector.momentum ?? sector.total ?? sector.strength, NaN))
    .filter(Number.isFinite)
  if (!values.length) return 50
  const top = values.sort((a, b) => b - a).slice(0, 3)
  return Math.round(clamp(top.reduce((a, b) => a + b, 0) / top.length))
}

function deriveScoresForTicker({
  symbol,
  ticker,
  orderbook,
  flow,
  liquidations,
  scoredSectors,
}: TacticalLiveAdapterInput): TacticalVerdictInput {
  const change = num(ticker?.change24h ?? ticker?.priceChangePercent ?? ticker?.P, 0)
  const volume = num(ticker?.volume24h ?? ticker?.quoteVolume ?? ticker?.q, 0)
  const absChange = Math.abs(change)
  const liquidityScore = deriveLiquidityScore(orderbook, ticker)
  const volatilityScore = Math.round(clamp(38 + absChange * 5.5 + Math.log10(Math.max(1, volume)) * 1.3, 30, 92))
  const trendScore = Math.round(clamp(50 + change * 3.2, 15, 88))
  const momentumScore = Math.round(clamp(50 + change * 4.1 + (volume > 0 ? Math.log10(volume) - 6 : 0) * 2.4, 15, 90))
  const flowScore = deriveFlowScore(flow)
  const executionScore = deriveExecutionScore(orderbook, liquidityScore, volatilityScore)
  const rotationScore = deriveRotationScore(scoredSectors)
  const liquidationPressure = deriveLiquidationPressure(liquidations, symbol)

  return {
    trendScore,
    momentumScore,
    executionScore,
    liquidityScore,
    volatilityScore,
    flowScore,
    rotationScore,
    liquidationPressure,
    fundingPressure: 35,
    macroRiskScore: 50,
  }
}

function candidateLabel(symbol: string) {
  const normalized = normalizeSymbol(symbol)
  if (normalized === "BTCUSDT") return "BTC"
  if (normalized === "ETHUSDT") return "ETH"
  if (normalized === "SOLUSDT") return "SOL"
  if (normalized === "BNBUSDT") return "BNB"
  if (normalized === "XRPUSDT") return "XRP"
  if (normalized === "DOGEUSDT") return "DOGE"
  return normalized.replace("USDT", "")
}

export function buildTacticalLiveAdapter(input: TacticalLiveAdapterInput): TacticalLiveAdapterResult {
  const symbol = normalizeSymbol(input.symbol)
  const ticker = getTickerForSymbol(input.tickers, symbol, input.ticker)
  const brainInput = deriveScoresForTicker({ ...input, symbol, ticker })

  const preferred = [symbol, "BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"]
  const tickerSymbols = (input.tickers ?? [])
    .map((item) => normalizeSymbol(String(item.symbol ?? "")))
    .filter((item) => item.endsWith("USDT"))

  const candidateSymbols = Array.from(new Set([...preferred, ...tickerSymbols])).slice(0, 8)
  const opportunityCandidates = candidateSymbols.map((candidateSymbol): TacticalOpportunityCandidate => {
    const candidateTicker = getTickerForSymbol(input.tickers, candidateSymbol, candidateSymbol === symbol ? ticker : null)
    const scores = deriveScoresForTicker({
      ...input,
      symbol: candidateSymbol,
      ticker: candidateTicker,
      orderbook: candidateSymbol === symbol ? input.orderbook : null,
      flow: candidateSymbol === symbol ? input.flow : null,
    })

    return {
      symbol: candidateSymbol,
      label: candidateLabel(candidateSymbol),
      scores,
    }
  })

  const macroInput: MacroSignalInput = {
    dxyChange: 0,
    us10yChange: 0,
    nasdaqChange: (num(ticker?.change24h, 0) / 100) * 0.6,
    btcDominanceChange: symbol === "BTCUSDT" ? 0 : -Math.max(-0.3, Math.min(0.3, num(ticker?.change24h, 0) / 100)),
    stablecoinLiquidityScore: brainInput.liquidityScore,
    cryptoBetaScore: clamp((brainInput.trendScore + brainInput.momentumScore + brainInput.flowScore) / 3),
  }

  return {
    symbol,
    brainInput,
    opportunityCandidates,
    macroInput,
    freshness: {
      hasTicker: Boolean(ticker),
      hasOrderbook: Boolean(input.orderbook?.bids?.length && input.orderbook?.asks?.length),
      hasFlow: Boolean(input.flow?.lastUpdate || input.flow?.trades?.length),
      hasLiquidations: Boolean(input.liquidations?.length),
      hasRotation: Boolean(input.scoredSectors?.length),
    },
  }
}
