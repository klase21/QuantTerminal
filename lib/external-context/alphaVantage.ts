import { createPublicRequestIdentity, redactQueryParameter, type ExternalContextFailure, type ExternalContextRequest, type ExternalContextResult } from "./contracts"
import { getVerifiedAlphaVantageSeries, type AlphaVantageRole } from "./registry"

const ALPHA_VANTAGE_URL = "https://www.alphavantage.co/query"
const MAX_DAILY_OBSERVATIONS = 5_000

export interface AlphaVantageEnvironment { readonly apiKey?: string }
export interface AlphaVantageDailyObservation { readonly date: string; readonly open: number; readonly high: number; readonly low: number; readonly close: number; readonly volume: number | null; readonly sourceOpen: string; readonly sourceHigh: string; readonly sourceLow: string; readonly sourceClose: string; readonly sourceVolume: string | null }
export interface AlphaVantageDailyMetadata { readonly information: string; readonly symbol: string; readonly lastRefreshed: string; readonly outputSize: string; readonly timeZone: string }
export interface AlphaVantageDailyDataset { readonly metadata: AlphaVantageDailyMetadata; readonly observations: readonly AlphaVantageDailyObservation[] }
export interface AlphaVantageWtiObservation { readonly date: string; readonly value: number | null }

export function buildAlphaVantageDailyRequest(environment: AlphaVantageEnvironment, role: AlphaVantageRole, outputSize: "compact" | "full" = "compact"): ExternalContextResult<ExternalContextRequest> {
  const apiKey = environment.apiKey?.trim()
  if (!apiKey) return { state: "CONFIGURATION_REQUIRED", reason: "ALPHA_VANTAGE_API_KEY is required to build an Alpha Vantage request." }
  const series = getVerifiedAlphaVantageSeries(role)
  const url = new URL(ALPHA_VANTAGE_URL)
  url.searchParams.set("function", series.function)
  if (series.function === "FX_DAILY") {
    url.searchParams.set("outputsize", outputSize)
    url.searchParams.set("from_symbol", series.fromSymbol!)
    url.searchParams.set("to_symbol", series.toSymbol!)
  } else if (series.function === "TIME_SERIES_DAILY") {
    url.searchParams.set("outputsize", outputSize)
    url.searchParams.set("symbol", series.symbol!)
  } else {
    url.searchParams.set("interval", "daily")
  }
  url.searchParams.set("apikey", apiKey)
  return { state: "READY", value: { method: "GET", url: url.toString(), redactedUrl: redactQueryParameter(url, "apikey"), identity: createPublicRequestIdentity("alpha-vantage", series.function, { role, outputSize, symbol: series.symbol, fromSymbol: series.fromSymbol, toSymbol: series.toSymbol }) } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function providerState(payload: Record<string, unknown>): ExternalContextFailure | null {
  const note = typeof payload.Note === "string" ? payload.Note : typeof payload.Information === "string" ? payload.Information : null
  if (!note) return typeof payload["Error Message"] === "string" ? { state: "INVALID_RESPONSE", reason: payload["Error Message"] } : null
  const state = /rate limit|call frequency|higher API call volume/i.test(note) ? "RATE_LIMITED" : "CONFIGURATION_REQUIRED"
  return { state, reason: note }
}

export function parseAlphaVantageWtiDaily(payload: unknown, maximumObservations = MAX_DAILY_OBSERVATIONS): ExternalContextResult<readonly AlphaVantageWtiObservation[]> {
  if (!isRecord(payload)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage response is not an object." }
  const state = providerState(payload)
  if (state) return state
  if (!Array.isArray(payload.data)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage WTI response did not include daily data." }
  if (!Number.isSafeInteger(maximumObservations) || maximumObservations < 1 || payload.data.length > maximumObservations) return { state: "TOO_LARGE", reason: `Alpha Vantage WTI response exceeds the bounded limit of ${maximumObservations}.` }
  const observations: AlphaVantageWtiObservation[] = []
  for (const item of payload.data) {
    if (!isRecord(item) || typeof item.date !== "string" || typeof item.value !== "string") return { state: "INVALID_RESPONSE", reason: "Alpha Vantage WTI observation has an invalid date or value." }
    const value = item.value === "." ? null : Number(item.value)
    if (value !== null && !Number.isFinite(value)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage WTI observation value is not numeric." }
    observations.push(Object.freeze({ date: item.date, value }))
  }
  return { state: "READY", value: Object.freeze(observations.sort((left, right) => left.date.localeCompare(right.date))) }
}

export function parseAlphaVantageDaily(payload: unknown, maximumObservations = MAX_DAILY_OBSERVATIONS): ExternalContextResult<readonly AlphaVantageDailyObservation[]> {
  if (!isRecord(payload)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage response is not an object." }
  const state = providerState(payload)
  if (state) return state
  const daily = payload["Time Series (Daily)"]
  if (!isRecord(daily)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage response did not include a daily time series." }
  const entries = Object.entries(daily)
  if (!Number.isSafeInteger(maximumObservations) || maximumObservations < 1 || entries.length > maximumObservations) return { state: "TOO_LARGE", reason: `Alpha Vantage daily response exceeds the bounded limit of ${maximumObservations}.` }
  const observations: AlphaVantageDailyObservation[] = []
  for (const [date, raw] of entries.sort(([left], [right]) => left.localeCompare(right))) {
    if (!isRecord(raw)) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage daily observation is not an object." }
    const sourceOpen = raw["1. open"]
    const sourceHigh = raw["2. high"]
    const sourceLow = raw["3. low"]
    const sourceClose = raw["4. close"]
    if (![sourceOpen, sourceHigh, sourceLow, sourceClose].every((value) => typeof value === "string")) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage daily observation has missing OHLC fields." }
    const open = Number(sourceOpen)
    const high = Number(sourceHigh)
    const low = Number(sourceLow)
    const close = Number(sourceClose)
    const rawVolume = raw["5. volume"]
    if (rawVolume !== undefined && typeof rawVolume !== "string") return { state: "INVALID_RESPONSE", reason: "Alpha Vantage daily observation volume is invalid." }
    const volume = rawVolume === undefined ? null : Number(rawVolume)
    if (![open, high, low, close].every(Number.isFinite) || (volume !== null && !Number.isFinite(volume))) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage daily observation has non-numeric OHLCV fields." }
    observations.push(Object.freeze({ date, open, high, low, close, volume, sourceOpen: sourceOpen as string, sourceHigh: sourceHigh as string, sourceLow: sourceLow as string, sourceClose: sourceClose as string, sourceVolume: typeof rawVolume === "string" ? rawVolume : null }))
  }
  return { state: "READY", value: Object.freeze(observations) }
}

export function parseAlphaVantageDailyDataset(payload: unknown, maximumObservations = MAX_DAILY_OBSERVATIONS): ExternalContextResult<AlphaVantageDailyDataset> {
  if (!isRecord(payload) || !isRecord(payload["Meta Data"])) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage response did not include metadata." }
  const metadata = payload["Meta Data"]
  const fields = ["1. Information", "2. Symbol", "3. Last Refreshed", "4. Output Size", "5. Time Zone"] as const
  if (fields.some((field) => typeof metadata[field] !== "string")) return { state: "INVALID_RESPONSE", reason: "Alpha Vantage metadata has missing required fields." }
  const observations = parseAlphaVantageDaily(payload, maximumObservations)
  if (observations.state !== "READY") return observations
  return { state: "READY", value: Object.freeze({ metadata: Object.freeze({ information: metadata["1. Information"] as string, symbol: metadata["2. Symbol"] as string, lastRefreshed: metadata["3. Last Refreshed"] as string, outputSize: metadata["4. Output Size"] as string, timeZone: metadata["5. Time Zone"] as string }), observations: observations.value }) }
}
