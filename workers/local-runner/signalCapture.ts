import {
  CONTEXT_EVIDENCE_CATEGORIES,
  createContextSnapshot,
  contextEvidenceKey,
  isContextJsonValue,
  serializeContextSnapshot,
  transitionContextSnapshot,
  validateContextSnapshot,
  type ContextEvidenceItem,
  type ContextSnapshot,
} from "@/lib/context-snapshot"
import { getSource } from "@/lib/data-governance"
import type { PersistenceRepository } from "@/lib/persistence/repository"
import type { OperationalRecordPersistenceIntent } from "@/lib/persistence/repository"
import type { StorageJsonObject, StorageJsonValue } from "@/lib/persistence"
import type { WorkerJobHandler } from "@/lib/worker-runtime"
import type { LocalRunRequest } from "@/workers/local-runner/types"

export const SIGNAL_SNAPSHOT_SCHEMA_VERSION = 1 as const

const FRESHNESS_STATUSES = new Set([
  "LIVE",
  "CURRENT",
  "STALE",
  "EXPIRED",
  "UNAVAILABLE",
])

interface UnknownRecord {
  readonly [key: string]: unknown
}

export interface ScannerSignalSnapshotCandidate extends StorageJsonObject {
  readonly schemaVersion: typeof SIGNAL_SNAPSHOT_SCHEMA_VERSION
  readonly snapshotId: string
  readonly signalId: string
  readonly createdAt: string
  readonly sourcePage: "scanner"
  readonly symbol: string
  readonly exchange: string | null
  readonly timeframe: string | null
  readonly direction: string | null
  readonly opportunityContext: StorageJsonObject
  readonly signalReason: string | null
  readonly confidence: string | number | null
  readonly entryPrice: number | null
  readonly entrySourceId: string | null
  readonly entryObservedAt: string | null
  readonly marketStructure: StorageJsonValue
  readonly freshness: StorageJsonValue
  readonly sourceMetadata: StorageJsonValue
}

export type SignalCaptureCandidateResult =
  | { readonly success: true; readonly value: ScannerSignalSnapshotCandidate }
  | { readonly success: false; readonly reason: string }

type ContextCaptureResult =
  | { readonly success: true; readonly value: ContextSnapshot }
  | { readonly success: false; readonly reason: string }

type ExplicitEvidenceResult =
  | { readonly success: true; readonly value: readonly ContextEvidenceItem[] }
  | { readonly success: false; readonly reason: string }

