import type { BinanceFuturesTicker24h, MarketMoverCandidate, MarketMoversResponse } from "./types"

function toNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min))
}

function percentileRank(sortedDescending: number[], value: number) {
  if (!sortedDescending.length) return 0
  const index = sortedDescending.findIndex((item) => value >= item)
  const safeIndex = index === -1 ? sortedDescending.length - 1 : index
  return clamp(100 - (safeIndex / Math.max(1, sortedDescending.length - 1)) * 100)
}


const MAJOR_SYMBOLS = new Set([
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "DOGEUSDT",
  "ADAUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "LTCUSDT",
  "BCHUSDT",
  "DOTUSDT",
  "TRXUSDT",
  "NEARUSDT",
  "APTUSDT",
  "ARBUSDT",
  "OPUSDT",
  "SUIUSDT",
  "TONUSDT",
  "UNIUSDT",
  "AAVEUSDT",
  "ETCUSDT",
  "FILUSDT",
])

function getCapTier(symbol: string, liquidityRank: number, quoteVolume: number) {
  if (MAJOR_SYMBOLS.has(symbol)) return "MAJOR" as const
  if (liquidityRank >= 78 || quoteVolume >= 250_000_000) return "LARGE_LIQUID" as const
  return "SPECULATIVE" as const
}

function capTierBoost(tier: ReturnType<typeof getCapTier>) {
  if (tier === "MAJOR") return 16
  if (tier === "LARGE_LIQUID") return 9
  return -5
}

function formatVolume(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return `${Math.round(value)}`
}

function quoteSymbol(symbol: string) {
  return symbol.replace(/USDT$/, "")
}

function formatPrice(price: number) {
  if (!Number.isFinite(price) || price <= 0) return "n/a"
  if (price >= 1000) return price.toFixed(1)
  if (price >= 100) return price.toFixed(2)
  if (price >= 10) return price.toFixed(3)
  if (price >= 1) return price.toFixed(4)
  return price.toPrecision(4)
}

function rangeText(a: number, b: number) {
  const low = Math.min(a, b)
  const high = Math.max(a, b)
  return `${formatPrice(low)} ~ ${formatPrice(high)}`
}


function classifyMarketRegime(input: { absPct: number; dayRangePct: number; chaseRisk: number; tradeabilityScore: number; liquidityRank: number }) {
  const { absPct, dayRangePct, chaseRisk, tradeabilityScore, liquidityRank } = input
  if (chaseRisk >= 82 || absPct >= 18) {
    return { marketRegime: "EXHAUSTED" as const, regimeNote: "Late extension. Require reset before meaningful size." }
  }
  if (dayRangePct >= 12) {
    return { marketRegime: "HIGH_VOL" as const, regimeNote: "Wide 24h range. Use smaller size and wider SL." }
  }
  if (absPct >= 6 && tradeabilityScore >= 62) {
    return { marketRegime: "TRENDING" as const, regimeNote: "Directional flow is active. Prefer pullback continuation." }
  }
  if (absPct >= 2.2 && liquidityRank >= 65) {
    return { marketRegime: "BREAKOUT" as const, regimeNote: "Liquid market is waking up. Wait for reclaim/rejection confirmation." }
  }
  return { marketRegime: "CHOPPY" as const, regimeNote: "No clean trend pressure. Keep size light or wait." }
}

function buildPositionSizing(input: { slDistancePct: number; planQuality: string; chaseRisk: number; capTier: string; action: string }) {
  if (input.action === "AVOID" || input.planQuality === "NO_TRADE" || input.slDistancePct <= 0) {
    return { riskPct: 0, suggestedPositionPct: 0, maxLossPlan: "No position until reset." }
  }
  const riskPct = input.chaseRisk >= 72 || input.planQuality === "WIDE_RISK"
    ? 0.35
    : input.capTier === "MAJOR" && input.planQuality === "BALANCED"
      ? 0.75
      : 0.5
  const suggestedPositionPct = clamp((riskPct / input.slDistancePct) * 100, 2, input.capTier === "SPECULATIVE" ? 18 : 35)
  return {
    riskPct: Number(riskPct.toFixed(2)),
    suggestedPositionPct: Number(suggestedPositionPct.toFixed(1)),
    maxLossPlan: `Risk ${riskPct.toFixed(2)}% account; approx ${suggestedPositionPct.toFixed(1)}% notional if using this SL.`,
  }
}

