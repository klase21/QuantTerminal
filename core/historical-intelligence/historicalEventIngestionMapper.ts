import type { DecisionMistakeTag } from "./decisionRecordTypes"
import type { EventRecord } from "./eventRecordTypes"
import type { HistoricalEventCategory } from "./historicalIntelligenceTypes"
import type {
  HistoricalMockIngestionKind,
  HistoricalNormalizedIngestionEvent,
  HistoricalRawMockEvent,
} from "./historicalEventIngestionTypes"
import type { MemoryRecord } from "./historicalRecordTypes"
import type { PlaybookRecordCategory, PlaybookRecordOutcomeBias } from "./playbookRecordTypes"

const NOW = "2026-06-08T00:00:00.000Z"
const AUDIT = {
  createdAt: NOW,
  updatedAt: NOW,
  schemaVersion: 1,
}

const DEFAULT_SYMBOL_BY_KIND: Record<HistoricalMockIngestionKind, string> = {
  etf_flow: "BTCUSDT",
  cpi: "BTCUSDT",
  fomc: "BTCUSDT",
  nfp: "BTCUSDT",
  polymarket: "BTCUSDT",
  kalshi: "BTCUSDT",
  token_unlock: "ALTUSDT",
  exchange_listing: "ALTUSDT",
  regulatory_event: "BTCUSDT",
}

const TITLE_BY_KIND: Record<HistoricalMockIngestionKind, string> = {
  etf_flow: "ETF flow impulse",
  cpi: "CPI inflation surprise",
  fomc: "FOMC policy repricing",
  nfp: "NFP labor shock",
  polymarket: "Polymarket expectation shift",
  kalshi: "Kalshi macro probability shift",
  token_unlock: "Token unlock supply event",
  exchange_listing: "Exchange listing liquidity event",
  regulatory_event: "Regulatory event repricing",
}

function categoryFor(kind: HistoricalMockIngestionKind): HistoricalEventCategory {
  if (kind === "etf_flow") return "etf_flow"
  if (kind === "polymarket" || kind === "kalshi") return "prediction_market"
  if (kind === "cpi" || kind === "fomc" || kind === "nfp") return "macro"
  if (kind === "regulatory_event") return "news"
  return "narrative"
}

function memoryTypeFor(kind: HistoricalMockIngestionKind): MemoryRecord["memoryType"] {
  if (kind === "polymarket" || kind === "kalshi") return "expectation_context"
  if (kind === "cpi" || kind === "fomc" || kind === "nfp") return "market_regime"
  if (kind === "token_unlock" || kind === "exchange_listing") return "setup_pattern"
  return "tactical_takeaway"
}

function playbookCategoryFor(kind: HistoricalMockIngestionKind): PlaybookRecordCategory {
  if (kind === "polymarket" || kind === "kalshi") return "expectation"
  if (kind === "cpi" || kind === "fomc" || kind === "nfp") return "macro"
  if (kind === "etf_flow") return "flow"
  if (kind === "regulatory_event") return "risk"
  return "narrative"
}

function outcomeBiasFor(kind: HistoricalMockIngestionKind): PlaybookRecordOutcomeBias {
  if (kind === "regulatory_event" || kind === "token_unlock") return "wait"
  if (kind === "exchange_listing") return "avoid"
  return "mixed"
}

function mistakeTagFor(kind: HistoricalMockIngestionKind): DecisionMistakeTag {
  if (kind === "polymarket" || kind === "kalshi") return "expectation_misread"
  if (kind === "etf_flow") return "flow_ignored"
  if (kind === "regulatory_event") return "poor_invalidation"
  return "headline_attribution_risk"
}

function confidenceFor(raw: HistoricalRawMockEvent) {
  if (raw.probability !== undefined) return Math.min(92, Math.max(40, Math.round(raw.probability)))
  if (raw.value !== undefined) return Math.min(88, Math.max(45, Math.round(Math.abs(raw.value))))
  return 68
}

