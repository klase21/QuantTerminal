import * as cheerio from "cheerio"

import { createPublicRequestIdentity, type ExternalContextResult } from "./contracts"
import { FARSIDE_BITCOIN_ETF_LICENSE } from "./registry"

export const FARSIDE_BITCOIN_ETF_ALL_DATA_URL = "https://farside.co.uk/bitcoin-etf-flow-all-data/"
export const FARSIDE_BITCOIN_ETF_WORDPRESS_URL = "https://farside.co.uk/wp-json/wp/v2/pages/1321"
export const FARSIDE_BITCOIN_ETF_HEADERS = Object.freeze([
  "Date", "IBIT", "FBTC", "BITB", "ARKB", "BTCO", "EZBC", "BRRR", "HODL", "BTCW", "MSBT", "GBTC", "BTC", "Total",
] as const)
const MAX_HTML_CHARACTERS = 2_000_000
const MAX_ROWS = 2_000
const DECIMAL_SCALE = BigInt(1_000_000)

export type FarsideCell =
  | { readonly state: "BLANK" }
  | { readonly state: "DASH" }
  | { readonly state: "ZERO"; readonly value: 0; readonly sourceValue: string }
  | { readonly state: "POSITIVE"; readonly value: number; readonly sourceValue: string }
  | { readonly state: "NEGATIVE"; readonly value: number; readonly sourceValue: string }
  | { readonly state: "MALFORMED"; readonly sourceText: string }

export interface FarsideBitcoinEtfDailyRow {
  readonly rowKind: "DAILY"
  readonly sourceDate: string
  readonly total: FarsideCell
  readonly cells: Readonly<Record<string, FarsideCell>>
}

export interface FarsideBitcoinEtfCumulativeRow {
  readonly rowKind: "CUMULATIVE_TOTAL"
  readonly sourceDate: null
  readonly total: FarsideCell
  readonly cells: Readonly<Record<string, FarsideCell>>
}

export interface FarsideBitcoinEtfDataset {
  readonly sourceUrl: typeof FARSIDE_BITCOIN_ETF_ALL_DATA_URL
  readonly retrievalUrl: typeof FARSIDE_BITCOIN_ETF_WORDPRESS_URL
  readonly representation: "HTML_EMBEDDED_TABLE"
  readonly license: typeof FARSIDE_BITCOIN_ETF_LICENSE
  readonly identity: string
  readonly headers: typeof FARSIDE_BITCOIN_ETF_HEADERS
  readonly rows: readonly FarsideBitcoinEtfDailyRow[]
  readonly cumulativeRow: FarsideBitcoinEtfCumulativeRow
  readonly reconciliation: {
    readonly checkedRows: number
    readonly matchedRows: number
    readonly mismatches: readonly string[]
  }
}

function normalizedText(value: string): string {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim()
}

export function parseFarsideCell(value: string): FarsideCell {
  const text = normalizedText(value).replace(/\u2212/g, "-")
  if (!text) return { state: "BLANK" }
  if (text === "-") return { state: "DASH" }

  const parenthetical = /^\(([^)]+)\)$/.exec(text)
  const unsigned = (parenthetical?.[1] ?? text).replace(/,/g, "")
  if (!/^\d+(?:\.\d+)?$/.test(unsigned)) return { state: "MALFORMED", sourceText: text }
  const sourceValue = `${parenthetical ? "-" : ""}${unsigned}`
  const parsed = Number(sourceValue)
  if (!Number.isFinite(parsed)) return { state: "MALFORMED", sourceText: text }
  if (parsed === 0) return { state: "ZERO", value: 0, sourceValue: unsigned }
  return parsed > 0 ? { state: "POSITIVE", value: parsed, sourceValue } : { state: "NEGATIVE", value: parsed, sourceValue }
}

function fixedDecimal(cell: FarsideCell): bigint | null {
  if (cell.state === "BLANK" || cell.state === "DASH") return null
  if (cell.state === "MALFORMED") throw new Error("FARSIDE_RECONCILIATION_MALFORMED_VALUE")
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(cell.sourceValue)
  if (!match || (match[3]?.length ?? 0) > 6) throw new Error("FARSIDE_RECONCILIATION_PRECISION_UNSUPPORTED")
  const whole = BigInt(match[2]!) * DECIMAL_SCALE
  const fraction = BigInt((match[3] ?? "").padEnd(6, "0") || "0")
  return (match[1] === "-" ? BigInt(-1) : BigInt(1)) * (whole + fraction)
}

