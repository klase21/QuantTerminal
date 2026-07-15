import { createPublicRequestIdentity, redactQueryParameter, type ExternalContextRequest, type ExternalContextResult } from "./contracts"
import { getVerifiedFredSeries, type FredRole } from "./registry"

const FRED_BASE_URL = "https://api.stlouisfed.org/fred"
const MAX_OBSERVATIONS = 10_000

export interface FredEnvironment { readonly apiKey?: string }
export interface FredObservation { readonly date: string; readonly value: number | null; readonly sourceValue: string; readonly realtimeStart: string; readonly realtimeEnd: string }
export interface FredSeriesMetadata { readonly seriesId: string; readonly title: string; readonly units: string; readonly frequency: string; readonly seasonalAdjustment: string; readonly observationStart: string; readonly observationEnd: string; readonly lastUpdated: string }

function requiredKey(environment: FredEnvironment): string | null {
  const key = environment.apiKey?.trim()
  return key ? key : null
}

function buildFredRequest(environment: FredEnvironment, role: FredRole, operation: "series" | "observations", parameters: Readonly<Record<string, string>>): ExternalContextResult<ExternalContextRequest> {
  const apiKey = requiredKey(environment)
  if (!apiKey) return { state: "CONFIGURATION_REQUIRED", reason: "FRED_API_KEY is required to build a FRED request." }

  const series = getVerifiedFredSeries(role)
  const url = new URL(operation === "series" ? `${FRED_BASE_URL}/series` : `${FRED_BASE_URL}/series/observations`)
  url.searchParams.set("series_id", series.seriesId)
  url.searchParams.set("file_type", "json")
  url.searchParams.set("api_key", apiKey)
  for (const [key, value] of Object.entries(parameters)) url.searchParams.set(key, value)

  return {
    state: "READY",
    value: {
      method: "GET",
      url: url.toString(),
      redactedUrl: redactQueryParameter(url, "api_key"),
      identity: createPublicRequestIdentity("fred", operation, { role, seriesId: series.seriesId, ...parameters }),
    },
  }
}

export function buildFredSeriesMetadataRequest(environment: FredEnvironment, role: FredRole): ExternalContextResult<ExternalContextRequest> {
  return buildFredRequest(environment, role, "series", {})
}

export function buildFredObservationsRequest(environment: FredEnvironment, role: FredRole, input: { readonly observationStart?: string; readonly observationEnd?: string } = {}): ExternalContextResult<ExternalContextRequest> {
  const parameters: Record<string, string> = {}
  if (input.observationStart) parameters.observation_start = input.observationStart
  if (input.observationEnd) parameters.observation_end = input.observationEnd
  return buildFredRequest(environment, role, "observations", parameters)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function parseFredSeriesMetadata(payload: unknown): ExternalContextResult<FredSeriesMetadata> {
  if (!isRecord(payload) || !Array.isArray(payload.seriess) || !isRecord(payload.seriess[0])) return { state: "INVALID_RESPONSE", reason: "FRED series metadata did not include a series record." }
  const series = payload.seriess[0]
  const fields = ["id", "title", "units", "frequency", "seasonal_adjustment", "observation_start", "observation_end", "last_updated"] as const
  if (fields.some((field) => typeof series[field] !== "string")) return { state: "INVALID_RESPONSE", reason: "FRED series metadata has missing required fields." }
  return { state: "READY", value: { seriesId: series.id as string, title: series.title as string, units: series.units as string, frequency: series.frequency as string, seasonalAdjustment: series.seasonal_adjustment as string, observationStart: series.observation_start as string, observationEnd: series.observation_end as string, lastUpdated: series.last_updated as string } }
}

export function parseFredObservations(payload: unknown, maximumObservations = MAX_OBSERVATIONS): ExternalContextResult<readonly FredObservation[]> {
  if (!isRecord(payload) || !Array.isArray(payload.observations)) return { state: "INVALID_RESPONSE", reason: "FRED observations response did not include observations." }
  if (!Number.isSafeInteger(maximumObservations) || maximumObservations < 1 || payload.observations.length > maximumObservations) return { state: "TOO_LARGE", reason: `FRED observations exceed the bounded limit of ${maximumObservations}.` }
  const observations: FredObservation[] = []
  for (const item of payload.observations) {
    if (!isRecord(item) || typeof item.date !== "string" || typeof item.value !== "string" || typeof item.realtime_start !== "string" || typeof item.realtime_end !== "string") return { state: "INVALID_RESPONSE", reason: "FRED observation has invalid date, value, or realtime metadata." }
    const value = item.value === "." ? null : Number(item.value)
    if (value !== null && !Number.isFinite(value)) return { state: "INVALID_RESPONSE", reason: "FRED observation value is not numeric." }
    observations.push(Object.freeze({ date: item.date, value, sourceValue: item.value, realtimeStart: item.realtime_start, realtimeEnd: item.realtime_end }))
  }
  return { state: "READY", value: Object.freeze(observations) }
}
