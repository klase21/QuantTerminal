import type { UpbitDataLabSnapshot } from "@/types/intelligence"

export const fallbackUpbitDataLabSnapshot: UpbitDataLabSnapshot = {
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

function n(value: unknown, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function normalizeUpbitDataLabSnapshot(raw: any): UpbitDataLabSnapshot {
  const source = raw?.data || raw?.result || raw || {}
  const fallback = fallbackUpbitDataLabSnapshot

  return {
    timestamp: n(source.timestamp, Date.now()),
    marketCapT: n(source.marketCapT ?? source.market_cap_t, fallback.marketCapT),
    marketCapChange24h: n(source.marketCapChange24h ?? source.market_cap_change_24h, fallback.marketCapChange24h),
    tradeVolume24hT: n(source.tradeVolume24hT ?? source.trade_volume_24h_t, fallback.tradeVolume24hT),
    tradeVolumeChange24h: n(source.tradeVolumeChange24h ?? source.trade_volume_change_24h, fallback.tradeVolumeChange24h),
    fearGreed: n(source.fearGreed ?? source.fear_greed, fallback.fearGreed),
    fearGreedChange: n(source.fearGreedChange ?? source.fear_greed_change, fallback.fearGreedChange),
    btcDominance: n(source.btcDominance ?? source.btc_dominance, fallback.btcDominance),
    ethDominance: n(source.ethDominance ?? source.eth_dominance, fallback.ethDominance),
    stableDominance: n(source.stableDominance ?? source.stable_dominance, fallback.stableDominance),
    altSeasonIndex: n(source.altSeasonIndex ?? source.alt_season_index, fallback.altSeasonIndex),
    technicalScore: n(source.technicalScore ?? source.technical_score, fallback.technicalScore),
    marketReturn: n(source.marketReturn ?? source.market_return, fallback.marketReturn),
    risingAssetRatio: n(source.risingAssetRatio ?? source.rising_asset_ratio, fallback.risingAssetRatio),
    upbitPremium: n(source.upbitPremium ?? source.upbit_premium, fallback.upbitPremium),
    upbitPremiumChange: n(source.upbitPremiumChange ?? source.upbit_premium_change, fallback.upbitPremiumChange),
    volatility: n(source.volatility, fallback.volatility),
    volatilityChange: n(source.volatilityChange ?? source.volatility_change, fallback.volatilityChange),
  }
}