export function parseFarsideBitcoinEtfAllData(
  html: string,
  limits: { readonly maxHtmlCharacters?: number; readonly maxRows?: number } = {},
): ExternalContextResult<FarsideBitcoinEtfDataset> {
  const maxHtmlCharacters = limits.maxHtmlCharacters ?? MAX_HTML_CHARACTERS
  const maxRows = limits.maxRows ?? MAX_ROWS
  if (!Number.isSafeInteger(maxHtmlCharacters) || maxHtmlCharacters < 1 || html.length > maxHtmlCharacters) {
    return { state: "TOO_LARGE", reason: `Farside HTML exceeds the bounded limit of ${maxHtmlCharacters} characters.` }
  }
  if (!Number.isSafeInteger(maxRows) || maxRows < 1) {
    return { state: "TOO_LARGE", reason: "Farside ETF table row limit must be a positive safe integer." }
  }

  const $ = cheerio.load(html)
  const tables = $("table.etf")
  if (tables.length !== 1) return { state: "INVALID_RESPONSE", reason: `Expected exactly one table.etf; observed ${tables.length}.` }
  const table = tables.first()
  const headers = table.find("tr").first().find("th,td").toArray().map((cell) => normalizedText($(cell).text()))
  if (headers.length !== FARSIDE_BITCOIN_ETF_HEADERS.length || headers.some((header, index) => header !== FARSIDE_BITCOIN_ETF_HEADERS[index])) {
    return { state: "INVALID_RESPONSE", reason: `Farside ETF headers changed: ${JSON.stringify(headers)}.` }
  }

  const sourceRows = table.find("tr").slice(1).toArray().filter((row) => $(row).find("td").length > 0)
  if (sourceRows.length > maxRows) return { state: "TOO_LARGE", reason: `Farside ETF table exceeds the bounded limit of ${maxRows} rows.` }
  if (sourceRows.length < 2) return { state: "INVALID_RESPONSE", reason: "Farside ETF table has no daily rows and cumulative Total row." }

  const parsedRows: Array<FarsideBitcoinEtfDailyRow | FarsideBitcoinEtfCumulativeRow> = []
  for (const sourceRow of sourceRows) {
    const values = $(sourceRow).find("td").toArray().map((cell) => normalizedText($(cell).text()))
    if (values.length !== FARSIDE_BITCOIN_ETF_HEADERS.length) {
      return { state: "INVALID_RESPONSE", reason: `Farside ETF row width changed for ${values[0] ?? "UNKNOWN"}: ${values.length}.` }
    }
    const cells: Record<string, FarsideCell> = {}
    FARSIDE_BITCOIN_ETF_HEADERS.slice(1).forEach((header, index) => { cells[header] = parseFarsideCell(values[index + 1] ?? "") })
    const common = { total: cells.Total!, cells: Object.freeze(cells) }
    if (values[0] === "Total") parsedRows.push(Object.freeze({ rowKind: "CUMULATIVE_TOTAL", sourceDate: null, ...common }))
    else parsedRows.push(Object.freeze({ rowKind: "DAILY", sourceDate: values[0]!, ...common }))
  }

  const cumulativeRows = parsedRows.filter((row): row is FarsideBitcoinEtfCumulativeRow => row.rowKind === "CUMULATIVE_TOTAL")
  const dailyRows = parsedRows.filter((row): row is FarsideBitcoinEtfDailyRow => row.rowKind === "DAILY")
  if (cumulativeRows.length !== 1 || parsedRows.at(-1)?.rowKind !== "CUMULATIVE_TOTAL") {
    return { state: "INVALID_RESPONSE", reason: "Farside ETF cumulative Total row must occur exactly once and be the final row." }
  }

  const mismatches: string[] = []
  try {
    for (const row of dailyRows) {
      const total = fixedDecimal(row.total)
      if (total === null) { mismatches.push(row.sourceDate); continue }
      const sum = FARSIDE_BITCOIN_ETF_HEADERS.slice(1, -1).reduce((accumulator, header) => accumulator + (fixedDecimal(row.cells[header]!) ?? BigInt(0)), BigInt(0))
      if (sum !== total) mismatches.push(row.sourceDate)
    }
  } catch (error) {
    return { state: "INVALID_RESPONSE", reason: error instanceof Error ? error.message : "FARSIDE_RECONCILIATION_FAILED" }
  }
  if (mismatches.length) return { state: "INVALID_RESPONSE", reason: `Farside daily Total reconciliation failed for ${mismatches.slice(0, 10).join(", ")}.` }

  return {
    state: "READY",
    value: Object.freeze({
      sourceUrl: FARSIDE_BITCOIN_ETF_ALL_DATA_URL,
      retrievalUrl: FARSIDE_BITCOIN_ETF_WORDPRESS_URL,
      representation: "HTML_EMBEDDED_TABLE",
      license: FARSIDE_BITCOIN_ETF_LICENSE,
      identity: createPublicRequestIdentity("farside", "bitcoin-etf-all-data-wordpress", { pageId: "1321", selector: "table.etf" }),
      headers: FARSIDE_BITCOIN_ETF_HEADERS,
      rows: Object.freeze(dailyRows),
      cumulativeRow: cumulativeRows[0]!,
      reconciliation: Object.freeze({ checkedRows: dailyRows.length, matchedRows: dailyRows.length, mismatches: Object.freeze([]) }),
    }),
  }
}