export function normalizeMockHistoricalEvent(raw: HistoricalRawMockEvent): HistoricalNormalizedIngestionEvent {
  const symbol = raw.symbol ?? DEFAULT_SYMBOL_BY_KIND[raw.kind]
  const title = raw.title ?? TITLE_BY_KIND[raw.kind]
  const summary = raw.summary ?? `Mock ${raw.kind.replace(/_/g, " ")} event prepared for Historical Intelligence ingestion.`
  const tags = [...new Set([raw.kind, symbol.toLowerCase(), ...(raw.tags ?? [])])]
  const confidence = confidenceFor(raw)
  const sourceId = `mock-ingestion-${raw.kind}`

  const event: Omit<EventRecord, "id"> = {
    timestamp: raw.timestamp ?? NOW,
    category: categoryFor(raw.kind),
    symbol,
    venue: raw.kind === "polymarket" ? "polymarket" : raw.kind === "kalshi" ? "kalshi" : "manual",
    sourceId,
    title,
    summary,
    severity: raw.kind === "cpi" || raw.kind === "fomc" || raw.kind === "regulatory_event" ? "HIGH" : "MEDIUM",
    confidence,
    reliability: "derived",
    data: {
      kind: raw.kind,
      value: raw.value,
      probability: raw.probability,
      source: raw.source ?? "mock",
    },
    tags,
    relatedCaseIds: [],
    impact: {
      direction: raw.kind === "token_unlock" || raw.kind === "regulatory_event" ? "bearish" : "mixed",
      affectedAssets: [symbol],
      expectedImpactWindow: raw.kind === "cpi" || raw.kind === "fomc" ? "hours" : "days",
      tacticalRead: "Mock ingestion only; use as historical context, not a live signal.",
    },
    narrative: {
      claim: title,
      support: [summary],
      contradiction: ["No live source verification in mock ingestion mode."],
      conclusion: "Candidate event requires future source validation before production use.",
      narrativeTags: tags,
    },
    status: "active",
    audit: AUDIT,
  }

  return {
    sourceKind: raw.kind,
    event,
    memoryCandidate: {
      caseId: undefined,
      eventIds: [],
      memoryType: memoryTypeFor(raw.kind),
      title: `${title} memory candidate`,
      summary: `Remember ${title.toLowerCase()} as possible context for future replay and setup comparison.`,
      confidence: Math.max(40, confidence - 6),
      tags,
      data: {
        sourceKind: raw.kind,
        normalizedFrom: "mock-ingestion",
      },
      sourceIds: [sourceId],
      status: "active",
      audit: AUDIT,
    },
    decisionCandidate: {
      caseId: "mock-ingestion-case",
      mode: "hypothetical",
      decidedAt: raw.timestamp ?? NOW,
      symbol,
      decision: raw.kind === "regulatory_event" || raw.kind === "token_unlock" ? "avoid" : "wait",
      decisionReason: "Mock ingestion suggests waiting for confirmation before treating the event as execution signal.",
      invalidationCondition: "Event impact is not confirmed by price, flow, or expectation context.",
      expectedOutcome: "Event becomes a historical context candidate rather than a standalone trade signal.",
      actualOutcome: "Mock ingestion only; no realized outcome persisted.",
      mistakeTag: mistakeTagFor(raw.kind),
      lesson: "Normalize event first, then link it to replay, memory, and setup outcome context.",
      futureRule: "Require confirmation from market structure, flows, and expectation shifts before execution.",
      confidence: Math.max(35, confidence - 10),
      sourceIds: [sourceId],
      status: "draft",
      audit: AUDIT,
    },
    playbookCandidate: {
      caseId: undefined,
      title: `${title} response checklist`,
      category: playbookCategoryFor(raw.kind),
      outcomeBias: outcomeBiasFor(raw.kind),
      historicalLesson: "Mock ingested events should become context before becoming execution rules.",
      keyMistake: "Treating a normalized event as a live trading signal.",
      keyConfirmationSignal: "Replay context, flow, expectation, and risk all align after the event.",
      bestExecutionCondition: "Event is confirmed by market reaction and similar historical memory.",
      worstExecutionCondition: "Event is isolated, unverified, or contradicted by flow.",
      futurePlaybook: ["Normalize event", "Link memory", "Check similar cases", "Confirm before execution"],
      executionChecklist: [
        {
          id: "confirm-event-source",
          label: "Event source checked",
          category: playbookCategoryFor(raw.kind),
          required: true,
          weight: 0.3,
        },
      ],
      invalidationChecklist: [
        {
          id: "invalid-unverified-event",
          label: "Event remains unverified",
          category: "risk",
          required: true,
          weight: 0.4,
        },
      ],
      relatedCaseIds: [],
      relatedMemoryIds: [],
      confidence: Math.max(35, confidence - 8),
      tags,
      status: "draft",
      audit: AUDIT,
    },
  }
}
