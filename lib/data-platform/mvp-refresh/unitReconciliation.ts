import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION } from "./boundedFunding"
import { MVP_REFRESH_INSTRUMENTS, MVP_REFRESH_MANDATORY_DATASETS, type RefreshUnitState } from "./contracts"

export type RefreshLogicalDataset = typeof MVP_REFRESH_MANDATORY_DATASETS[number]
export type RefreshLogicalInstrument = typeof MVP_REFRESH_INSTRUMENTS[number]
export type RefreshSlotAction = "REUSE_COMMITTED" | "CREATE_NEW_ON_LIVE_RESUME" | "BLOCKED_CONFLICT"
export type CommittedAttemptClassification = "EQUIVALENT_COMMITTED_ATTEMPTS" | "CONFLICTING_COMMITTED_ATTEMPTS" | "INCOMPLETE_AUDIT_DATA"
export type NonterminalAttemptClassification = "RECOVERABLE_ACQUIRED" | "ORPHANED_ACQUIRED" | "SUPERSEDED_BY_COMMITTED_LOGICAL_SLOT" | "CONTROL_PLANE_CONFLICT"

export interface RefreshLogicalSlot {
  readonly logicalSlotId: string
  readonly provider: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly contractVersion: string
}

export interface RefreshAttemptArtifactAudit {
  readonly artifactId: string
  readonly checksum: string
  readonly retrievalIdentity: string | null
  readonly contractVersion: string | null
}

export interface RefreshAttemptEventAudit {
  readonly eventKind: string
  readonly fromState: string | null
  readonly toState: string | null
  readonly occurredAt: string
}

export interface RefreshUnitAttemptAudit {
  readonly unitId: string
  readonly runId: string
  readonly instrument: RefreshLogicalInstrument
  readonly dataset: RefreshLogicalDataset
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly state: RefreshUnitState
  readonly unitChecksum: string
  readonly checkpoint: Readonly<Record<string, unknown>>
  readonly artifacts: readonly RefreshAttemptArtifactAudit[]
  readonly events: readonly RefreshAttemptEventAudit[]
  readonly lease: { readonly fencingToken: number; readonly active: boolean; readonly released: boolean } | null
}

export interface CommittedSlotResolution {
  readonly classification: CommittedAttemptClassification
  readonly authoritativeUnitId: string | null
  readonly committedUnitIds: readonly string[]
  readonly canonicalOutputFingerprint: string | null
  readonly artifactFingerprint: string | null
  readonly mismatchFields: readonly string[]
}

export interface RefreshSlotResumePlanEntry {
  readonly logicalSlotId: string
  readonly dataset: RefreshLogicalDataset
  readonly instrument: RefreshLogicalInstrument
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly action: RefreshSlotAction
  readonly authoritativeUnitId: string | null
  readonly reason: string
  readonly checkpointStartStage: "PENDING" | "VALIDATED"
  readonly blockers: readonly string[]
  readonly sourceFinalizationState: "SOURCE_AVAILABLE" | "SOURCE_NOT_FINALIZED"
  readonly ignoredAttemptIds: readonly string[]
}

export interface RefreshResumeUnitInput {
  readonly unitId: string
  readonly runId: string
  readonly instrument: RefreshLogicalInstrument
  readonly datasetId: RefreshLogicalDataset
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly checksum: string
}

const PROVIDER_BY_DATASET: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({
  ohlcv: "binance-vision",
  "open-interest": "binance-vision",
  funding: "binance-official-rest",
  "agg-trade": "binance-vision",
})

const CONTRACT_BY_DATASET: Readonly<Record<RefreshLogicalDataset, string>> = Object.freeze({
  ohlcv: "mvp-bounded-ohlcv/1.0.0",
  "open-interest": "mvp-bounded-open-interest/1.0.0",
  funding: BOUNDED_FUNDING_SOURCE_CONTRACT_VERSION,
  "agg-trade": "mvp-bounded-agg-trade/1.0.0",
})

function exactIso(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error("REFRESH_LOGICAL_SLOT_TIMESTAMP_INVALID")
  return value
}

export function createRefreshLogicalSlot(input: Omit<RefreshLogicalSlot, "logicalSlotId">): RefreshLogicalSlot {
  if (!MVP_REFRESH_MANDATORY_DATASETS.includes(input.dataset) || !MVP_REFRESH_INSTRUMENTS.includes(input.instrument)) throw new Error("REFRESH_LOGICAL_SLOT_INVALID")
  const intervalStart = exactIso(input.intervalStart), intervalEnd = exactIso(input.intervalEnd)
  if (Date.parse(intervalEnd) <= Date.parse(intervalStart) || !input.provider.trim() || !input.contractVersion.trim()) throw new Error("REFRESH_LOGICAL_SLOT_INVALID")
  const basis = { provider: input.provider, dataset: input.dataset, instrument: input.instrument, intervalStart, intervalEnd, contractVersion: input.contractVersion }
  return Object.freeze({ logicalSlotId: `mrsl_${canonicalChecksum(basis)}`, ...basis })
}