function makePlans(input: {
  symbol: string
  pct: number
  score: number
  chaseRisk: number
  lastPrice: number
  highPrice: number
  lowPrice: number
  liquidityRank: number
  capTier: ReturnType<typeof getCapTier>
  tradeabilityScore: number
}) {
  const { symbol, pct, score, chaseRisk, lastPrice, highPrice, lowPrice, liquidityRank, capTier, tradeabilityScore } = input
  const absPct = Math.abs(pct)
  const direction = pct > 1.25 ? "LONG" as const : pct < -1.25 ? "SHORT" as const : "NEUTRAL" as const
  const extension = absPct >= 18 ? "extended" : absPct >= 9 ? "active" : "developing"
  const pullbackPct = absPct >= 18 ? "4–7%" : absPct >= 10 ? "2.5–5%" : "1.5–3%"
  const setup = chaseRisk >= 72
    ? "Mean reversion watch" as const
    : capTier !== "SPECULATIVE" && absPct >= 2.2 && absPct < 8
      ? "Liquid large-cap watch" as const
      : absPct >= 8
        ? "Pullback continuation" as const
        : "Breakout continuation" as const
  const action = direction === "NEUTRAL"
    ? "WAIT" as const
    : score >= 68 && chaseRisk < 76 && (liquidityRank >= 55 || capTier !== "SPECULATIVE")
      ? "WATCH" as const
      : chaseRisk >= 78
        ? "AVOID" as const
        : "WAIT" as const
  const grade = score >= 78 ? "A" as const : score >= 62 ? "B" as const : "C" as const

  const p = lastPrice > 0 ? lastPrice : 1
  const isLong = direction === "LONG"
  const isShort = direction === "SHORT"

  // Trade Plan Quality Pass:
  // Build levels from current volatility instead of fixed arbitrary offsets.
  // 24h high/low is not a perfect ATR, but it is available from the ticker scan and
  // keeps the discovery layer lightweight without new API calls.
  const dayRangePct = highPrice > 0 && lowPrice > 0 && highPrice > lowPrice
    ? clamp(((highPrice - lowPrice) / p) * 100, 1.2, 28)
    : clamp(Math.max(2, absPct * 0.65), 1.2, 18)
  const liquidityTightener = capTier === "MAJOR" ? 0.82 : capTier === "LARGE_LIQUID" ? 0.95 : 1.15
  const chaseExpander = chaseRisk >= 72 ? 1.25 : chaseRisk >= 55 ? 1.08 : 0.94
  const basePullback = clamp(dayRangePct * 0.18 * liquidityTightener * chaseExpander, 0.009, 0.07)
  const stopDistance = clamp(dayRangePct * 0.22 * liquidityTightener * chaseExpander, 0.012, 0.09)
  const rewardOne = clamp(stopDistance * 1.25, 0.018, 0.12)
  const rewardTwo = clamp(stopDistance * 2.05, 0.03, 0.18)

  const entryLow = isLong ? p * (1 - basePullback * 1.12) : isShort ? p * (1 + basePullback * 0.62) : p * (1 - basePullback * 0.55)
  const entryHigh = isLong ? p * (1 - basePullback * 0.48) : isShort ? p * (1 + basePullback * 1.18) : p * (1 + basePullback * 0.55)
  const entryAnchor = isLong ? Math.min(entryLow, entryHigh) : isShort ? Math.max(entryLow, entryHigh) : p
  const sl = isLong ? entryAnchor * (1 - stopDistance) : isShort ? entryAnchor * (1 + stopDistance) : p * (1 - stopDistance * 0.75)
  const tp1 = isLong ? Math.max(entryLow, entryHigh) * (1 + rewardOne) : isShort ? Math.min(entryLow, entryHigh) * (1 - rewardOne) : p * (1 + rewardOne * 0.7)
  const tp2 = isLong ? Math.max(entryLow, entryHigh) * (1 + rewardTwo) : isShort ? Math.min(entryLow, entryHigh) * (1 - rewardTwo) : p * (1 + rewardTwo)
  const entryMid = (Math.min(entryLow, entryHigh) + Math.max(entryLow, entryHigh)) / 2
  const riskDistance = Math.abs(entryMid - sl)
  const tp1Distance = Math.abs(tp1 - entryMid)
  const tp2Distance = Math.abs(tp2 - entryMid)
  const tp1R = riskDistance > 0 ? tp1Distance / riskDistance : 0
  const tp2R = riskDistance > 0 ? tp2Distance / riskDistance : 0
  const slDistancePct = entryMid > 0 ? (riskDistance / entryMid) * 100 : 0
  const planQuality = action === "AVOID"
    ? "NO_TRADE" as const
    : tp1R >= 1.05 && tp2R >= 1.65 && slDistancePct >= 0.9 && slDistancePct <= 8.5
      ? "BALANCED" as const
      : slDistancePct < 0.9
        ? "SL_TOO_TIGHT" as const
        : tp1R < 0.95
          ? "POOR_RR" as const
          : "WIDE_RISK" as const

  const { marketRegime, regimeNote } = classifyMarketRegime({ absPct, dayRangePct, chaseRisk, tradeabilityScore, liquidityRank })
  const sizing = buildPositionSizing({ slDistancePct, planQuality, chaseRisk, capTier, action })

  const bias = direction === "LONG"
    ? "LONG BIAS"
    : direction === "SHORT"
      ? "SHORT BIAS"
      : "NEUTRAL BIAS"
  const entryZone = action === "AVOID"
    ? "No entry; wait for reset"
    : direction === "LONG"
      ? `${rangeText(entryLow, entryHigh)} pullback/reclaim`
      : direction === "SHORT"
        ? `${rangeText(entryLow, entryHigh)} bounce/rejection`
        : `${rangeText(entryLow, entryHigh)} only after direction confirms`
  const stopLoss = action === "AVOID"
    ? "No trade"
    : direction === "LONG"
      ? `below ${formatPrice(sl)}`
      : direction === "SHORT"
        ? `above ${formatPrice(sl)}`
        : `outside ${rangeText(sl, tp1)}`
  const takeProfit1 = action === "AVOID" ? "No trade" : formatPrice(tp1)
  const takeProfit2 = action === "AVOID" ? "No trade" : formatPrice(tp2)

  return {
    direction,
    bias,
    action,
    setup,
    grade,
    entryZone,
    stopLoss,
    takeProfit1,
    takeProfit2,
    pullbackGuide: `${extension} move; prefer ${pullbackPct} reset before sizing. Volatility-adjusted range: ${dayRangePct.toFixed(1)}%.`,
    entryPlan: action === "WATCH"
      ? `${quoteSymbol(symbol)} ${direction.toLowerCase()} framework: wait for ${entryZone}.`
      : action === "AVOID"
        ? `Do not chase. Wait for a full reset or failed extension first.`
        : `Keep on watchlist; wait for entry zone and flow confirmation.`,
    sizePlan: planQuality === "NO_TRADE"
      ? "No size until reset."
      : chaseRisk >= 70 || planQuality === "WIDE_RISK"
        ? "Starter size only; reduce leverage and add only after confirmation."
        : planQuality === "SL_TOO_TIGHT"
          ? "Use smaller size or wait for a cleaner entry; SL is tight for current volatility."
          : "Small starter, then add on trigger confirmation.",
    trigger: direction === "LONG"
      ? "15m reclaim + volume stays above baseline"
      : direction === "SHORT"
        ? "15m rejection + seller follow-through"
        : "directional reclaim/rejection must appear first",
    invalidation: stopLoss,
    planQuality,
    riskReward: `TP1 ${tp1R.toFixed(1)}R / TP2 ${tp2R.toFixed(1)}R`,
    slDistancePct: Number(slDistancePct.toFixed(2)),
    volatilityNote: `24h range ${dayRangePct.toFixed(1)}%; SL distance ${slDistancePct.toFixed(1)}%.`,
    marketRegime,
    regimeNote,
    riskPct: sizing.riskPct,
    suggestedPositionPct: sizing.suggestedPositionPct,
    maxLossPlan: sizing.maxLossPlan,
    setupSnapshotText: `${symbol} ${bias} · ${setup} · Entry ${entryZone} · SL ${stopLoss} · TP ${takeProfit1}/${takeProfit2} · ${sizing.maxLossPlan}`,
    numericPlan: {
      side: direction,
      detectedPrice: p,
      entryLow: Math.min(entryLow, entryHigh),
      entryHigh: Math.max(entryLow, entryHigh),
      stopLoss: sl,
      takeProfit1: tp1,
      takeProfit2: tp2,
    },
  }
}


