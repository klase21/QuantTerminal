import type { HistoricalCandle } from "@/lib/historical-backfill/types"
import { validateHistoricalCandles } from "@/lib/historical-backfill/validation"

export function serializeHistoricalCandles(candles: readonly HistoricalCandle[]): string {
  return JSON.stringify(candles)
}

export function deserializeHistoricalCandles(value: string): readonly HistoricalCandle[] | null {
  try {
    const parsed = JSON.parse(value)
    if (!Array.isArray(parsed)) return null
    const validation = validateHistoricalCandles(parsed as HistoricalCandle[])
    return validation.valid ? Object.freeze(parsed.map((item) => Object.freeze(item))) : null
  } catch {
    return null
  }
}