export function createMandatoryRefreshLogicalSlots(intervalStart: string, intervalEnd: string): readonly RefreshLogicalSlot[] {
  return Object.freeze(MVP_REFRESH_MANDATORY_DATASETS.flatMap((dataset) => MVP_REFRESH_INSTRUMENTS.map((instrument) => createRefreshLogicalSlot({ provider: PROVIDER_BY_DATASET[dataset], dataset, instrument, intervalStart, intervalEnd, contractVersion: CONTRACT_BY_DATASET[dataset] }))))
}

function canonicalOutputs(checkpoint: Readonly<Record<string, unknown>>): readonly Readonly<Record<string, unknown>>[] | null {
  const direct = checkpoint.canonicalCommitResults
  if (Array.isArray(direct) && direct.length) return Object.freeze(direct.map((value) => Object.freeze(value as Record<string, unknown>)))
  const digest = checkpoint.factDigest
  if (typeof digest === "string" && digest) return Object.freeze([Object.freeze({ factDigest: digest })])
  return null
}

function committedAt(attempt: RefreshUnitAttemptAudit): string {
  return attempt.events.find((event) => event.toState === "COMMITTED")?.occurredAt ?? "9999-12-31T23:59:59.999Z"
}

export function reconcileCommittedAttempts(attempts: readonly RefreshUnitAttemptAudit[]): CommittedSlotResolution {
  const committed = attempts.filter((attempt) => attempt.state === "COMMITTED" || attempt.state === "VALIDATED" || attempt.state === "MATERIALIZED" || attempt.state === "COMPLETE")
  if (!committed.length) return Object.freeze({ classification: "INCOMPLETE_AUDIT_DATA", authoritativeUnitId: null, committedUnitIds: Object.freeze([]), canonicalOutputFingerprint: null, artifactFingerprint: null, mismatchFields: Object.freeze(["NO_COMMITTED_ATTEMPT"]) })
  const outputs = committed.map((attempt) => canonicalOutputs(attempt.checkpoint))
  const missing: string[] = []
  if (outputs.some((value) => value === null)) missing.push("CANONICAL_OUTPUT_IDENTITY_OR_CHECKSUM")
  const contractVersions = committed.map((attempt) => [...new Set(attempt.artifacts.map((artifact) => artifact.contractVersion).filter(Boolean))].sort())
  if (contractVersions.some((value) => value.length !== 1)) missing.push("SOURCE_CONTRACT_VERSION")
  if (outputs.some((value) => value === null)) return Object.freeze({ classification: "INCOMPLETE_AUDIT_DATA", authoritativeUnitId: null, committedUnitIds: Object.freeze(committed.map((value) => value.unitId).sort()), canonicalOutputFingerprint: null, artifactFingerprint: null, mismatchFields: Object.freeze(missing.sort()) })
  const outputFingerprints = outputs.map((value) => canonicalChecksum(value!))
  const artifactFingerprints = committed.map((attempt) => canonicalChecksum(attempt.artifacts.map((artifact) => ({ checksum: artifact.checksum, retrievalIdentity: artifact.retrievalIdentity, contractVersion: artifact.contractVersion })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))))
  const mismatches: string[] = []
  if (new Set(outputFingerprints).size !== 1) mismatches.push("CANONICAL_OUTPUT")
  if (new Set(artifactFingerprints).size !== 1) mismatches.push("RETRIEVAL_OR_ARTIFACT")
  if (new Set(contractVersions.map((value) => value.join("|"))).size !== 1) mismatches.push("SOURCE_CONTRACT_VERSION")
  if (mismatches.length) return Object.freeze({ classification: "CONFLICTING_COMMITTED_ATTEMPTS", authoritativeUnitId: null, committedUnitIds: Object.freeze(committed.map((value) => value.unitId).sort()), canonicalOutputFingerprint: null, artifactFingerprint: null, mismatchFields: Object.freeze([...new Set([...mismatches, ...missing])].sort()) })
  if (missing.length) return Object.freeze({ classification: "INCOMPLETE_AUDIT_DATA", authoritativeUnitId: null, committedUnitIds: Object.freeze(committed.map((value) => value.unitId).sort()), canonicalOutputFingerprint: outputFingerprints[0]!, artifactFingerprint: null, mismatchFields: Object.freeze(missing.sort()) })
  const authoritative = [...committed].sort((a, b) => committedAt(a).localeCompare(committedAt(b)) || a.unitId.localeCompare(b.unitId))[0]!
  return Object.freeze({ classification: "EQUIVALENT_COMMITTED_ATTEMPTS", authoritativeUnitId: authoritative.unitId, committedUnitIds: Object.freeze(committed.map((value) => value.unitId).sort()), canonicalOutputFingerprint: outputFingerprints[0]!, artifactFingerprint: artifactFingerprints[0]!, mismatchFields: Object.freeze([]) })
}

