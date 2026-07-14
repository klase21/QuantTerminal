export interface OpenInterestSourceRow {
  readonly observedAt: string
  readonly sourceTimestamp: string
  readonly symbol: string
  readonly openInterest: string
  readonly openInterestValue: string
  readonly sourceOrdinal: number
}

export interface OpenInterestSourceParseResult {
  readonly rows: readonly OpenInterestSourceRow[]
  readonly rejected: Readonly<Record<string, number>>
  readonly exactDuplicateRows: number
}

function decimal(value: string, field: string): string {
  const trimmed = value.trim()
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(trimmed)) throw new Error(`SOURCE_${field}_INVALID`)
  return trimmed
}

function sourceTimestamp(value: string): string {
  const trimmed = value.trim()
  const parsed = Date.parse(trimmed.endsWith("Z") ? trimmed : `${trimmed.replace(" ", "T")}Z`)
  if (!Number.isFinite(parsed)) throw new Error("SOURCE_OBSERVATION_TIME_INVALID")
  return new Date(parsed).toISOString()
}

export function parseBinanceVisionOpenInterestSource(csv: string, expectedSymbol: string): OpenInterestSourceParseResult {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean)
  const header = (lines.shift() ?? "").split(",")
  const timeIndex = header.indexOf("create_time")
  const symbolIndex = header.indexOf("symbol")
  const quantityIndex = header.indexOf("sum_open_interest")
  const valueIndex = header.indexOf("sum_open_interest_value")
  if ([timeIndex, symbolIndex, quantityIndex, valueIndex].some((index) => index < 0)) throw new Error("SOURCE_OPEN_INTEREST_SCHEMA_UNSUPPORTED")
  const normalizedSymbol = expectedSymbol.trim().toUpperCase()
  const rows: OpenInterestSourceRow[] = []
  const byObservation = new Map<string, OpenInterestSourceRow>()
  const rejected: Record<string, number> = {}
  let exactDuplicateRows = 0
  for (let sourceOrdinal = 0; sourceOrdinal < lines.length; sourceOrdinal += 1) {
    try {
      const columns = lines[sourceOrdinal].split(",")
      const symbol = (columns[symbolIndex] ?? "").trim().toUpperCase()
      if (symbol !== normalizedSymbol) throw new Error("SOURCE_SYMBOL_MISMATCH")
      const row = Object.freeze({ observedAt: sourceTimestamp(columns[timeIndex] ?? ""), sourceTimestamp: (columns[timeIndex] ?? "").trim(), symbol, openInterest: decimal(columns[quantityIndex] ?? "", "OPEN_INTEREST"), openInterestValue: decimal(columns[valueIndex] ?? "", "OPEN_INTEREST_VALUE"), sourceOrdinal })
      const existing = byObservation.get(row.observedAt)
      if (existing) {
        if (existing.openInterest !== row.openInterest || existing.openInterestValue !== row.openInterestValue || existing.symbol !== row.symbol) throw new Error("SOURCE_CONFLICTING_DUPLICATE_OBSERVATION")
        exactDuplicateRows += 1
        continue
      }
      byObservation.set(row.observedAt, row)
      rows.push(row)
    } catch (error) {
      const reason = error instanceof Error ? error.message : "SOURCE_ROW_INVALID"
      rejected[reason] = (rejected[reason] ?? 0) + 1
    }
  }
  rows.sort((left, right) => left.observedAt.localeCompare(right.observedAt))
  return Object.freeze({ rows: Object.freeze(rows), rejected: Object.freeze(rejected), exactDuplicateRows })
}
