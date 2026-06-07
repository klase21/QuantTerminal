import type { SnapshotCandle } from "@/lib/share/exportSetupSnapshot"

const DEFAULT_INTERVAL = "15m"
const DEFAULT_LIMIT = 180

function normalizeSymbol(symbol: string) {
  return symbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function parseKlineRows(rows: unknown): SnapshotCandle[] {
  if (!Array.isArray(rows)) return []

  return rows
    .map((row) => {
      if (!Array.isArray(row)) return null
      const candle: SnapshotCandle = {
        time: Math.floor(Number(row[0]) / 1000),
        open: Number(row[1]),
        high: Number(row[2]),
        low: Number(row[3]),
        close: Number(row[4]),
      }
      return Number.isFinite(candle.time) &&
        Number.isFinite(candle.open) &&
        Number.isFinite(candle.high) &&
        Number.isFinite(candle.low) &&
        Number.isFinite(candle.close)
        ? candle
        : null
    })
    .filter((item): item is SnapshotCandle => Boolean(item))
}

export async function resolveSnapshotCandles(symbol: string, interval = DEFAULT_INTERVAL, limit = DEFAULT_LIMIT): Promise<SnapshotCandle[]> {
  const normalized = normalizeSymbol(symbol)
  if (!normalized) return []

  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${encodeURIComponent(normalized)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) return []

  const rows = await response.json()
  return parseKlineRows(rows).slice(-limit)
}