export function classifyNonterminalAttempt(attempt: RefreshUnitAttemptAudit, committed: CommittedSlotResolution): NonterminalAttemptClassification {
  if (attempt.state !== "ACQUIRED") return "CONTROL_PLANE_CONFLICT"
  if (committed.classification === "EQUIVALENT_COMMITTED_ATTEMPTS") return "SUPERSEDED_BY_COMMITTED_LOGICAL_SLOT"
  if (committed.classification === "CONFLICTING_COMMITTED_ATTEMPTS") return "CONTROL_PLANE_CONFLICT"
  const hasEvidence = attempt.artifacts.length > 0 && Object.keys(attempt.checkpoint).length > 0
  if (!hasEvidence || !attempt.lease?.active) return "ORPHANED_ACQUIRED"
  return "RECOVERABLE_ACQUIRED"
}

export function buildRefreshSlotResumePlan(input: { readonly intervalStart: string; readonly intervalEnd: string; readonly attempts: readonly RefreshUnitAttemptAudit[]; readonly sourceFinalizationState?: "SOURCE_AVAILABLE" | "SOURCE_NOT_FINALIZED" }): readonly RefreshSlotResumePlanEntry[] {
  const slots = createMandatoryRefreshLogicalSlots(input.intervalStart, input.intervalEnd)
  return Object.freeze(slots.map((slot) => {
    const attempts = input.attempts.filter((attempt) => attempt.dataset === slot.dataset && attempt.instrument === slot.instrument && attempt.intervalStart === slot.intervalStart && attempt.intervalEnd === slot.intervalEnd)
    const resolution = reconcileCommittedAttempts(attempts)
    const nonterminal = attempts.filter((attempt) => attempt.state === "ACQUIRED")
    if (resolution.classification === "CONFLICTING_COMMITTED_ATTEMPTS") return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, action: "BLOCKED_CONFLICT" as const, authoritativeUnitId: null, reason: resolution.classification, checkpointStartStage: "PENDING" as const, blockers: Object.freeze([...resolution.mismatchFields]), sourceFinalizationState: input.sourceFinalizationState ?? "SOURCE_AVAILABLE", ignoredAttemptIds: Object.freeze(attempts.filter((attempt) => attempt.state === "ACQUIRED").map((attempt) => attempt.unitId).sort()) })
    if (resolution.classification === "EQUIVALENT_COMMITTED_ATTEMPTS") return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, action: "REUSE_COMMITTED" as const, authoritativeUnitId: resolution.authoritativeUnitId, reason: resolution.classification, checkpointStartStage: "VALIDATED" as const, blockers: Object.freeze([]), sourceFinalizationState: input.sourceFinalizationState ?? "SOURCE_AVAILABLE", ignoredAttemptIds: Object.freeze(attempts.filter((attempt) => attempt.unitId !== resolution.authoritativeUnitId).map((attempt) => attempt.unitId).sort()) })
    const blockers = resolution.committedUnitIds.length ? [...resolution.mismatchFields] : attempts.some((attempt) => attempt.state !== "ACQUIRED") ? ["UNRESOLVED_HISTORICAL_ATTEMPT"] : []
    return Object.freeze({ logicalSlotId: slot.logicalSlotId, dataset: slot.dataset, instrument: slot.instrument, intervalStart: slot.intervalStart, intervalEnd: slot.intervalEnd, action: blockers.length ? "BLOCKED_CONFLICT" as const : "CREATE_NEW_ON_LIVE_RESUME" as const, authoritativeUnitId: null, reason: resolution.committedUnitIds.length ? resolution.classification : nonterminal.length ? classifyNonterminalAttempt(nonterminal[0]!, resolution) : "LOGICAL_SLOT_MISSING", checkpointStartStage: "PENDING" as const, blockers: Object.freeze(blockers), sourceFinalizationState: input.sourceFinalizationState ?? "SOURCE_AVAILABLE", ignoredAttemptIds: Object.freeze(nonterminal.filter((attempt) => classifyNonterminalAttempt(attempt, resolution) !== "RECOVERABLE_ACQUIRED").map((attempt) => attempt.unitId).sort()) })
  }))
}

export function createMissingRefreshUnitsForResume(runId: string, plan: readonly RefreshSlotResumePlanEntry[]): readonly RefreshResumeUnitInput[] {
  if (plan.length !== 24 || plan.some((entry) => entry.action === "BLOCKED_CONFLICT")) throw new Error("REFRESH_LOGICAL_SLOT_PLAN_BLOCKED")
  return Object.freeze(plan.filter((entry) => entry.action === "CREATE_NEW_ON_LIVE_RESUME").map((entry) => {
    const basis = { runId, logicalSlotId: entry.logicalSlotId, instrument: entry.instrument, datasetId: entry.dataset, intervalStart: entry.intervalStart, intervalEnd: entry.intervalEnd }
    const checksum = canonicalChecksum(basis)
    return Object.freeze({ unitId: `mru_${checksum}`, runId, instrument: entry.instrument, datasetId: entry.dataset, intervalStart: entry.intervalStart, intervalEnd: entry.intervalEnd, checksum })
  }))
}
