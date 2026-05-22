import type {
  MarketRegime,
  MarketRegimeName,
  RegimeInput,
  RegimeSignal,
  RiskState,
  TrendState,
  UpbitDataLabSnapshot,
  VolatilityState,
} from "@/types/intelligence"

const fallbackSnapshot: UpbitDataLabSnapshot = {
  timestamp: Date.now(),
  marketCapT: 3556.43,
  marketCapChange24h: -0.3,
  tradeVolume24hT: 1.19,
  tradeVolumeChange24h: 28.37,
  fearGreed: 49,
  fearGreedChange: 0,
  btcDominance: 64.78,
  ethDominance: 10.69,
  stableDominance: 11.98,
  altSeasonIndex: 29,
  technicalScore: 40,
  marketReturn: 0.12,
  risingAssetRatio: 61.69,
  upbitPremium: -1.45,
  upbitPremiumChange: -0.41,
  volatility: 17.49,
  volatilityChange: -0.09,
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function trendFrom(value: number, deadZone = 0.15): TrendState {
  if (value > deadZone) return "UP"
  if (value < -deadZone) return "DOWN"
  return "FLAT"
}

function volatilityState(volatility: number): VolatilityState {
  if (volatility >= 45) return "EXTREME"
  if (volatility >= 28) return "HIGH"
  if (volatility >= 14) return "MID"
  return "LOW"
}

function buildSignal(
  label: string,
  value: string | number,
  weight: number,
  direction: RegimeSignal["direction"]
): RegimeSignal {
  return { label, value, weight, direction }
}

function pickRegime(args: {
  btcStrength: number
  altStrength: number
  retailFomoScore: number
  riskOnScore: number
  volatility: number
  premium: number
  volumeChange: number
}): MarketRegimeName {
  const {
    btcStrength,
    altStrength,
    retailFomoScore,
    riskOnScore,
    volatility,
    premium,
    volumeChange,
  } = args

  if (retailFomoScore >= 72 && volumeChange > 20 && premium > 0) {
    return "KOREAN_RETAIL_FOMO"
  }

  if (altStrength >= 72 && volatility >= 25) {
    return "ALT_EUPHORIA"
  }

  if (altStrength >= 55 && riskOnScore >= 55) {
    return "ALT_EXPANSION"
  }

  if (btcStrength >= 65 && altStrength < 45) {
    return "BTC_DEFENSIVE"
  }

  if (riskOnScore <= 35) {
    return "RISK_OFF"
  }

  return "NEUTRAL_ROTATION"
}

function regimeSummary(regime: MarketRegimeName) {
  switch (regime) {
    case "BTC_DEFENSIVE":
      return "BTC 중심의 방어적 로테이션. 알트 확산보다 대형 자산 선호가 우세합니다."
    case "ALT_EXPANSION":
      return "알트 참여율이 확장되는 구간. 섹터별 거래대금 이동을 추적할 가치가 큽니다."
    case "ALT_EUPHORIA":
      return "알트 과열 구간. 수익률은 강하지만 변동성 확대와 분배 리스크를 같이 봐야 합니다."
    case "KOREAN_RETAIL_FOMO":
      return "한국 리테일 주도 FOMO 가능성. 업비트 거래대금과 프리미엄 급변을 우선 감시하세요."
    case "RISK_OFF":
      return "리스크오프 압력이 우세합니다. 스테이블/비트코인 선호와 거래량 위축을 확인하세요."
    default:
      return "뚜렷한 한쪽 방향보다 순환 장세가 우세합니다. 섹터별 상대강도 변화가 중요합니다."
  }
}

export function calculateMarketRegime(input: RegimeInput = {}): MarketRegime {
  const snapshot = {
    ...fallbackSnapshot,
    ...input.snapshot,
    timestamp: input.snapshot?.timestamp || Date.now(),
  }

  const topSector = input.sectorScores?.[0]
  const sectorLeadership = topSector?.rotationScore ?? 50

  const altStrength = clamp(
    snapshot.altSeasonIndex * 0.55 +
      snapshot.risingAssetRatio * 0.25 +
      sectorLeadership * 0.2
  )

  const btcStrength = clamp(
    snapshot.btcDominance * 0.9 +
      Math.max(0, 50 - snapshot.altSeasonIndex) * 0.5
  )

  const liquidityScore = clamp(
    50 + snapshot.tradeVolumeChange24h * 0.8
  )

  const technicalScore = clamp(snapshot.technicalScore)

  const retailFomoScore = clamp(
    35 +
      Math.max(0, snapshot.tradeVolumeChange24h) * 0.7 +
      Math.max(0, snapshot.upbitPremium) * 4 +
      Math.max(0, snapshot.altSeasonIndex - 50) * 0.55 +
      Math.max(0, snapshot.fearGreed - 55) * 0.6
  )

  const riskOnScore = clamp(
    altStrength * 0.35 +
      liquidityScore * 0.25 +
      technicalScore * 0.2 +
      snapshot.fearGreed * 0.2 -
      Math.max(0, snapshot.stableDominance - 12) * 1.4
  )

  const regime = pickRegime({
    btcStrength,
    altStrength,
    retailFomoScore,
    riskOnScore,
    volatility: snapshot.volatility,
    premium: snapshot.upbitPremium,
    volumeChange: snapshot.tradeVolumeChange24h,
  })

  const riskState: RiskState =
    riskOnScore >= 58
      ? "RISK_ON"
      : riskOnScore <= 38
      ? "RISK_OFF"
      : "NEUTRAL"

  const signals: RegimeSignal[] = [
    buildSignal("BTC dominance", `${snapshot.btcDominance.toFixed(2)}%`, btcStrength, btcStrength > 60 ? "bearish" : "neutral"),
    buildSignal("Alt season", `${snapshot.altSeasonIndex}/100`, altStrength, altStrength > 55 ? "bullish" : "neutral"),
    buildSignal("Upbit volume", `${snapshot.tradeVolumeChange24h.toFixed(2)}%`, liquidityScore, snapshot.tradeVolumeChange24h > 0 ? "bullish" : "bearish"),
    buildSignal("Upbit premium", `${snapshot.upbitPremium.toFixed(2)}%`, retailFomoScore, snapshot.upbitPremium > 0 ? "bullish" : "neutral"),
    buildSignal("Technical breadth", `${snapshot.technicalScore}/100`, technicalScore, technicalScore >= 55 ? "bullish" : technicalScore <= 35 ? "bearish" : "neutral"),
  ]

  if (topSector) {
    signals.push(
      buildSignal(
        `Leading sector: ${topSector.sector}`,
        `${topSector.rotationScore.toFixed(0)}`,
        topSector.rotationScore,
        topSector.rotationScore >= 60 ? "bullish" : "neutral"
      )
    )
  }

  const confidence = clamp(
    45 +
      Math.abs(riskOnScore - 50) * 0.45 +
      Math.abs(altStrength - btcStrength) * 0.22 +
      Math.max(0, liquidityScore - 50) * 0.12 +
      Math.max(0, sectorLeadership - 50) * 0.15
  )

  return {
    regime,
    confidence: Number(confidence.toFixed(0)),
    riskState,
    riskOnScore: Number(riskOnScore.toFixed(1)),
    altStrength: Number(altStrength.toFixed(1)),
    btcStrength: Number(btcStrength.toFixed(1)),
    retailFomoScore: Number(retailFomoScore.toFixed(1)),
    volatilityState: volatilityState(snapshot.volatility),
    liquidityState: trendFrom(snapshot.tradeVolumeChange24h),
    summary: regimeSummary(regime),
    signals,
    updatedAt: Date.now(),
  }
}
