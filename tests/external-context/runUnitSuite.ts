import assert from "node:assert/strict"
import {
  buildAlphaVantageDailyRequest,
  buildFredObservationsRequest,
  buildFredSeriesMetadataRequest,
  createExternalContextProjection,
  parseAlphaVantageDaily,
  parseAlphaVantageWtiDaily,
  parseFarsideBitcoinEtfAllData,
  parseFarsideCell,
  parseFredObservations,
  parseFredSeriesMetadata,
  FARSIDE_BITCOIN_ETF_SOURCE,
  VERIFIED_ALPHA_VANTAGE_SERIES,
  VERIFIED_FRED_SERIES,
} from "../../lib/external-context"
import {
  createMvpProjection,
  MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS,
  verifyMvpProjection,
} from "../../lib/data-platform/evidence-platform"

function ready<T>(result: { readonly state: string; readonly value?: T }): T {
  assert.equal(result.state, "READY")
  return result.value as T
}

const fredRequest = ready(buildFredObservationsRequest({ apiKey: "fred-secret" }, "US_10Y_TREASURY_YIELD", { observationStart: "2026-01-01" }))
assert.match(fredRequest.url, /api_key=fred-secret/)
assert.doesNotMatch(fredRequest.redactedUrl, /fred-secret/)
assert.doesNotMatch(fredRequest.identity, /fred-secret|api_key/)
assert.equal(buildFredSeriesMetadataRequest({}, "US_10Y_TREASURY_YIELD").state, "CONFIGURATION_REQUIRED")
assert.deepEqual(
  ready(parseFredSeriesMetadata({ seriess: [{ id: "DGS10", title: "10-Year Treasury", units: "Percent", frequency: "Daily", seasonal_adjustment: "Not Seasonally Adjusted", observation_start: "1962-01-02", observation_end: "2026-01-01", last_updated: "2026-01-02" }] })),
  { seriesId: "DGS10", title: "10-Year Treasury", units: "Percent", frequency: "Daily", seasonalAdjustment: "Not Seasonally Adjusted", observationStart: "1962-01-02", observationEnd: "2026-01-01", lastUpdated: "2026-01-02" },
)
assert.deepEqual(ready(parseFredObservations({ observations: [{ date: "2026-01-01", value: "4.25", realtime_start: "2026-01-03", realtime_end: "2026-01-03" }, { date: "2026-01-02", value: ".", realtime_start: "2026-01-03", realtime_end: "2026-01-03" }] })), [{ date: "2026-01-01", value: 4.25, sourceValue: "4.25", realtimeStart: "2026-01-03", realtimeEnd: "2026-01-03" }, { date: "2026-01-02", value: null, sourceValue: ".", realtimeStart: "2026-01-03", realtimeEnd: "2026-01-03" }])

const alphaRequest = ready(buildAlphaVantageDailyRequest({ apiKey: "alpha-secret" }, "EUR_USD"))
assert.match(alphaRequest.url, /from_symbol=EUR/)
assert.doesNotMatch(alphaRequest.redactedUrl, /alpha-secret/)
assert.doesNotMatch(alphaRequest.identity, /alpha-secret|apikey/)
assert.equal(buildAlphaVantageDailyRequest({}, "SPY").state, "CONFIGURATION_REQUIRED")
assert.equal(parseAlphaVantageDaily({ Note: "Thank you for using Alpha Vantage! Our standard API call frequency is 25 requests per day." }).state, "RATE_LIMITED")
assert.equal(parseAlphaVantageDaily({ Information: "This is a premium endpoint." }).state, "CONFIGURATION_REQUIRED")
assert.equal(parseAlphaVantageDaily({ "Error Message": "Invalid API call." }).state, "INVALID_RESPONSE")
assert.deepEqual(
  ready(parseAlphaVantageDaily({ "Time Series (Daily)": { "2026-01-02": { "1. open": "1", "2. high": "2", "3. low": "0.5", "4. close": "1.5" }, "2026-01-01": { "1. open": "2", "2. high": "3", "3. low": "1", "4. close": "2.5", "5. volume": "42" } } })),
  [{ date: "2026-01-01", open: 2, high: 3, low: 1, close: 2.5, volume: 42, sourceOpen: "2", sourceHigh: "3", sourceLow: "1", sourceClose: "2.5", sourceVolume: "42" }, { date: "2026-01-02", open: 1, high: 2, low: 0.5, close: 1.5, volume: null, sourceOpen: "1", sourceHigh: "2", sourceLow: "0.5", sourceClose: "1.5", sourceVolume: null }],
)
const wtiRequest = ready(buildAlphaVantageDailyRequest({ apiKey: "alpha-secret" }, "WTI_CRUDE_OIL"))
assert.match(wtiRequest.url, /function=WTI/)
assert.match(wtiRequest.url, /interval=daily/)
assert.deepEqual(ready(parseAlphaVantageWtiDaily({ data: [{ date: "2026-01-02", value: "71.2" }, { date: "2026-01-01", value: "." }] })), [{ date: "2026-01-01", value: null }, { date: "2026-01-02", value: 71.2 }])

