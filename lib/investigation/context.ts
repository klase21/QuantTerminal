import {
  INVESTIGATION_CONTEXT_VERSION,
  type InvestigationContext,
  type InvestigationExchange,
  type InvestigationTimeframe,
  type InvestigationType,
} from "@/types/investigation"

type SearchParamsReader = Pick<URLSearchParams, "get">

const TIMEFRAMES = new Set<InvestigationTimeframe>(["1m", "3m", "5m", "15m", "1h", "4h", "1d"])
const INVESTIGATION_TYPES = new Set<InvestigationType>([
  "market_state",
  "historical_analog",
  "historical_case",
  "event_impact",
  "market_memory",
  "replay",
])

function validTimestamp(value?: string | null) {
  if (!value) return null
  return Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null
}

function validReplayDate(value?: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function validReplayHour(value?: string | null) {
  if (!value || !/^\d{1,2}$/.test(value)) return null
  const hour = Number(value)
  return hour >= 0 && hour <= 23 ? String(hour) : null
}

export function normalizeInvestigationSymbol(value?: string | null, fallback = "BTCUSDT") {
  const normalized = (value ?? fallback).replace("/", "").trim().toUpperCase()
  return normalized || fallback
}

export function normalizeInvestigationTimeframe(
  value?: string | null,
  fallback: InvestigationTimeframe = "1h",
): InvestigationTimeframe {
  return value && TIMEFRAMES.has(value as InvestigationTimeframe)
    ? value as InvestigationTimeframe
    : fallback
}

export function toHistoricalTimeframe(timeframe: InvestigationTimeframe): "1h" | "4h" | "1d" {
  if (timeframe === "4h" || timeframe === "1d") return timeframe
  return "1h"
}

export function createInvestigationContext(input: {
  symbol: string
  exchange?: InvestigationExchange
  timeframe?: InvestigationTimeframe
  investigationTimestamp?: string
  investigationType?: InvestigationType
  source?: string
}): InvestigationContext {
  return {
    contextVersion: INVESTIGATION_CONTEXT_VERSION,
    symbol: normalizeInvestigationSymbol(input.symbol),
    exchange: input.exchange ?? "binance_futures",
    timeframe: input.timeframe ?? "1h",
    investigationTimestamp: validTimestamp(input.investigationTimestamp) ?? new Date().toISOString(),
    investigationType: input.investigationType,
    source: input.source,
  }
}

export function readInvestigationContext(
  params: SearchParamsReader,
  fallback: InvestigationContext,
): InvestigationContext {
  const symbol = normalizeInvestigationSymbol(params.get("symbol"), fallback.symbol)
  const exchange = params.get("exchange")?.trim() || fallback.exchange
  const timeframe = normalizeInvestigationTimeframe(
    params.get("timeframe") ?? params.get("interval"),
    fallback.timeframe,
  )
  const investigationTimestamp = validTimestamp(params.get("timestamp")) ?? fallback.investigationTimestamp
  const investigationValue = params.get("investigation")
  const investigationType = investigationValue && INVESTIGATION_TYPES.has(investigationValue as InvestigationType)
    ? investigationValue as InvestigationType
    : fallback.investigationType
  const source = params.get("source")?.trim() || fallback.source
  const caseId = params.get("case")?.trim()
  const caseTimestamp = validTimestamp(params.get("caseTimestamp"))
  const eventId = params.get("event")?.trim()
  const eventTimestamp = validTimestamp(params.get("eventTimestamp"))
  const replayDate = validReplayDate(params.get("date"))
  const replayHour = validReplayHour(params.get("hour"))

  return {
    ...fallback,
    contextVersion: INVESTIGATION_CONTEXT_VERSION,
    symbol,
    exchange,
    timeframe,
    investigationTimestamp,
    investigationType,
    source,
    selectedHistoricalCase: caseId && caseTimestamp
      ? {
          id: caseId,
          symbol,
          timeframe,
          timestamp: caseTimestamp,
          source: params.get("caseSource")?.trim() || undefined,
          exchange,
        }
      : fallback.selectedHistoricalCase,
    selectedReplayWindow: replayDate && replayHour
      ? { exchange, symbol, date: replayDate, hour: replayHour }
      : fallback.selectedReplayWindow,
    selectedEvent: eventId && eventTimestamp
      ? {
          id: eventId,
          timestamp: eventTimestamp,
          category: params.get("eventCategory")?.trim() || undefined,
          source: params.get("eventSource")?.trim() || undefined,
        }
      : fallback.selectedEvent,
  }
}

export function investigationContextParams(context: InvestigationContext) {
  const params = new URLSearchParams({
    symbol: normalizeInvestigationSymbol(context.symbol),
    exchange: context.exchange,
    timeframe: context.timeframe,
    timestamp: context.investigationTimestamp,
  })

  if (context.investigationType) params.set("investigation", context.investigationType)
  if (context.source) params.set("source", context.source)

  if (context.selectedHistoricalCase) {
    params.set("case", context.selectedHistoricalCase.id)
    params.set("caseTimestamp", context.selectedHistoricalCase.timestamp)
    if (context.selectedHistoricalCase.source) params.set("caseSource", context.selectedHistoricalCase.source)
  }

  if (context.selectedReplayWindow) {
    params.set("date", context.selectedReplayWindow.date)
    params.set("hour", context.selectedReplayWindow.hour)
  }

  if (context.selectedEvent) {
    params.set("event", context.selectedEvent.id)
    params.set("eventTimestamp", context.selectedEvent.timestamp)
    if (context.selectedEvent.category) params.set("eventCategory", context.selectedEvent.category)
    if (context.selectedEvent.source) params.set("eventSource", context.selectedEvent.source)
  }

  return params
}

export function buildInvestigationHref(pathname: string, context: InvestigationContext) {
  return `${pathname}?${investigationContextParams(context).toString()}`
}
