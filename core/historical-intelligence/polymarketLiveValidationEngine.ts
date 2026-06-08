import { previewLiveExternalEventAdapter } from "./externalEventAdapterRegistry"
import type { ExternalEventFetchQuery, ExternalEventRawItem } from "./externalEventAdapterTypes"
import type {
  PolymarketLiveValidationIssue,
  PolymarketLiveValidationResult,
  PolymarketLiveValidationSample,
  PolymarketLiveValidationSummary,
} from "./polymarketLiveValidationTypes"

function arrayValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean)
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown
      return Array.isArray(parsed) ? parsed.map((item) => String(item)).filter(Boolean) : [value]
    } catch {
      return [value]
    }
  }
  return []
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : ""
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function issue(
  level: PolymarketLiveValidationIssue["level"],
  code: string,
  message: string,
  rawItem?: ExternalEventRawItem,
  field?: string,
): PolymarketLiveValidationIssue {
  return {
    level,
    code,
    message,
    marketId: rawItem?.id,
    field,
  }
}

function sampleFrom(rawItem: ExternalEventRawItem, normalizedEventId?: string): PolymarketLiveValidationSample {
  const outcomes = arrayValue(rawItem.payload.outcomes)
  const prices = arrayValue(rawItem.payload.outcomePrices)
  const volume = numberValue(rawItem.payload.volume)
  const liquidity = numberValue(rawItem.payload.liquidity)

  return {
    marketId: rawItem.id,
    title: rawItem.title,
    status: stringValue(rawItem.payload.status) || "unknown",
    hasOutcomes: outcomes.length > 0,
    hasPrices: prices.length > 0,
    hasVolume: volume !== undefined,
    hasLiquidity: liquidity !== undefined,
    warningCount: arrayValue(rawItem.payload.warnings).length,
    confidence: rawItem.confidence,
    sourceUrl: rawItem.sourceUrl,
    normalizedEventId,
  }
}

function inspectRawItem(rawItem: ExternalEventRawItem): PolymarketLiveValidationIssue[] {
  const issues: PolymarketLiveValidationIssue[] = []
  const outcomes = arrayValue(rawItem.payload.outcomes)
  const prices = arrayValue(rawItem.payload.outcomePrices)
  const status = stringValue(rawItem.payload.status) || "unknown"

  if (!rawItem.title || rawItem.title === "Untitled Polymarket market") {
    issues.push(issue("warning", "missing_title", "Market title/question is missing or fallback generated.", rawItem, "title"))
  }
  if (!rawItem.payload.slug && !rawItem.payload.id && !rawItem.payload.conditionId) {
    issues.push(issue("warning", "missing_identity", "Missing slug/id/conditionId; dedupe fallback was used.", rawItem, "id"))
  }
  if (!outcomes.length) issues.push(issue("warning", "missing_outcomes", "Market outcomes are missing.", rawItem, "outcomes"))
  if (!prices.length) issues.push(issue("warning", "missing_prices", "Market outcome prices/probabilities are missing.", rawItem, "outcomePrices"))
  if (numberValue(rawItem.payload.volume) === undefined) {
    issues.push(issue("info", "missing_volume", "Market volume is missing.", rawItem, "volume"))
  }
  if (numberValue(rawItem.payload.liquidity) === undefined) {
    issues.push(issue("info", "missing_liquidity", "Market liquidity is missing.", rawItem, "liquidity"))
  }
  if (status === "closed" || status === "inactive" || status === "unknown") {
    issues.push(issue(status === "unknown" ? "warning" : "info", "market_status", `Market status is ${status}.`, rawItem, "status"))
  }
  if (rawItem.confidence < 45) {
    issues.push(issue("warning", "low_confidence", "Normalized event confidence is very low.", rawItem, "confidence"))
  }

  arrayValue(rawItem.payload.warnings).forEach((warning) => {
    issues.push(issue("warning", "adapter_warning", warning, rawItem))
  })

  return issues
}

function buildSummary(samples: PolymarketLiveValidationSample[], issues: PolymarketLiveValidationIssue[]): PolymarketLiveValidationSummary {
  return {
    sampleCount: samples.length,
    normalizedCount: samples.filter((sample) => sample.normalizedEventId).length,
    errorCount: issues.filter((item) => item.level === "error").length,
    warningCount: issues.filter((item) => item.level === "warning").length,
    averageConfidence: average(samples.map((sample) => sample.confidence)),
    activeCount: samples.filter((sample) => sample.status === "active").length,
    closedCount: samples.filter((sample) => sample.status === "closed").length,
    unknownStatusCount: samples.filter((sample) => sample.status === "unknown").length,
    missingOutcomeCount: samples.filter((sample) => !sample.hasOutcomes).length,
    missingPriceCount: samples.filter((sample) => !sample.hasPrices).length,
    missingVolumeCount: samples.filter((sample) => !sample.hasVolume).length,
    missingLiquidityCount: samples.filter((sample) => !sample.hasLiquidity).length,
  }
}

export async function validatePolymarketLiveSamples(
  query: ExternalEventFetchQuery = {},
): Promise<PolymarketLiveValidationResult> {
  const preview = await previewLiveExternalEventAdapter("polymarket", query)
  const issues: PolymarketLiveValidationIssue[] = []

  if (!preview) {
    issues.push(issue("error", "adapter_unavailable", "Polymarket live adapter is unavailable."))
    return {
      samples: [],
      issues,
      summary: buildSummary([], issues),
      caveat: "Live validation only. No persistence write.",
    }
  }

  if (!preview.rawItems.length) {
    issues.push(issue("warning", "empty_live_response", "Live preview returned no Polymarket markets."))
  }

  preview.warnings.forEach((warning) => {
    issues.push(issue("warning", "fetch_warning", warning))
  })

  const dedupeKeys = new Map<string, number>()
  preview.rawItems.forEach((rawItem) => {
    const key = stringValue(rawItem.payload.dedupeKey) || rawItem.id
    dedupeKeys.set(key, (dedupeKeys.get(key) ?? 0) + 1)
  })

  const samples = preview.rawItems.map((rawItem) => {
    const normalized = preview.normalizedCandidates.find((candidate) => candidate.rawItem.id === rawItem.id)
    issues.push(...inspectRawItem(rawItem))
    const key = stringValue(rawItem.payload.dedupeKey) || rawItem.id
    if ((dedupeKeys.get(key) ?? 0) > 1) {
      issues.push(issue("warning", "duplicate_dedupe_key", `Duplicate dedupe key detected: ${key}`, rawItem, "dedupeKey"))
    }
    return sampleFrom(rawItem, normalized?.normalized.event.sourceId)
  })

  return {
    samples,
    issues,
    summary: buildSummary(samples, issues),
    caveat: "Live validation only. No persistence write.",
  }
}