function freshnessFor(absMove: number, chaseRisk: number, qualityState: string) {
  if (qualityState === "TOO_LATE" || chaseRisk >= 80 || absMove >= 18) return "LATE" as const
  if (absMove >= 10 || chaseRisk >= 65) return "MATURE" as const
  if (absMove >= 2.5) return "DEVELOPING" as const
  return "FRESH" as const
}

function buildScoreBreakdown(input: {
  capTier: ReturnType<typeof getCapTier>
  liquidityRank: number
  participationRank: number
  volatilityRank: number
  absMove: number
  chaseRisk: number
  tradeabilityScore: number
  isLargeCapWatch: boolean
}) {
  const { capTier, liquidityRank, participationRank, volatilityRank, absMove, chaseRisk, tradeabilityScore, isLargeCapWatch } = input
  const items = [
    { label: capTier === "MAJOR" ? "Major asset liquidity" : capTier === "LARGE_LIQUID" ? "Large liquid market" : "Speculative asset penalty", value: capTier === "MAJOR" ? 16 : capTier === "LARGE_LIQUID" ? 9 : -5, polarity: capTier === "SPECULATIVE" ? "negative" as const : "positive" as const },
    { label: "24h quote volume rank", value: Math.round((liquidityRank - 50) * 0.28), polarity: liquidityRank >= 55 ? "positive" as const : "negative" as const },
    { label: "Participation / trade count", value: Math.round((participationRank - 50) * 0.2), polarity: participationRank >= 55 ? "positive" as const : "negative" as const },
    { label: "Volatility attention", value: Math.round(Math.min(volatilityRank, 90) * 0.12), polarity: volatilityRank >= 45 ? "positive" as const : "neutral" as const },
    { label: "Tradeability score", value: Math.round((tradeabilityScore - 50) * 0.22), polarity: tradeabilityScore >= 58 ? "positive" as const : "negative" as const },
    { label: "Chase / late extension risk", value: -Math.round(chaseRisk * 0.18), polarity: chaseRisk >= 55 ? "negative" as const : "neutral" as const },
    { label: isLargeCapWatch ? "Large-cap watch boost" : "No large-cap boost", value: isLargeCapWatch ? 8 : 0, polarity: isLargeCapWatch ? "positive" as const : "neutral" as const },
    { label: absMove >= 18 ? "Overextended move" : absMove >= 2 ? "Directional move detected" : "Weak direction", value: absMove >= 18 ? -10 : absMove >= 2 ? 5 : -6, polarity: absMove >= 18 ? "negative" as const : absMove >= 2 ? "positive" as const : "negative" as const },
  ]

  return items
    .filter((item) => item.value !== 0)
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, 6)
}

