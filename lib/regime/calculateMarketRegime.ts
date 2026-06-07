import type { Ticker } from "@/types/market"

export type MarketRegimeId =
  | "ALT_ROTATION"
  | "BTC_DEFENSIVE"
  | "RISK_ON"
  | "RISK_OFF"
  | "MIXED"

export interface DataLabHistoryPoint {
  date?: string
  value: number
}

export interface DataLabHistoryMetric {
  key: string
  label: string
  current: number | null
  change7d: number | null
  change30d: number | null
  acceleration: number | null
  percentile: number | null
  direction: "UP" | "DOWN" | "FLAT" | "UNKNOWN"
  coverage: string
  points: DataLabHistoryPoint[]
}

export interface UpbitDataLabSnapshot {
  ok?: boolean
  source?: string
  updatedAt?: string
  fearGreed?: number | null
  altSeason?: number | null
  btcDominance?: number | null
  premium?: number | null
  tradeVolumeTrend?: number | null
  volatility?: number | null
  history?: Record<string, DataLabHistoryMetric>
  notes?: string[]
}

export interface RegimeFactor {
  label: string
  value: number
  status: "hot" | "warm" | "cold" | "neutral"
  description: string
}

export interface SectorPulse {
  sector: string
  score: number
  direction: "up" | "down" | "flat"
  reason: string
}

export interface LiquidityRotationSignal {
  sector: string
  rank: number
  score: number
  confidence: number
  direction: "INFLOW" | "OUTFLOW" | "CHURN" | "QUIET"
  volumePressure: number
  volatility: number
  priceChange: number
  triggerCount: number
  action: string
  interpretation: string
  evidence: string[]
}

export interface RegimeStoryboardItem {
  title: string
  detail: string
}

export interface AlertCandidate {
  title: string
  severity: "info" | "watch" | "high"
  confidence: number
  reason: string
  promoteWhen: string
}

export interface RegimeDecisionStep {
  label: string
  value: string
  impact: "bullish" | "bearish" | "neutral"
  detail: string
}

export interface MarketRegimeSnapshot {
  regime: MarketRegimeId
  title: string
  confidence: number
  temperature: number
  summary: string
  factors: RegimeFactor[]
  sectors: SectorPulse[]
  liquidityRotations: LiquidityRotationSignal[]
  storyboard: RegimeStoryboardItem[]
  checklist: string[]
  signals: string[]
  alertCandidates: AlertCandidate[]
  decisionSteps: RegimeDecisionStep[]
  nextBestAction: string
  dataLab?: UpbitDataLabSnapshot
}

const SECTOR_KEYWORDS: Record<string, string[]> = {
  AI: ["TAO", "FET", "RNDR", "NEAR", "WLD", "ARKM"],
  MEME: ["DOGE", "SHIB", "PEPE", "BONK", "FLOKI", "WIF"],
  L1: ["BTC", "ETH", "SOL", "BNB", "ADA", "AVAX", "SUI"],
  DEFI: ["UNI", "AAVE", "MKR", "ENA", "LDO", "CRV"],
  RWA: ["ONDO", "PENDLE", "LINK", "OM", "POLYX"],
  GAMING: ["IMX", "GALA", "SAND", "MANA", "AXS"],
}

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Number.isFinite(value) ? value : 0))

const average = (values: number[]) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const asScore = (value?: number | null, fallback = 50) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback
  return clamp(value)
}

const getTickerChange = (ticker?: Ticker) =>
  typeof ticker?.change24h === "number" ? ticker.change24h : 0

const getQuoteVolume = (ticker?: Ticker) => {
  if (!ticker) return 0
  return ticker.quoteVolume || ticker.volume || 0
}