const SOURCE_CONTEXT_INPUTS = Object.freeze([
  Object.freeze({ metadataKey: "sectorRotation", category: "SECTOR", sourceId: "sector-rotation" }),
  Object.freeze({ metadataKey: "etfFlow", category: "ETF", sourceId: "etf-flow" }),
  Object.freeze({ metadataKey: "reserveIntelligence", category: "EXCHANGE", sourceId: "exchange-reserve" }),
  Object.freeze({ metadataKey: "predictionMarkets", category: "PREDICTION", sourceId: "prediction-markets" }),
  Object.freeze({ metadataKey: "exchangeComparison", category: "EXCHANGE", sourceId: "exchange-comparison" }),
  Object.freeze({ metadataKey: "futuresSymbolContext", category: "DERIVATIVES", sourceId: "binance-live" }),
] as const)

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function stableJson(value: StorageJsonValue): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`
  }
  return JSON.stringify(value)
}

function deterministicHash(value: StorageJsonValue): string {
  const input = stableJson(value)
  let left = 0x811c9dc5
  let right = 0x9e3779b9
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    left = Math.imul(left ^ code, 0x01000193)
    right = Math.imul(right ^ code, 0x85ebca6b)
  }
  return `${(left >>> 0).toString(16).padStart(8, "0")}${(right >>> 0).toString(16).padStart(8, "0")}`
}

function sourceMetadata(value: unknown): StorageJsonObject | null {
  if (!isRecord(value) || text(value.sourceId) === null) return null
  const metadata: Record<string, StorageJsonValue> = {
    sourceId: text(value.sourceId),
    sourceName: text(value.sourceName),
    productionApproved: value.productionApproved === true,
    freshnessStatus: typeof value.freshnessStatus === "string"
      && FRESHNESS_STATUSES.has(value.freshnessStatus)
      ? value.freshnessStatus
      : null,
    lastUpdatedAt: typeof value.lastUpdatedAt === "string"
      && Number.isFinite(Date.parse(value.lastUpdatedAt))
      ? new Date(value.lastUpdatedAt).toISOString()
      : null,
  }
  return Object.freeze(metadata)
}

export function createScannerSignalSnapshotCandidate(
  scannerOutput: unknown,
  createdAt: string,
): SignalCaptureCandidateResult {
  if (!isRecord(scannerOutput) || !Number.isFinite(Date.parse(createdAt))) {
    return Object.freeze({
      success: false,
      reason: "Scanner opportunity output or capture timestamp is unavailable.",
    })
  }
  const symbol = text(scannerOutput.symbol)
  if (symbol === null) {
    return Object.freeze({ success: false, reason: "Scanner opportunity symbol is unavailable." })
  }

  const metadata = sourceMetadata(scannerOutput._source)
  const sourceBacked = metadata?.productionApproved === true
  const normalizedCreatedAt = new Date(createdAt).toISOString()
  const entryPriceValue = finiteNumber(scannerOutput.entryPrice)
  const sourceObservedAt = metadata?.lastUpdatedAt
  const entryPrice = sourceBacked
    && entryPriceValue !== null
    && entryPriceValue > 0
    && sourceObservedAt === normalizedCreatedAt
    ? entryPriceValue
    : null
  const entrySourceId = entryPrice !== null && typeof metadata?.sourceId === "string"
    ? metadata.sourceId
    : null
  const setup = text(scannerOutput.setup)
  const signalReason = setup !== null && setup !== "Live Market Signal" ? setup : null
  const confidenceValue = sourceBacked
    ? text(scannerOutput.confidence) ?? finiteNumber(scannerOutput.confidence)
    : null
  const freshness = sourceBacked && metadata?.freshnessStatus !== null
    ? Object.freeze({
        status: metadata.freshnessStatus,
        lastUpdatedAt: metadata.lastUpdatedAt,
      })
    : null
  const marketStructure = sourceBacked && isRecord(scannerOutput.marketStructure)
    ? scannerOutput.marketStructure as StorageJsonObject
    : null
  const opportunityContext = Object.freeze({
    score: finiteNumber(scannerOutput.score),
    setup: signalReason,
    priority: text(scannerOutput.priority),
    historicalSupport: finiteNumber(scannerOutput.historicalSupport),
  })
  const signalBasis = Object.freeze({
    sourcePage: "scanner",
    symbol,
    exchange: text(scannerOutput.exchange),
    timeframe: text(scannerOutput.timeframe),
    direction: text(scannerOutput.direction),
    opportunityContext,
    signalReason,
    confidence: confidenceValue,
    entryPrice,
    entrySourceId,
    entryObservedAt: entryPrice !== null ? normalizedCreatedAt : null,
    marketStructure,
    freshness,
    sourceMetadata: metadata,
  }) satisfies StorageJsonObject
  const signalId = `scanner-signal-v1:${deterministicHash(signalBasis)}`
  const snapshotId = `scanner-snapshot-v1:${deterministicHash(Object.freeze({
    signalId,
    createdAt: normalizedCreatedAt,
  }))}`

  return Object.freeze({
    success: true,
    value: Object.freeze({
      schemaVersion: SIGNAL_SNAPSHOT_SCHEMA_VERSION,
      snapshotId,
      signalId,
      createdAt: normalizedCreatedAt,
      ...signalBasis,
    }),
  })
}

function explicitContextEvidence(value: unknown): ExplicitEvidenceResult {
  if (value === undefined) return Object.freeze({ success: true, value: Object.freeze([]) })
  if (!Array.isArray(value)) {
    return Object.freeze({ success: false, reason: "Explicit contextEvidence must be an array." })
  }
  const evidence: ContextEvidenceItem[] = []
  for (const item of value) {
    if (!isRecord(item)) {
      return Object.freeze({ success: false, reason: "Explicit context evidence is malformed." })
    }
    const sourceId = text(item.sourceId)
    if (sourceId !== null) {
      const source = getSource(sourceId)
      if (!source?.productionApproved
        || (item.availability === "AVAILABLE" && source.status !== "ACTIVE")) {
        return Object.freeze({ success: false, reason: "Explicit context evidence source is not production-approved and available." })
      }
    }
    evidence.push(item as unknown as ContextEvidenceItem)
  }
  return Object.freeze({ success: true, value: Object.freeze(evidence) })
}

function scannerMarketEvidence(
  candidate: ScannerSignalSnapshotCandidate,
): ContextEvidenceItem | null {
  if (!isRecord(candidate.sourceMetadata)) return null
  const sourceId = text(candidate.sourceMetadata.sourceId)
  const observedAt = text(candidate.sourceMetadata.lastUpdatedAt)
  const freshness = text(candidate.sourceMetadata.freshnessStatus)
  const source = sourceId === null ? null : getSource(sourceId)
  if (!source?.productionApproved
    || source.status !== "ACTIVE"
    || observedAt === null
    || freshness === null
    || freshness === "UNAVAILABLE"
    || !FRESHNESS_STATUSES.has(freshness)) return null

  return Object.freeze({
    category: "MARKET",
    sourceId,
    observedAt,
    freshness: freshness as ContextEvidenceItem["freshness"],
    availability: "AVAILABLE",
    payload: Object.freeze({
      referencePrice: candidate.entryPrice,
      opportunityContext: candidate.opportunityContext,
      signalReason: candidate.signalReason,
      marketStructure: candidate.marketStructure,
    }),
    unavailableReason: null,
  })
}

function sourceBackedContextEvidence(
  candidate: ScannerSignalSnapshotCandidate,
  input: unknown,
  definition: typeof SOURCE_CONTEXT_INPUTS[number],
): ContextEvidenceItem | null {
  if (!isRecord(input) || !isRecord(input._source) || !isContextJsonValue(input)) return null
  const metadata = input._source
  const sourceId = text(metadata.sourceId)
  const observedAt = text(metadata.lastUpdatedAt)
  const freshness = text(metadata.freshnessStatus)
  const sourceStatus = text(metadata.sourceStatus)
  const source = sourceId === null ? null : getSource(sourceId)
  if (sourceId !== definition.sourceId
    || !source?.productionApproved
    || source.status !== "ACTIVE"
    || metadata.productionApproved !== true
    || (sourceStatus !== "ACTIVE" && sourceStatus !== "DEGRADED")
    || observedAt === null
    || !Number.isFinite(Date.parse(observedAt))
    || Date.parse(observedAt) > Date.parse(candidate.createdAt)
    || freshness === null
    || freshness === "UNAVAILABLE"
    || !FRESHNESS_STATUSES.has(freshness)
    || metadata.unavailableReason !== null) return null

  return Object.freeze({
    category: definition.category,
    sourceId,
    observedAt: new Date(observedAt).toISOString(),
    freshness: freshness as ContextEvidenceItem["freshness"],
    availability: "AVAILABLE",
    payload: input,
    unavailableReason: null,
  })
}

function wiredContextEvidence(
  candidate: ScannerSignalSnapshotCandidate,
  metadataInput: unknown,
): readonly ContextEvidenceItem[] {
  if (!isRecord(metadataInput)) return Object.freeze([])
  return Object.freeze(SOURCE_CONTEXT_INPUTS
    .map((definition) => sourceBackedContextEvidence(
      candidate,
      metadataInput[definition.metadataKey],
      definition,
    ))
    .filter((item): item is ContextEvidenceItem => item !== null))
}

export function createSignalContextSnapshot(
  candidate: ScannerSignalSnapshotCandidate,
  explicitEvidenceInput: unknown,
  sourceMetadataInput?: unknown,
): ContextCaptureResult {
  const explicit = explicitContextEvidence(explicitEvidenceInput)
  if (explicit.success === false) return explicit
  const evidence = [...explicit.value]
  const automatic = scannerMarketEvidence(candidate)
  if (automatic && !evidence.some((item) => contextEvidenceKey(item) === contextEvidenceKey(automatic))) {
    evidence.push(automatic)
  }
  for (const item of wiredContextEvidence(candidate, sourceMetadataInput)) {
    if (!evidence.some((existing) => contextEvidenceKey(existing) === contextEvidenceKey(item))) {
      evidence.push(item)
    }
  }
  for (const category of CONTEXT_EVIDENCE_CATEGORIES) {
    if (!evidence.some((item) => item.category === category)) {
      evidence.push(Object.freeze({
        category,
        sourceId: null,
        observedAt: null,
        freshness: "UNAVAILABLE",
        availability: "UNAVAILABLE",
        payload: null,
        unavailableReason: `${category} evidence was unavailable at Signal creation.`,
      }))
    }
  }
  const created = createContextSnapshot({
    signalId: candidate.signalId,
    signalSnapshotId: candidate.snapshotId,
    snapshotVersion: 1,
    capturedAt: candidate.createdAt,
    evidence,
  })
  if (created.success === false) {
    return Object.freeze({ success: false, reason: "Context Snapshot Runtime rejected capture-time evidence." })
  }
  const finalized = transitionContextSnapshot(created.value, "FINALIZED")
  return finalized.success
    ? Object.freeze({ success: true, value: finalized.value })
    : Object.freeze({ success: false, reason: "Context Snapshot Runtime could not finalize the snapshot." })
}

function completionIntent(
  candidate: ScannerSignalSnapshotCandidate,
  contextSnapshot: ContextSnapshot,
  completedAt: string,
): OperationalRecordPersistenceIntent {
  return Object.freeze({
    operationalRecord: Object.freeze({
      operationalType: "JobState" as const,
      recordId: `signal-capture-complete-v2:${encodeURIComponent(contextSnapshot.identity.contextSnapshotId)}`,
      operationalVersion: "signal-capture-context-pilot-v1",
      schemaVersion: 1,
      createdAt: completedAt,
      parentRefs: Object.freeze([
        Object.freeze({ recordKind: "SIGNAL_SNAPSHOT" as const, recordId: candidate.snapshotId }),
        Object.freeze({ recordKind: "CONTEXT_SNAPSHOT" as const, recordId: contextSnapshot.identity.contextSnapshotId }),
      ]),
      payload: Object.freeze({
        jobType: "SignalCapture",
        signalSnapshotId: candidate.snapshotId,
        contextSnapshotId: contextSnapshot.identity.contextSnapshotId,
        completedAt,
        status: "SUCCEEDED",
      }),
    }),
    recordedAt: completedAt,
  })
}

export function createSignalCaptureHandler(options: {
  readonly request: LocalRunRequest
  readonly repository: PersistenceRepository | null
  readonly onCaptured?: (candidate: ScannerSignalSnapshotCandidate, contextSnapshot: ContextSnapshot) => void
}): WorkerJobHandler {
  return async (context) => {
    const candidate = createScannerSignalSnapshotCandidate(
      options.request.metadata.scannerOpportunity,
      options.request.requestedAt,
    )
    if (candidate.success === false) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "SCANNER_OUTPUT_UNAVAILABLE",
          message: candidate.reason,
          retryable: false,
        }),
      })
    }

    const contextSnapshot = createSignalContextSnapshot(
      candidate.value,
      options.request.metadata.contextEvidence,
      options.request.metadata,
    )
    if (contextSnapshot.success === false) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "CONTEXT_SNAPSHOT_INPUT_INVALID",
          message: contextSnapshot.reason,
          retryable: false,
        }),
      })
    }

    const signalReference = Object.freeze({
      recordId: candidate.value.snapshotId,
      recordKind: "SIGNAL_SNAPSHOT",
    })
    const contextReference = Object.freeze({
      recordId: contextSnapshot.value.identity.contextSnapshotId,
      recordKind: "CONTEXT_SNAPSHOT",
    })
    const references = Object.freeze([signalReference, contextReference])
    if (options.request.dryRun) {
      options.onCaptured?.(candidate.value, contextSnapshot.value)
      return Object.freeze({
        success: true,
        value: Object.freeze({
          producedRecords: references,
          nextExecutionIds: Object.freeze([]),
        }),
      })
    }
    if (options.repository === null) {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: "STORAGE_UNAVAILABLE",
          message: "Signal Snapshot persistence is unavailable.",
          retryable: true,
        }),
      })
    }

    const saved = await options.repository.saveSignalSnapshot({
      snapshotId: candidate.value.snapshotId,
      signalId: candidate.value.signalId,
      schemaVersion: candidate.value.schemaVersion,
      createdAt: candidate.value.createdAt,
      recordedAt: context.startedAt,
      payload: candidate.value,
    })
    if (saved.status !== "SUCCESS" && saved.status !== "DUPLICATE") {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR"
            ? "STORAGE_UNAVAILABLE"
            : "SIGNAL_CAPTURE_FAILED",
          message: "Signal Snapshot could not be persisted through Repository.",
          retryable: saved.status === "UNAVAILABLE" || saved.status === "ADAPTER_ERROR",
        }),
      })
    }
    const contextSaved = await options.repository.saveRuntimeRecord({
      recordKind: "CONTEXT_SNAPSHOT",
      runtimeRecord: contextSnapshot.value,
      recordedAt: context.startedAt,
    })
    if (contextSaved.status === "DUPLICATE") {
      const existing = await options.repository.getStorageRecord({
        recordId: contextSnapshot.value.identity.contextSnapshotId,
        recordKind: "CONTEXT_SNAPSHOT",
      })
      const existingContext = existing.status === "SUCCESS"
        ? validateContextSnapshot(existing.value.payload)
        : null
      const existingSerialized = existingContext?.success
        ? serializeContextSnapshot(existingContext.value)
        : null
      const incomingSerialized = serializeContextSnapshot(contextSnapshot.value)
      if (!existingSerialized?.success
        || incomingSerialized.success === false
        || existingSerialized.value !== incomingSerialized.value) {
        return Object.freeze({
          success: false,
          error: Object.freeze({
            code: "CONTEXT_SNAPSHOT_CONFLICT",
            message: "Context Snapshot identity already exists with different immutable evidence.",
            retryable: false,
          }),
        })
      }
    } else if (contextSaved.status !== "SUCCESS") {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: contextSaved.status === "UNAVAILABLE" || contextSaved.status === "ADAPTER_ERROR"
            ? "STORAGE_UNAVAILABLE"
            : "CONTEXT_SNAPSHOT_PERSISTENCE_FAILED",
          message: "Context Snapshot could not be persisted through Repository.",
          retryable: contextSaved.status === "UNAVAILABLE" || contextSaved.status === "ADAPTER_ERROR",
        }),
      })
    }
    const completion = await options.repository.saveOperationalRecord(
      completionIntent(candidate.value, contextSnapshot.value, context.startedAt),
    )
    if (completion.status !== "SUCCESS" && completion.status !== "DUPLICATE") {
      return Object.freeze({
        success: false,
        error: Object.freeze({
          code: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR"
            ? "STORAGE_UNAVAILABLE"
            : "CONTEXT_SNAPSHOT_PERSISTENCE_FAILED",
          message: "Signal and Context Snapshot completion could not be persisted through Repository.",
          retryable: completion.status === "UNAVAILABLE" || completion.status === "ADAPTER_ERROR",
        }),
      })
    }
    options.onCaptured?.(candidate.value, contextSnapshot.value)
    return Object.freeze({
      success: true,
      value: Object.freeze({
        producedRecords: references,
        nextExecutionIds: Object.freeze([]),
      }),
    })
  }
}
