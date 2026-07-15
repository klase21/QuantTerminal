import {
  buildAlphaVantageDailyRequest,
  parseAlphaVantageDailyDataset,
} from "./alphaVantage"
import {
  buildFredObservationsRequest,
  buildFredSeriesMetadataRequest,
  parseFredObservations,
  parseFredSeriesMetadata,
} from "./fred"
import {
  FARSIDE_BITCOIN_ETF_ALL_DATA_URL,
  FARSIDE_BITCOIN_ETF_WORDPRESS_URL,
  parseFarsideBitcoinEtfAllData,
  type FarsideCell,
} from "./farsideBitcoinEtf"
import type { AlphaVantageRole, FredRole } from "./registry"

interface FarsideRetrieval {
  readonly html: string
  readonly retrievedAt: string
  readonly acquisition: "WORDPRESS_OFFICIAL_API" | "BROWSER_BACKED_SCHEDULED_RETRIEVAL"
  readonly wordpressStatus: number
  readonly browserStatus: number | null
}

export type ExternalCanaryProvider = "fred" | "alpha-vantage" | "farside"

export interface ExternalCanaryObservation {
  readonly sourceObservationId: string
  readonly sourceObservedAt: string
  readonly effectiveAt: string
  readonly payload: Readonly<Record<string, unknown>>
}

export interface ExternalCanaryBundle {
  readonly provider: ExternalCanaryProvider
  readonly datasetId: "macro" | "daily-market-context" | "etf-flow"
  readonly providerId: "fred" | "alpha-vantage" | "farside-investors"
  readonly subject: string
  readonly mediaType: "application/json" | "text/html"
  readonly extension: "json" | "html"
  readonly parserVersion: string
  readonly candidateKind: "MACRO_ECONOMIC_OBSERVATION" | "DAILY_MARKET_CONTEXT_OBSERVATION" | "ETF_FLOW_OBSERVATION"
  readonly rawBytes: Buffer
  readonly observations: readonly ExternalCanaryObservation[]
  readonly limitations: readonly string[]
  readonly metadata: Readonly<Record<string, unknown>>
}

interface FetchResult { readonly text: string; readonly payload: unknown; readonly retrievedAt: string }

async function fetchJson(url: string, redactedUrl: string): Promise<FetchResult> {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json", "User-Agent": "QuantTerminal-MVP-External-Context/1.0" }, signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`SOURCE_HTTP_${response.status}:${redactedUrl}`)
  const text = await response.text()
  let payload: unknown
  try { payload = JSON.parse(text) } catch { throw new Error(`SOURCE_JSON_INVALID:${redactedUrl}`) }
  return { text, payload, retrievedAt: new Date().toISOString() }
}

function utcDay(date: string): { readonly start: string; readonly end: string } {
  const start = Date.parse(`${date}T00:00:00.000Z`)
  if (!Number.isFinite(start)) throw new Error(`SOURCE_DATE_INVALID:${date}`)
  return { start: new Date(start).toISOString(), end: new Date(start + 86_400_000).toISOString() }
}

function sourceDate(value: string): string {
  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(trimmed)
  if (!match) throw new Error(`FARSIDE_SOURCE_DATE_INVALID:${trimmed}`)
  const month = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].indexOf(match[2]!.slice(0, 1).toUpperCase() + match[2]!.slice(1).toLowerCase())
  if (month < 0) throw new Error(`FARSIDE_SOURCE_DATE_INVALID:${trimmed}`)
  return `${match[3]}-${String(month + 1).padStart(2, "0")}-${match[1]!.padStart(2, "0")}`
}

function millionToUsd(value: string): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value)
  if (!match) throw new Error("FARSIDE_FLOW_DECIMAL_INVALID")
  const fraction = (match[3] ?? "").padEnd(6, "0")
  if (fraction.length > 6) throw new Error("FARSIDE_FLOW_PRECISION_UNSUPPORTED")
  const absolute = `${match[2]}${fraction}`.replace(/^0+(?=\d)/, "")
  return `${match[1]}${absolute || "0"}`
}

