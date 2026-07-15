import { createPublicRequestIdentity, type ExternalContextResult } from "./contracts"
import { FARSIDE_BITCOIN_ETF_LICENSE } from "./registry"

export const FARSIDE_BITCOIN_ETF_ALL_DATA_URL = "https://farside.co.uk/bitcoin-etf-flow-all-data/"
const MAX_HTML_CHARACTERS = 2_000_000
const MAX_ROWS = 2_000

export type FarsideCell =
  | { readonly state: "BLANK" }
  | { readonly state: "DASH" }
  | { readonly state: "ZERO"; readonly value: 0; readonly sourceValue: string }
  | { readonly state: "POSITIVE"; readonly value: number; readonly sourceValue: string }
  | { readonly state: "NEGATIVE"; readonly value: number; readonly sourceValue: string }
  | { readonly state: "MALFORMED"; readonly sourceText: string }

export interface FarsideBitcoinEtfRow {
  readonly sourceDate: string
  readonly total: FarsideCell
  readonly cells: Readonly<Record<string, FarsideCell>>
}

export interface FarsideBitcoinEtfDataset {
  readonly sourceUrl: typeof FARSIDE_BITCOIN_ETF_ALL_DATA_URL
  readonly license: typeof FARSIDE_BITCOIN_ETF_LICENSE
  readonly identity: string
  readonly headers: readonly string[]
  readonly rows: readonly FarsideBitcoinEtfRow[]
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseFarsideCell(value: string): FarsideCell {
  const text = decodeHtml(value).replace(/\u2212/g, "-")
  if (!text) return { state: "BLANK" }
  if (/^(?:-|N\/A)$/i.test(text)) return { state: "DASH" }

  const parenthetical = /^\(([^)]+)\)$/.exec(text)
  const unsigned = (parenthetical?.[1] ?? text).replace(/[,$]/g, "")
  const sourceValue = `${parenthetical ? "-" : ""}${unsigned}`
  const parsed = Number(sourceValue)
  if (!Number.isFinite(parsed)) return { state: "MALFORMED", sourceText: text }
  if (parsed === 0) return { state: "ZERO", value: 0, sourceValue: "0" }
  return parsed > 0 ? { state: "POSITIVE", value: parsed, sourceValue } : { state: "NEGATIVE", value: parsed, sourceValue }
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

  const tables = html.match(/<table\b[\s\S]*?<\/table>/gi) ?? []
  for (const table of tables) {
    const parsedRows = (table.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? []).map((row) =>
      (row.match(/<t[hd]\b[^>]*>[\s\S]*?<\/t[hd]>/gi) ?? []).map(decodeHtml),
    )
    const headerIndex = parsedRows.findIndex(
      (cells) => cells.some((cell) => /^date$/i.test(cell)) && cells.some((cell) => /^total$/i.test(cell)),
    )
    if (headerIndex < 0) continue

    const headers = parsedRows[headerIndex]!
    const dateIndex = headers.findIndex((header) => /^date$/i.test(header))
    const totalIndex = headers.findIndex((header) => /^total$/i.test(header))
    const dataRows = parsedRows.slice(headerIndex + 1).filter((cells) => cells.length >= headers.length && cells[dateIndex])
    if (!Number.isSafeInteger(maxRows) || maxRows < 1 || dataRows.length > maxRows) {
      return { state: "TOO_LARGE", reason: `Farside ETF table exceeds the bounded limit of ${maxRows} rows.` }
    }

    const rows = dataRows.map((cells) => {
      const values: Record<string, FarsideCell> = {}
      headers.forEach((header, index) => {
        values[header] = parseFarsideCell(cells[index] ?? "")
      })
      return Object.freeze({ sourceDate: cells[dateIndex]!, total: values[headers[totalIndex]!]!, cells: Object.freeze(values) })
    })
    return {
      state: "READY",
      value: Object.freeze({
        sourceUrl: FARSIDE_BITCOIN_ETF_ALL_DATA_URL,
        license: FARSIDE_BITCOIN_ETF_LICENSE,
        identity: createPublicRequestIdentity("farside", "bitcoin-etf-all-data", { url: FARSIDE_BITCOIN_ETF_ALL_DATA_URL }),
        headers: Object.freeze([...headers]),
        rows: Object.freeze(rows),
      }),
    }
  }
  return { state: "INVALID_RESPONSE", reason: "Farside Bitcoin ETF all-data table with Date and Total columns was not found." }
}
