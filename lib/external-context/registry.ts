import type { LicenseClassification } from "./contracts"

export type FredRole = "US_2Y_TREASURY_YIELD" | "US_10Y_TREASURY_YIELD" | "US_10Y_2Y_SPREAD" | "US_DOLLAR_INDEX_BROAD" | "FED_FUNDS_RATE" | "FED_BALANCE_SHEET_TOTAL"
export type AlphaVantageRole = "SPY" | "QQQ" | "GLD" | "WTI_CRUDE_OIL" | "EUR_USD"

export interface FredSeriesRegistration {
  readonly role: FredRole
  readonly seriesId: "DGS2" | "DGS10" | "T10Y2Y" | "DTWEXBGS" | "FEDFUNDS" | "WALCL"
  readonly license: "PUBLIC_API_KEY_REQUIRED"
}

export interface AlphaVantageRegistration {
  readonly role: AlphaVantageRole
  readonly function: "TIME_SERIES_DAILY" | "FX_DAILY" | "WTI"
  readonly symbol?: "SPY" | "QQQ" | "GLD"
  readonly fromSymbol?: "EUR"
  readonly toSymbol?: "USD"
  readonly license: "COMMERCIAL_API_KEY_REQUIRED"
}

export const VERIFIED_FRED_SERIES: readonly FredSeriesRegistration[] = Object.freeze([
  { role: "US_2Y_TREASURY_YIELD", seriesId: "DGS2", license: "PUBLIC_API_KEY_REQUIRED" },
  { role: "US_10Y_TREASURY_YIELD", seriesId: "DGS10", license: "PUBLIC_API_KEY_REQUIRED" },
  { role: "US_10Y_2Y_SPREAD", seriesId: "T10Y2Y", license: "PUBLIC_API_KEY_REQUIRED" },
  { role: "US_DOLLAR_INDEX_BROAD", seriesId: "DTWEXBGS", license: "PUBLIC_API_KEY_REQUIRED" },
  { role: "FED_FUNDS_RATE", seriesId: "FEDFUNDS", license: "PUBLIC_API_KEY_REQUIRED" },
  { role: "FED_BALANCE_SHEET_TOTAL", seriesId: "WALCL", license: "PUBLIC_API_KEY_REQUIRED" },
])

export const VERIFIED_ALPHA_VANTAGE_SERIES: readonly AlphaVantageRegistration[] = Object.freeze([
  { role: "SPY", function: "TIME_SERIES_DAILY", symbol: "SPY", license: "COMMERCIAL_API_KEY_REQUIRED" },
  { role: "QQQ", function: "TIME_SERIES_DAILY", symbol: "QQQ", license: "COMMERCIAL_API_KEY_REQUIRED" },
  { role: "GLD", function: "TIME_SERIES_DAILY", symbol: "GLD", license: "COMMERCIAL_API_KEY_REQUIRED" },
  { role: "WTI_CRUDE_OIL", function: "WTI", license: "COMMERCIAL_API_KEY_REQUIRED" },
  { role: "EUR_USD", function: "FX_DAILY", fromSymbol: "EUR", toSymbol: "USD", license: "COMMERCIAL_API_KEY_REQUIRED" },
])

export const FARSIDE_BITCOIN_ETF_LICENSE: LicenseClassification = "PUBLIC_HTML_ATTRIBUTION_REQUIRED"
export const FARSIDE_BITCOIN_ETF_SOURCE = Object.freeze({
  providerId: "farside-investors",
  sourceId: "FARSIDE_PUBLIC_WEB",
  purpose: "OBSERVED_BITCOIN_ETF_FLOW",
  sourceAvailability: "PUBLICLY_AVAILABLE",
  representation: "HTML_EMBEDDED_TABLE",
  directHttpPath: "UNCERTIFIED_OR_EDGE_REJECTED",
  acquisition: "BROWSER_BACKED_SCHEDULED_RETRIEVAL",
  frequency: "SOURCE_UPDATED_DAILY",
  unit: "USD_MILLIONS",
  authentication: "NONE",
  license: FARSIDE_BITCOIN_ETF_LICENSE,
  parserVersion: "farside-bitcoin-etf-table-v2",
} as const)

export function getVerifiedFredSeries(role: FredRole): FredSeriesRegistration {
  const registration = VERIFIED_FRED_SERIES.find((entry) => entry.role === role)
  if (!registration) throw new Error(`Unregistered FRED role: ${role}`)
  return registration
}

export function getVerifiedAlphaVantageSeries(role: AlphaVantageRole): AlphaVantageRegistration {
  const registration = VERIFIED_ALPHA_VANTAGE_SERIES.find((entry) => entry.role === role)
  if (!registration) throw new Error(`Unregistered Alpha Vantage role: ${role}`)
  return registration
}