function flowObservation(date: string, fundId: string, cell: FarsideCell): ExternalCanaryObservation | null {
  if (cell.state === "BLANK" || cell.state === "DASH") return null
  if (cell.state === "MALFORMED") throw new Error(`FARSIDE_FLOW_VALUE_MALFORMED:${fundId}:${date}`)
  const window = utcDay(date)
  return Object.freeze({
    sourceObservationId: `farside-investors:bitcoin-etf:${fundId}:${date}`,
    sourceObservedAt: window.start,
    effectiveAt: window.start,
    payload: Object.freeze({ instrumentId: "BTC_SPOT_ETF_US", fundId, flowValue: millionToUsd(cell.sourceValue), currency: "USD", windowStart: window.start, windowEnd: window.end, sourceValueState: cell.state, sourceReportedDate: date, providerTier: "C_VERIFIED_PUBLIC" }),
  })
}

async function retrieveFarsideHtml(): Promise<FarsideRetrieval> {
  const wordpress = await fetch(FARSIDE_BITCOIN_ETF_WORDPRESS_URL, {
    cache: "no-store",
    redirect: "follow",
    headers: { Accept: "application/json", "User-Agent": "QuantTerminal-MVP-External-Context/1.0" },
    signal: AbortSignal.timeout(30_000),
  })
  if (wordpress.ok) {
    const responseText = await wordpress.text()
    let payload: unknown
    try { payload = JSON.parse(responseText) } catch { throw new Error("FARSIDE_WORDPRESS_JSON_INVALID") }
    if (!payload || typeof payload !== "object") throw new Error("FARSIDE_WORDPRESS_RESPONSE_INVALID")
    const page = payload as { readonly id?: unknown; readonly content?: { readonly rendered?: unknown } }
    if (page.id !== 1321 || typeof page.content?.rendered !== "string") throw new Error("FARSIDE_WORDPRESS_PAGE_CONTRACT_INVALID")
    return Object.freeze({ html: page.content.rendered, retrievedAt: new Date().toISOString(), acquisition: "WORDPRESS_OFFICIAL_API", wordpressStatus: wordpress.status, browserStatus: null })
  }

  const { chromium } = await import("playwright-core")
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    timeout: 45_000,
  })
  try {
    const context = await browser.newContext({ locale: "en-GB" })
    const page = await context.newPage()
    const response = await page.goto(FARSIDE_BITCOIN_ETF_WORDPRESS_URL, { waitUntil: "domcontentloaded", timeout: 45_000 })
    if (!response) throw new Error("FARSIDE_BROWSER_NO_DOCUMENT_RESPONSE")
    const body = await response.body()
    let payload: unknown
    try { payload = JSON.parse(body.toString("utf8")) } catch { throw new Error("FARSIDE_BROWSER_WORDPRESS_JSON_INVALID") }
    if (!payload || typeof payload !== "object") throw new Error("FARSIDE_BROWSER_WORDPRESS_RESPONSE_INVALID")
    const wordpressPage = payload as { readonly id?: unknown; readonly content?: { readonly rendered?: unknown } }
    if (wordpressPage.id !== 1321 || typeof wordpressPage.content?.rendered !== "string") throw new Error("FARSIDE_BROWSER_WORDPRESS_PAGE_CONTRACT_INVALID")
    const html = wordpressPage.content.rendered
    return Object.freeze({ html, retrievedAt: new Date().toISOString(), acquisition: "BROWSER_BACKED_SCHEDULED_RETRIEVAL", wordpressStatus: wordpress.status, browserStatus: response.status() })
  } finally {
    await browser.close()
  }
}