assert.deepEqual(parseFarsideCell(""), { state: "BLANK" })
assert.deepEqual(parseFarsideCell("-"), { state: "DASH" })
assert.deepEqual(parseFarsideCell("0"), { state: "ZERO", value: 0, sourceValue: "0" })
assert.deepEqual(parseFarsideCell("1,234.5"), { state: "POSITIVE", value: 1234.5, sourceValue: "1234.5" })
assert.deepEqual(parseFarsideCell("(12.5)"), { state: "NEGATIVE", value: -12.5, sourceValue: "-12.5" })
assert.deepEqual(parseFarsideCell("not-a-number"), { state: "MALFORMED", sourceText: "not-a-number" })
const farsideHeaders = ["Date", "IBIT", "FBTC", "BITB", "ARKB", "BTCO", "EZBC", "BRRR", "HODL", "BTCW", "MSBT", "GBTC", "BTC", "Total"]
const farsideRow = (date: string, values: readonly string[]) => `<tr><td>${date}</td>${values.map((value) => `<td>${value}</td>`).join("")}</tr>`
const farside = ready(parseFarsideBitcoinEtfAllData(`<table class="etf"><tr>${farsideHeaders.map((header) => `<th>${header}</th>`).join("")}</tr>${farsideRow("15 Jul 2026", ["1.0", "-", "0.0", "", "-", "-", "-", "-", "-", "-", "-", "-", "1.0"])}${farsideRow("14 Jul 2026", ["(12.5)", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "(12.5)"])}${farsideRow("Total", ["(11.5)", "-", "0.0", "-", "-", "-", "-", "-", "-", "-", "-", "-", "(11.5)"])}</table>`))
assert.equal(farside.rows.length, 2)
assert.equal(farside.rows[0]?.cells.BITB.state, "ZERO")
assert.equal(farside.rows[1]?.cells.IBIT.state, "NEGATIVE")
assert.equal(farside.rows[1]?.total.state, "NEGATIVE")
assert.equal(farside.cumulativeRow.rowKind, "CUMULATIVE_TOTAL")
assert.deepEqual(farside.reconciliation, { checkedRows: 2, matchedRows: 2, mismatches: [] })
assert.deepEqual(
  [FARSIDE_BITCOIN_ETF_SOURCE.sourceAvailability, FARSIDE_BITCOIN_ETF_SOURCE.representation, FARSIDE_BITCOIN_ETF_SOURCE.directHttpPath, FARSIDE_BITCOIN_ETF_SOURCE.acquisition],
  ["PUBLICLY_AVAILABLE", "HTML_EMBEDDED_TABLE", "UNCERTIFIED_OR_EDGE_REJECTED", "BROWSER_BACKED_SCHEDULED_RETRIEVAL"],
)
assert.equal(parseFarsideBitcoinEtfAllData("<table class=\"etf\"><tr><th>Date</th><th>Total</th></tr><tr><td>1</td><td>1</td></tr></table>").state, "INVALID_RESPONSE")
assert.equal(parseFarsideBitcoinEtfAllData(`<table class="etf"><tr>${farsideHeaders.map((header) => `<th>${header}</th>`).join("")}</tr>${farsideRow("15 Jul 2026", ["1", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "2"])}${farsideRow("Total", ["1", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "1"])}</table>`).state, "INVALID_RESPONSE")
assert.equal(parseFarsideBitcoinEtfAllData("<table class=\"etf\"></table>", { maxRows: 0 }).state, "TOO_LARGE")

assert.deepEqual(VERIFIED_FRED_SERIES.map((entry) => entry.seriesId), ["DGS2", "DGS10", "T10Y2Y", "DTWEXBGS", "FEDFUNDS", "WALCL"])
assert.deepEqual(VERIFIED_ALPHA_VANTAGE_SERIES.map((entry) => entry.role), ["SPY", "QQQ", "GLD", "WTI_CRUDE_OIL", "EUR_USD"])
const withheldProjection = createExternalContextProjection({ projectionKind: "MacroContextProjection", availability: "ACCESS_CONFIGURATION_REQUIRED", observationStart: null, observationEnd: null, knowledgeTime: "2026-07-15T00:00:00.000Z", providerIds: ["fred", "alpha-vantage"], payload: {}, limitations: ["ACCESS_CONFIGURATION_REQUIRED"], dependencyDigest: "no-certified-source-observations" })
assert.deepEqual(createExternalContextProjection({ projectionKind: "MacroContextProjection", availability: "ACCESS_CONFIGURATION_REQUIRED", observationStart: null, observationEnd: null, knowledgeTime: "2026-07-15T00:00:00.000Z", providerIds: ["alpha-vantage", "fred"], payload: {}, limitations: ["ACCESS_CONFIGURATION_REQUIRED"], dependencyDigest: "no-certified-source-observations" }), withheldProjection)
assert.deepEqual(MVP_SUPPLEMENTAL_PROJECTION_DEFINITIONS.map((item) => item.projectionKind), ["MacroContextProjection", "BitcoinEtfFlowProjection"])
const supplementalProjectionInput = {
  kind: "MacroContextProjection" as const,
  subjectId: "GLOBAL_MACRO_CONTEXT",
  eventTimeStart: "2026-04-13T00:00:00.000Z",
  eventTimeEnd: "2026-07-11T00:00:00.000Z",
  knowledgeTimeCutoff: "2026-07-15T00:00:00.000Z",
  payload: { classification: "MIXED", relationship: "NEUTRAL_SUPPLEMENTAL_CONTEXT" },
  dependencies: [{ dependencyType: "CANONICAL_FACT" as const, dependencyId: "fred:DGS10", dependencyVersion: "1", dependencyChecksum: "a".repeat(64) }],
  limitations: ["DAILY_CONTEXT_NOT_REALTIME"],
}
const supplementalProjection = createMvpProjection(supplementalProjectionInput)
assert.equal(verifyMvpProjection(supplementalProjection), true)
assert.deepEqual(createMvpProjection(supplementalProjectionInput), supplementalProjection)
console.log("external-context unit suite passed")
