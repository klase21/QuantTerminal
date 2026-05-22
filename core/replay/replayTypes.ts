export type ReplayWindow = "30D" | "90D" | "180D"

export interface HistoricalSnapshot {
  date: string
  fearGreed: number | null
  volatility: number | null
  altSeason: number | null
  btcDominance: number | null
  premium: number | null
  tradeVolume: number | null
}

export interface ReplayFrame extends HistoricalSnapshot {
  index: number
  regime: string
  temperature: number
  alertCount: number
}