export async function fetchFredCanary(role: FredRole = "US_10Y_TREASURY_YIELD"): Promise<ExternalCanaryBundle> {
  const environment = { apiKey: process.env.FRED_API_KEY }
  const metadataRequest = buildFredSeriesMetadataRequest(environment, role)
  const observationsRequest = buildFredObservationsRequest(environment, role, { observationStart: "2026-04-13", observationEnd: "2026-07-11" })
  if (metadataRequest.state !== "READY" || observationsRequest.state !== "READY") throw new Error("FRED_ACCESS_CONFIGURATION_REQUIRED")
  const [metadataRaw, observationsRaw] = await Promise.all([fetchJson(metadataRequest.value.url, metadataRequest.value.redactedUrl), fetchJson(observationsRequest.value.url, observationsRequest.value.redactedUrl)])
  const metadata = parseFredSeriesMetadata(metadataRaw.payload)
  const parsed = parseFredObservations(observationsRaw.payload, 200)
  if (metadata.state !== "READY") throw new Error(`FRED_METADATA_${metadata.state}:${metadata.reason}`)
  if (parsed.state !== "READY") throw new Error(`FRED_OBSERVATIONS_${parsed.state}:${parsed.reason}`)
  const available = parsed.value.filter((item) => item.value !== null).slice(-90)
  if (!available.length) throw new Error("FRED_CANARY_NO_COMPLETE_OBSERVATIONS")
  const observations = available.map((item) => {
    const window = utcDay(item.date)
    return Object.freeze({ sourceObservationId: `fred:${metadata.value.seriesId}:${item.date}:${item.realtimeStart}:${item.realtimeEnd}`, sourceObservedAt: window.start, effectiveAt: window.start, payload: Object.freeze({ seriesId: metadata.value.seriesId, subject: role, value: item.sourceValue, unit: metadata.value.units, period: item.date, frequency: metadata.value.frequency, seasonalAdjustment: metadata.value.seasonalAdjustment, realtimeStart: item.realtimeStart, realtimeEnd: item.realtimeEnd, releaseIdentity: `fred:${metadata.value.seriesId}:${metadata.value.lastUpdated}`, providerTier: "A_OFFICIAL_API" }) })
  })
  const rawBytes = Buffer.from(JSON.stringify({ series: metadataRaw.payload, observations: observationsRaw.payload }), "utf8")
  return Object.freeze({ provider: "fred", datasetId: "macro", providerId: "fred", subject: metadata.value.seriesId, mediaType: "application/json", extension: "json", parserVersion: "fred-series-observations-v1", candidateKind: "MACRO_ECONOMIC_OBSERVATION", rawBytes, observations: Object.freeze(observations), limitations: Object.freeze(["CURRENT_FRED_RESPONSE_WITH_REALTIME_METADATA", "REVISIONS_REQUIRE_NEW_FACT_VERSION"]), metadata: Object.freeze({ role, ...metadata.value, requestIdentities: [metadataRequest.value.identity, observationsRequest.value.identity], retrievedAt: observationsRaw.retrievedAt }) })
}

export async function fetchAlphaVantageCanary(role: AlphaVantageRole = "SPY"): Promise<ExternalCanaryBundle> {
  const request = buildAlphaVantageDailyRequest({ apiKey: process.env.ALPHA_VANTAGE_API_KEY }, role, "compact")
  if (request.state !== "READY") throw new Error("ALPHA_VANTAGE_ACCESS_CONFIGURATION_REQUIRED")
  const raw = await fetchJson(request.value.url, request.value.redactedUrl)
  const parsed = parseAlphaVantageDailyDataset(raw.payload, 150)
  if (parsed.state !== "READY") throw new Error(`ALPHA_VANTAGE_${parsed.state}:${parsed.reason}`)
  const available = parsed.value.observations.slice(-90)
  if (!available.length) throw new Error("ALPHA_VANTAGE_CANARY_NO_OBSERVATIONS")
  const observations = available.map((item) => {
    const window = utcDay(item.date)
    return Object.freeze({ sourceObservationId: `alpha-vantage:${role}:${item.date}`, sourceObservedAt: window.end, effectiveAt: window.end, payload: Object.freeze({ seriesId: role, subject: role, value: item.sourceClose, open: item.sourceOpen, high: item.sourceHigh, low: item.sourceLow, close: item.sourceClose, volume: item.sourceVolume, timeZone: parsed.value.metadata.timeZone, unit: "USD", period: item.date, frequency: "DAILY", licensingState: "PUBLIC_DEMO_LICENSE_REVIEW_REQUIRED", providerTier: "A_OFFICIAL_API" }) })
  })
  return Object.freeze({ provider: "alpha-vantage", datasetId: "daily-market-context", providerId: "alpha-vantage", subject: role, mediaType: "application/json", extension: "json", parserVersion: "alpha-vantage-time-series-daily-v1", candidateKind: "DAILY_MARKET_CONTEXT_OBSERVATION", rawBytes: Buffer.from(raw.text, "utf8"), observations: Object.freeze(observations), limitations: Object.freeze(["DAILY_NOT_REALTIME", "PUBLIC_DEMO_LICENSE_REVIEW_REQUIRED"]), metadata: Object.freeze({ role, requestIdentity: request.value.identity, ...parsed.value.metadata, retrievedAt: raw.retrievedAt }) })
}