export function calculateMarketRegime(
  tickerMap: Record<string, Ticker>,
  dataLab?: UpbitDataLabSnapshot | null
): MarketRegimeSnapshot {
  const tickers = Object.values(tickerMap)
  const btc = tickerMap.BTCUSDT || tickerMap.btcusdt
  const eth = tickerMap.ETHUSDT || tickerMap.ethusdt

  const marketChanges = tickers.map(getTickerChange)
  const positiveRatio = tickers.length
    ? tickers.filter((ticker) => getTickerChange(ticker) > 0).length /
      tickers.length
    : 0

  const avgChange = average(marketChanges)
  const btcChange = getTickerChange(btc)
  const ethChange = getTickerChange(eth)

  const altTickers = tickers.filter(
    (ticker) => !["BTCUSDT", "ETHUSDT", "btcusdt", "ethusdt"].includes(ticker.symbol)
  )
  const avgAltChange = average(altTickers.map(getTickerChange))

  const totalVolume = tickers.reduce(
    (sum, ticker) => sum + getQuoteVolume(ticker),
    0
  )
  const btcVolumeShare = totalVolume
    ? (getQuoteVolume(btc) / totalVolume) * 100
    : 32

  const altBreadth = clamp(positiveRatio * 100)
  const altVsBtc = avgAltChange - btcChange
  const ethVsBtc = ethChange - btcChange

  const fearGreed = asScore(dataLab?.fearGreed)
  const altSeason = asScore(dataLab?.altSeason)
  const btcDominance = asScore(dataLab?.btcDominance, btcVolumeShare)
  const premiumScore = clamp(50 + (dataLab?.premium ?? 0) * 8)
  const volumeTrendScore = clamp(50 + (dataLab?.tradeVolumeTrend ?? 0))
  const volatilityScore = asScore(dataLab?.volatility)
  const hasDataLab = Boolean(dataLab?.ok)

  const tickerRiskAppetite = clamp(
    50 + avgChange * 7 + altVsBtc * 4 + (altBreadth - 50) * 0.45
  )
  const tickerBtcDefense = clamp(
    45 + btcVolumeShare * 0.7 + (btcChange - avgAltChange) * 6
  )
  const tickerRotationHeat = clamp(
    50 + altVsBtc * 7 + ethVsBtc * 4 + (altBreadth - 50) * 0.35
  )

  const riskAppetite = hasDataLab
    ? clamp(tickerRiskAppetite * 0.5 + fearGreed * 0.18 + altSeason * 0.18 + premiumScore * 0.08 + volumeTrendScore * 0.06)
    : tickerRiskAppetite

  const btcDefensivePressure = hasDataLab
    ? clamp(tickerBtcDefense * 0.55 + btcDominance * 0.35 + (100 - altSeason) * 0.1)
    : tickerBtcDefense

  const rotationHeat = hasDataLab
    ? clamp(tickerRotationHeat * 0.55 + altSeason * 0.25 + premiumScore * 0.1 + volumeTrendScore * 0.1)
    : tickerRotationHeat

  const temperature = clamp(
    riskAppetite * 0.38 + rotationHeat * 0.34 + altBreadth * 0.16 + volatilityScore * 0.12
  )

  let regime: MarketRegimeId = "MIXED"
  let title = "Mixed Rotation"
  let summary = "Market signals are mixed. Use this tab as a sandbox before promoting anything to the main dashboard."

  if (riskAppetite > 68 && rotationHeat > 62) {
    regime = "ALT_ROTATION"
    title = "Alt Rotation"
    summary = hasDataLab
      ? "Ticker breadth and Upbit DataLab inputs are leaning toward alt participation. Test sector leadership before promotion."
      : "Alt breadth and relative strength are leading BTC. Rotation experiments should focus on sector leadership."
  } else if (btcDefensivePressure > 70 && rotationHeat < 52) {
    regime = "BTC_DEFENSIVE"
    title = "BTC Defensive"
    summary = "BTC is absorbing relative attention while alt participation is weaker. Watch for defensive capital concentration."
  } else if (riskAppetite > 64 && altBreadth > 58) {
    regime = "RISK_ON"
    title = "Risk On Expansion"
    summary = "Participation is broad and momentum is positive. This is the cleanest condition for flow/radar visual tests."
  } else if (riskAppetite < 38 && altBreadth < 42) {
    regime = "RISK_OFF"
    title = "Risk Off Compression"
    summary = "Breadth is weak and risk appetite is compressed. Alerts should be more defensive than aggressive."
  }

  const confidence = clamp(
    Math.max(
      Math.abs(riskAppetite - 50),
      Math.abs(rotationHeat - 50),
      Math.abs(btcDefensivePressure - 50)
    ) * 1.45 + 38 + (hasDataLab ? 5 : 0)
  )

  const sectorStats = Object.entries(SECTOR_KEYWORDS).map(([sector, keywords]) => {
    const matches = tickers.filter((ticker) =>
      keywords.some((keyword) => ticker.symbol.toUpperCase().includes(keyword))
    )
    const change = average(matches.map(getTickerChange))
    const volume = matches.reduce((sum, ticker) => sum + getQuoteVolume(ticker), 0)
    const volumeShare = totalVolume ? (volume / totalVolume) * 100 : 0
    const volumeBoost = totalVolume ? (volume / totalVolume) * 120 : 0
    const sectorVolatility = average(matches.map((ticker) => Math.abs(getTickerChange(ticker))))
    const matchedBreadth = matches.length
      ? (matches.filter((ticker) => getTickerChange(ticker) > 0).length / matches.length) * 100
      : 0

    return {
      sector,
      matches,
      change,
      volume,
      volumeShare,
      volumeBoost,
      sectorVolatility,
      matchedBreadth,
    }
  })

  const sectorScores = sectorStats.map((stat) => {
    const score = clamp(50 + stat.change * 8 + stat.volumeBoost)

    return {
      sector: stat.sector,
      score: Math.round(score),
      direction:
        score > 58 ? "up" : score < 43 ? "down" : "flat",
      reason:
        stat.matches.length > 0
          ? `${stat.matches.length} matched symbols · avg ${stat.change.toFixed(2)}% · vol share ${stat.volumeShare.toFixed(2)}%`
          : "waiting for matching symbols",
    } satisfies SectorPulse
  })

  const sectorCount = Math.max(sectorStats.length, 1)
  const neutralVolumeShare = 100 / sectorCount
  const globalVolatilityContext = hasDataLab ? volatilityScore : 50

  const liquidityRotations = sectorStats
    .map((stat) => {
      const volumePressure = clamp((stat.volumeShare / neutralVolumeShare) * 50)
      const sectorVolatilityScore = clamp(stat.sectorVolatility * 10 + globalVolatilityContext * 0.25)
      const priceMomentumScore = clamp(50 + stat.change * 8)
      const breadthBonus = clamp(stat.matchedBreadth)
      const score = clamp(
        volumePressure * 0.45 +
          sectorVolatilityScore * 0.3 +
          priceMomentumScore * 0.2 +
          breadthBonus * 0.05
      )

      const triggers = [
        {
          active: volumePressure >= 55,
          text: `Volume pressure ${volumePressure.toFixed(2)} is above sector baseline`,
        },
        {
          active: sectorVolatilityScore >= 50,
          text: `Volatility ${sectorVolatilityScore.toFixed(2)} is expanding`,
        },
        {
          active: Math.abs(stat.change) >= 1,
          text: `Price moved ${stat.change.toFixed(2)}%`,
        },
        {
          active: stat.matchedBreadth >= 50,
          text: `Breadth ${stat.matchedBreadth.toFixed(2)}% is supportive`,
        },
      ].filter((trigger) => trigger.active)

      let direction: LiquidityRotationSignal["direction"] = "QUIET"
      let action = "Observe only"
      let interpretation = "Low sector liquidity pressure. Keep it as background context."

      if (score > 58 && stat.change > 1) {
        direction = "INFLOW"
        action = "Promote to inflow watch"
        interpretation = "Volume concentration, volatility, and price action are aligned to the upside."
      } else if (score > 58 && stat.change < -1) {
        direction = "OUTFLOW"
        action = "Promote to risk alert"
        interpretation = "High activity with negative price action. Treat as distribution or panic flow."
      } else if (score > 52 && Math.abs(stat.change) <= 1) {
        direction = "CHURN"
        action = "Watch for breakout confirmation"
        interpretation = "Liquidity is active but price is not directional yet. Watch for accumulation or handoff."
      }

      const confidence = clamp(score * 0.68 + triggers.length * 8)

      return {
        sector: stat.sector,
        rank: 0,
        score: Number(score.toFixed(2)),
        confidence: Number(confidence.toFixed(2)),
        direction,
        volumePressure: Number(volumePressure.toFixed(2)),
        volatility: Number(sectorVolatilityScore.toFixed(2)),
        priceChange: Number(stat.change.toFixed(2)),
        triggerCount: triggers.length,
        action,
        interpretation,
        evidence: triggers.length ? triggers.map((trigger) => trigger.text) : ["No confirmed liquidity trigger yet"],
      } satisfies LiquidityRotationSignal
    })
    .sort((a, b) => b.score - a.score)
    .map((item, index) => ({ ...item, rank: index + 1 }))

  const sortedSectors = [...sectorScores].sort((a, b) => b.score - a.score)
  const leadingSector = sortedSectors[0]
  const leadingLiquidity = liquidityRotations[0]
  const weakestSector = [...sectorScores].sort((a, b) => a.score - b.score)[0]

  const storyboard: RegimeStoryboardItem[] = [
    {
      title: regime === "BTC_DEFENSIVE" ? "BTC absorbs attention" : regime === "RISK_OFF" ? "Risk compression starts" : "Breadth expands",
      detail: regime === "BTC_DEFENSIVE"
        ? "Capital is concentrating around BTC relative strength and volume share."
        : regime === "RISK_OFF"
          ? "Weak breadth and falling momentum suggest defensive alert rules first."
          : "More symbols are participating, so rotation visuals become more meaningful.",
    },
    {
      title: hasDataLab ? "Upbit context applied" : "Waiting for Upbit context",
      detail: hasDataLab
        ? "DataLab factors now influence risk appetite, BTC defense, rotation heat, and alert confidence."
        : "The lab still works from ticker data, but DataLab premium/breadth will improve the regional signal.",
    },
    {
      title: `${leadingSector?.sector ?? "Sector"} leads radar`,
      detail: `${leadingSector?.sector ?? "Leading sector"} currently has the strongest experimental sector pulse. Compare this with Upbit volume acceleration later.`,
    },
  ]

  const decisionSteps: RegimeDecisionStep[] = [
    {
      label: "Breadth",
      value: `${Math.round(altBreadth)}% positive`,
      impact: altBreadth > 58 ? "bullish" : altBreadth < 42 ? "bearish" : "neutral",
      detail: altBreadth > 58
        ? "Participation is broad enough for rotation visuals to matter."
        : altBreadth < 42
          ? "Too few assets are participating, so aggressive rotation alerts should be muted."
          : "Breadth is not decisive yet.",
    },
    {
      label: "Upbit DataLab",
      value: hasDataLab ? `FG ${Math.round(fearGreed)} · Alt ${Math.round(altSeason)} · BTC.D ${Math.round(btcDominance)}` : "not connected",
      impact: hasDataLab && altSeason > 60 ? "bullish" : hasDataLab && btcDominance > 65 ? "bearish" : "neutral",
      detail: hasDataLab
        ? "Regional context is included in the regime score. Keep it inside this tab until values are verified against the DataLab UI."
        : "The live connector did not return usable DataLab values yet; scenario mode remains available for visual testing.",
    },
    {
      label: "Relative Strength",
      value: `Alt vs BTC ${altVsBtc.toFixed(2)} pts`,
      impact: altVsBtc > 1.5 ? "bullish" : altVsBtc < -1.5 ? "bearish" : "neutral",
      detail: altVsBtc > 1.5
        ? "Alts are outperforming BTC, supporting sector rotation experiments."
        : altVsBtc < -1.5
          ? "BTC is stronger than the alt basket, supporting defensive interpretation."
          : "Alt/BTC spread is too small to call a clean rotation.",
    },
    {
      label: "BTC Concentration",
      value: `${Math.round(btcVolumeShare)}% ticker volume share`,
      impact: btcDefensivePressure > 68 ? "bearish" : btcDefensivePressure < 42 ? "bullish" : "neutral",
      detail: btcDefensivePressure > 68
        ? "BTC is absorbing liquidity, so broad alt alerts need confirmation."
        : "BTC concentration is not blocking rotation tests.",
    },
  ]

  const alertCandidates: AlertCandidate[] = [
    {
      title: regime === "BTC_DEFENSIVE" ? "BTC Defensive Rotation" : `${leadingSector?.sector ?? "Sector"} Rotation Watch`,
      severity: confidence > 72 ? "watch" : "info",
      confidence: Math.round(clamp(Math.abs(rotationHeat - btcDefensivePressure) + 35 + (hasDataLab ? 8 : 0))),
      reason: `Rotation heat ${Math.round(rotationHeat)} vs BTC defense ${Math.round(btcDefensivePressure)} shows how close the system is to switching regimes.`,
      promoteWhen: "Promote when regime changes between two consecutive snapshots and confidence stays above 65%.",
    },
    {
      title: "Upbit Regional Context",
      severity: hasDataLab ? "watch" : "info",
      confidence: hasDataLab ? Math.round(clamp((premiumScore + altSeason + volumeTrendScore) / 3)) : 35,
      reason: hasDataLab
        ? "Premium, altseason, and volume context are now part of this lab snapshot."
        : "Connector is present, but no confirmed DataLab snapshot is available yet.",
      promoteWhen: "Promote only after values match DataLab screenshots/API responses for at least one live session.",
    },
    {
      title: "Risk Compression Guard",
      severity: regime === "RISK_OFF" ? "high" : "info",
      confidence: Math.round(clamp(100 - riskAppetite + volatilityScore * 0.2)),
      reason: "Prevents euphoric alerts when breadth is weak or volatility is expanding into drawdown.",
      promoteWhen: "Promote when it successfully suppresses false positive rotation alerts.",
    },
    {
      title: leadingLiquidity ? `${leadingLiquidity.sector} Liquidity ${leadingLiquidity.direction}` : "Liquidity Rotation Watch",
      severity: leadingLiquidity?.direction === "OUTFLOW" ? "high" : leadingLiquidity && leadingLiquidity.score > 58 ? "watch" : "info",
      confidence: Math.round(clamp(leadingLiquidity?.confidence ?? 35)),
      reason: leadingLiquidity
        ? `${leadingLiquidity.sector} ranks #${leadingLiquidity.rank} with score ${leadingLiquidity.score.toFixed(2)} and ${leadingLiquidity.triggerCount} active trigger(s).`
        : "Waiting for enough sector liquidity data.",
      promoteWhen: "Promote when the same sector remains #1 for two snapshots or its confidence stays above 65%.",
    },
  ]

  const nextBestAction = regime === "ALT_ROTATION"
    ? `Test ${leadingSector?.sector ?? "leading sector"} inflow alert copy and radar animation in this tab only.`
    : regime === "BTC_DEFENSIVE"
      ? "Prioritize defensive BTC concentration alert copy before adding new Sankey visuals."
      : regime === "RISK_OFF"
        ? "Keep alerts defensive and test panic/compression UI states only."
        : hasDataLab
          ? "Compare DataLab-influenced score with raw ticker score before promoting to any main dashboard component."
          : "Keep collecting snapshots; do not promote to the main dashboard until confidence improves."

  const checklist = [
    "Verify Upbit DataLab values against UI screenshots before trusting live mode.",
    "Store 1h/4h snapshots so rotation velocity is real, not static.",
    "Store sector snapshots so liquidity matrix can compare current pressure against true 1h/4h baselines.",
    "Promote only the best card to DashboardLayout after visual review.",
    "Keep Sankey changes isolated until sector flow confidence is stable.",
  ]

  return {
    regime,
    title,
    confidence: Math.round(confidence),
    temperature: Math.round(temperature),
    summary,
    factors: [
      {
        label: "Risk Appetite",
        value: Math.round(riskAppetite),
        status: riskAppetite > 65 ? "hot" : riskAppetite < 40 ? "cold" : "neutral",
        description: hasDataLab
          ? "Blends ticker momentum with DataLab fear/greed, altseason, premium, and volume trend."
          : "Composite of 24h momentum, breadth, and alt relative strength.",
      },
      {
        label: "Alt Breadth",
        value: Math.round(altBreadth),
        status: altBreadth > 60 ? "hot" : altBreadth < 40 ? "cold" : "neutral",
        description: "Share of tracked symbols trading positive on the day.",
      },
      {
        label: "Rotation Heat",
        value: Math.round(rotationHeat),
        status: rotationHeat > 62 ? "hot" : rotationHeat < 42 ? "cold" : "neutral",
        description: hasDataLab
          ? "Alt/ETH strength plus Upbit altseason, premium, and volume trend."
          : "Alt and ETH relative performance versus BTC.",
      },
      {
        label: "BTC Defense",
        value: Math.round(btcDefensivePressure),
        status: btcDefensivePressure > 68 ? "warm" : btcDefensivePressure < 42 ? "cold" : "neutral",
        description: hasDataLab
          ? "BTC volume concentration plus DataLab BTC dominance context."
          : "BTC volume concentration and BTC relative strength.",
      },
    ],
    sectors: sortedSectors,
    liquidityRotations,
    storyboard,
    checklist,
    signals: [
      `BTC 24h: ${btcChange.toFixed(2)}%`,
      `ETH/BTC relative: ${ethVsBtc.toFixed(2)} pts`,
      `Average alt change: ${avgAltChange.toFixed(2)}%`,
      `Positive breadth: ${Math.round(altBreadth)}%`,
      hasDataLab
        ? `DataLab: FG ${Math.round(fearGreed)} · Alt ${Math.round(altSeason)} · Premium ${(dataLab?.premium ?? 0).toFixed(2)}%`
        : "DataLab: waiting for live snapshot",
    ],
    alertCandidates,
    decisionSteps,
    nextBestAction,
    dataLab: dataLab || undefined,
  }
}