function trustSummaryFor(input: { grade: string; confidence: string; freshness: string; chaseRisk: number; capTier: string }) {
  const parts = [`${input.grade} grade`, `${input.confidence.toLowerCase()} confidence`, input.freshness.toLowerCase()]
  if (input.capTier === "MAJOR" || input.capTier === "LARGE_LIQUID") parts.push("liquid")
  if (input.chaseRisk >= 70) parts.push("chase risk")
  return parts.join(" · ")
}

function normalizeFocusSymbol(symbol?: string | null) {
  if (!symbol) return null
  const cleaned = symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return null
  return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`
}

export function buildMarketMoversResponse(raw: BinanceFuturesTicker24h[], now = new Date(), focusSymbol?: string | null): MarketMoversResponse {
  const filtered = raw
    .filter((item) => item.symbol?.endsWith("USDT"))
    .filter((item) => !item.symbol.includes("_"))
    .filter((item) => !/(UP|DOWN|BULL|BEAR)USDT$/.test(item.symbol))
    .map((item) => ({
      item,
      pct: toNumber(item.priceChangePercent),
      quoteVolume: toNumber(item.quoteVolume),
      volume: toNumber(item.volume),
      count: toNumber(item.count),
      lastPrice: toNumber(item.lastPrice),
      highPrice: toNumber(item.highPrice),
      lowPrice: toNumber(item.lowPrice),
    }))
    .filter((row) => row.quoteVolume > 8_000_000 && row.count > 1500 && row.lastPrice > 0)

  const quoteVolumes = filtered.map((row) => row.quoteVolume).sort((a, b) => b - a)
  const volatility = filtered.map((row) => Math.abs(row.pct)).sort((a, b) => b - a)
  const counts = filtered.map((row) => row.count).sort((a, b) => b - a)

  function classifyQuality(input: {
    capTier: ReturnType<typeof getCapTier>
    liquidityRank: number
    volatilityRank: number
    participationRank: number
    absMove: number
    chaseRisk: number
    score: number
    tradeabilityScore: number
  }) {
    const { capTier, liquidityRank, volatilityRank, participationRank, absMove, chaseRisk, score, tradeabilityScore } = input
    if (absMove < 0.9) return { state: "NO_DIRECTION" as const, reason: "Move is not directional enough yet." }
    if (liquidityRank < 28 && capTier === "SPECULATIVE") return { state: "LOW_LIQUIDITY" as const, reason: "Liquidity is too thin for a clean setup." }
    if (chaseRisk >= 82 || (absMove >= 18 && capTier === "SPECULATIVE")) return { state: "TOO_LATE" as const, reason: "Move is extended; avoid chasing late expansion." }
    if (score >= 70 && tradeabilityScore >= 64 && liquidityRank >= 42 && participationRank >= 35) return { state: "ACTIONABLE" as const, reason: "Liquidity, participation, and movement are aligned." }
    if (capTier !== "SPECULATIVE" && liquidityRank >= 68 && absMove >= 1.1) return { state: "WATCHLIST" as const, reason: "Large-cap liquidity is active; wait for a cleaner trigger." }
    if (volatilityRank >= 72 && liquidityRank >= 48 && chaseRisk < 76) return { state: "WATCHLIST" as const, reason: "Attention is building, but execution quality is not confirmed." }
    return { state: "NO_DIRECTION" as const, reason: "No clean execution edge yet." }
  }

  function confidenceFor(score: number, tradeabilityScore: number, chaseRisk: number) {
    if (score >= 78 && tradeabilityScore >= 72 && chaseRisk < 68) return "HIGH" as const
    if (score >= 64 && tradeabilityScore >= 58 && chaseRisk < 78) return "MEDIUM" as const
    return "LOW" as const
  }

  const candidates: MarketMoverCandidate[] = filtered.map((row) => {
    const liquidityRank = percentileRank(quoteVolumes, row.quoteVolume)
    const volatilityRank = percentileRank(volatility, Math.abs(row.pct))
    const participationRank = percentileRank(counts, row.count)
    const capTier = getCapTier(row.item.symbol, liquidityRank, row.quoteVolume)
    const absMove = Math.abs(row.pct)
    const attentionScore = clamp(
      liquidityRank * 0.42 +
      volatilityRank * 0.22 +
      participationRank * 0.24 +
      Math.min(absMove, 14) * 0.32 +
      capTierBoost(capTier),
    )
    const speculativePenalty = capTier === "SPECULATIVE" && absMove >= 10 ? 12 : 0
    const thinLiquidityPenalty = capTier === "SPECULATIVE" && liquidityRank < 38 ? 14 : 0
    const overExtensionPenalty = absMove >= 20 ? 18 : absMove >= 14 ? 9 : 0
    const chaseRisk = clamp(Math.max(0, absMove - 6.5) * 5.4 + Math.max(0, volatilityRank - liquidityRank) * 0.42 + speculativePenalty + overExtensionPenalty)
    const largeCapWatchBoost = capTier !== "SPECULATIVE" && liquidityRank >= 65 && absMove >= 1.1 ? 12 : 0
    const tradeabilityScore = clamp(liquidityRank * 0.5 + participationRank * 0.28 + Math.min(volatilityRank, 85) * 0.16 - chaseRisk * 0.26 + (capTier !== "SPECULATIVE" ? 8 : 0))
    const score = clamp(attentionScore + tradeabilityScore * 0.35 - chaseRisk * 0.3 + (liquidityRank > 72 ? 7 : 0) + largeCapWatchBoost - thinLiquidityPenalty)
    const quality = classifyQuality({ capTier, liquidityRank, volatilityRank, participationRank, absMove, chaseRisk, score, tradeabilityScore })
    const confidence = confidenceFor(score, tradeabilityScore, chaseRisk)
    const plans = makePlans({
      symbol: row.item.symbol,
      pct: row.pct,
      score,
      chaseRisk,
      lastPrice: row.lastPrice,
      highPrice: row.highPrice,
      lowPrice: row.lowPrice,
      liquidityRank,
      capTier,
      tradeabilityScore,
    })
    const suppressedReason = quality.state === "ACTIONABLE" || quality.state === "WATCHLIST"
      ? undefined
      : quality.reason
    const isLargeCapWatch = capTier !== "SPECULATIVE" && liquidityRank >= 65
    const freshness = freshnessFor(absMove, chaseRisk, quality.state)
    const scoreBreakdown = buildScoreBreakdown({ capTier, liquidityRank, participationRank, volatilityRank, absMove, chaseRisk, tradeabilityScore, isLargeCapWatch })
    const trustSummary = trustSummaryFor({ grade: plans.grade, confidence, freshness, chaseRisk, capTier })

    return {
      symbol: row.item.symbol,
      direction: plans.direction,
      action: plans.action,
      setup: suppressedReason ? "No clean setup" : plans.setup,
      score: Math.round(score),
      grade: plans.grade,
      priceChangePercent: Number(row.pct.toFixed(2)),
      quoteVolume: Math.round(row.quoteVolume),
      volume: Math.round(row.volume),
      tradeCount: row.count,
      lastPrice: row.lastPrice,
      liquidityRank: Math.round(liquidityRank),
      capTier,
      isLargeCapWatch,
      volatilityRank: Math.round(volatilityRank),
      participationRank: Math.round(participationRank),
      attentionScore: Math.round(attentionScore),
      chaseRisk: Math.round(chaseRisk),
      tradeabilityScore: Math.round(tradeabilityScore),
      qualityState: quality.state,
      qualityReason: quality.reason,
      confidence,
      freshness,
      scoreBreakdown,
      trustSummary,
      bias: plans.bias,
      entryZone: plans.entryZone,
      stopLoss: plans.stopLoss,
      takeProfit1: plans.takeProfit1,
      takeProfit2: plans.takeProfit2,
      numericPlan: plans.numericPlan,
      planQuality: plans.planQuality,
      riskReward: plans.riskReward,
      slDistancePct: plans.slDistancePct,
      volatilityNote: plans.volatilityNote,
      marketRegime: plans.marketRegime,
      regimeNote: plans.regimeNote,
      riskPct: plans.riskPct,
      suggestedPositionPct: plans.suggestedPositionPct,
      maxLossPlan: plans.maxLossPlan,
      setupSnapshotText: plans.setupSnapshotText,
      pullbackGuide: plans.pullbackGuide,
      entryPlan: plans.entryPlan,
      sizePlan: plans.sizePlan,
      trigger: plans.trigger,
      invalidation: plans.invalidation,
      reason: `${row.item.symbol} has ${row.pct >= 0 ? "+" : ""}${row.pct.toFixed(2)}% 24h move with ${formatVolume(row.quoteVolume)} USDT turnover${capTier !== "SPECULATIVE" ? " and large-cap liquidity" : ""}.`,
      suppressedReason,
    }
  })

  const sorted = candidates.sort((a, b) => b.score - a.score)
  const normalizedFocus = normalizeFocusSymbol(focusSymbol)
  const focusCandidate = normalizedFocus
    ? sorted.find((item) => item.symbol === normalizedFocus) ?? null
    : null
  const actionable = sorted
    .filter((item) => item.qualityState === "ACTIONABLE" && item.action !== "AVOID")
    .sort((a, b) => b.tradeabilityScore - a.tradeabilityScore || b.score - a.score)
  const watchlist = sorted
    .filter((item) => item.qualityState === "WATCHLIST" && item.action !== "AVOID")
    .sort((a, b) => b.liquidityRank - a.liquidityRank || b.score - a.score)
  const topActionable = actionable.slice(0, 1)
  const largeCapWatch = watchlist
    .filter((item) => item.isLargeCapWatch)
    .filter((item) => !topActionable.some((top) => top.symbol === item.symbol))
    .slice(0, 3)
  const tradable = [...topActionable, ...largeCapWatch].slice(0, 4)
  const suppressed = sorted.filter((item) => item.suppressedReason || item.action === "AVOID").slice(0, 8)
  const strongest = tradable[0]

  return {
    ok: true,
    source: "binance-usdm-24hr-ticker",
    mode: "live-discovery",
    updatedAt: now.toISOString(),
    scanIntervalMs: 60000,
    candidates: tradable,
    suppressed,
    focusSymbol: normalizedFocus,
    focusCandidate,
    summary: {
      scanned: filtered.length,
      tradable: tradable.length,
      largeCapWatch: largeCapWatch.length,
      filterMode: "quality-first",
      strongestSymbol: strongest?.symbol ?? null,
      attention: strongest
        ? `${strongest.symbol} passed quality filter; ${strongest.bias.toLowerCase()} with ${strongest.confidence.toLowerCase()} confidence.`
        : "Market is moving, but no high-quality setup passed the quality filter.",
    },
    notes: [
      "Quality-first discovery: the scanner runs in the background and only surfaces liquid, non-chase setups.",
    ],
  }
}

export function buildFallbackMarketMoversResponse(message: string): MarketMoversResponse {
  return {
    ok: false,
    source: "binance-usdm-24hr-ticker",
    mode: "fallback",
    updatedAt: new Date().toISOString(),
    scanIntervalMs: 60000,
    candidates: [],
    suppressed: [],
    focusSymbol: null,
    focusCandidate: null,
    summary: {
      scanned: 0,
      tradable: 0,
      largeCapWatch: 0,
      filterMode: "quality-first",
      strongestSymbol: null,
      attention: "Discovery scan unavailable; keep default execution in wait mode.",
    },
    notes: [message],
  }
}