export async function fetchFarsideCanary(): Promise<ExternalCanaryBundle> {
  const retrieval = await retrieveFarsideHtml()
  const html = retrieval.html
  const parsed = parseFarsideBitcoinEtfAllData(html)
  if (parsed.state !== "READY") throw new Error(`FARSIDE_${parsed.state}:${parsed.reason}`)
  const selected = parsed.value.rows
  const observations: ExternalCanaryObservation[] = []
  for (const row of selected) {
    const date = sourceDate(row.sourceDate)
    for (const [fundId, cell] of Object.entries(row.cells)) {
      if (/^date$/i.test(fundId)) continue
      const observation = flowObservation(date, /^total$/i.test(fundId) ? "TOTAL" : fundId, cell)
      if (observation) observations.push(observation)
    }
  }
  if (!observations.length) throw new Error("FARSIDE_CANARY_NO_OBSERVATIONS")
  const orderedDates = selected.map((row) => sourceDate(row.sourceDate)).sort()
  return Object.freeze({ provider: "farside", datasetId: "etf-flow", providerId: "farside-investors", subject: "BTC_SPOT_ETF_US", mediaType: "text/html", extension: "html", parserVersion: "farside-bitcoin-etf-table-v2", candidateKind: "ETF_FLOW_OBSERVATION", rawBytes: Buffer.from(html, "utf8"), observations: Object.freeze(observations), limitations: Object.freeze(["SOURCE_REPORTED_USD_MILLIONS", "BLANK_AND_DASH_ARE_NOT_ZERO", "OBSERVED_FLOW_IS_NOT_ESTIMATED_DEMAND", "DAILY_NOT_REALTIME"]), metadata: Object.freeze({ sourceAvailability: "PUBLICLY_AVAILABLE", representation: parsed.value.representation, directHttpPath: "UNCERTIFIED_OR_EDGE_REJECTED", acquisition: retrieval.acquisition, recommendedAcquisition: "BROWSER_BACKED_SCHEDULED_RETRIEVAL", wordpressEndpointStatus: retrieval.wordpressStatus, browserDocumentStatus: retrieval.browserStatus, retrievalUrl: parsed.value.retrievalUrl, tableIdentity: parsed.value.identity, headers: parsed.value.headers, sourceRows: selected.length, cumulativeRows: 1, sourceUnit: "USD_MILLIONS", reconciliation: parsed.value.reconciliation, earliestSourceDate: orderedDates[0], latestSourceDate: orderedDates.at(-1), retrievedAt: retrieval.retrievedAt }) })
}

export function fetchExternalCanary(provider: ExternalCanaryProvider): Promise<ExternalCanaryBundle> {
  if (provider === "fred") return fetchFredCanary()
  if (provider === "alpha-vantage") return fetchAlphaVantageCanary()
  return fetchFarsideCanary()
}
