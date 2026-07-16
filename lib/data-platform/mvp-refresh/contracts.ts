import { canonicalChecksum } from "@/lib/data-platform/contracts"

export const MVP_REFRESH_SCHEMA_VERSION = "mvp-refresh/1.0.0" as const
export const MVP_REFRESH_INSTRUMENTS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const)
export const MVP_REFRESH_MANDATORY_DATASETS = Object.freeze(["ohlcv", "open-interest", "funding", "agg-trade"] as const)
export const MVP_REFRESH_SUPPLEMENTAL_DATASETS = Object.freeze(["macro", "daily-market-context", "etf-flow"] as const)

export type RefreshPlanState = "DRAFT" | "READY" | "SUPERSEDED" | "CANCELLED"
export type RefreshRunState = "PLANNED" | "ACQUIRING" | "NORMALIZING" | "COMMITTING" | "VALIDATING" | "MATERIALIZING" | "COMPARING" | "READY_FOR_RELEASE_REVIEW" | "NOOP" | "BLOCKED" | "FAILED" | "CANCELLED"
export type RefreshUnitState = "PENDING" | "LEASED" | "ACQUIRED" | "NORMALIZED" | "COMMITTED" | "VALIDATED" | "MATERIALIZED" | "COMPLETE" | "UNAVAILABLE" | "BLOCKED" | "FAILED"
export type CandidateLifecycle = "BUILDING" | "VALIDATING" | "INVALID" | "READY_FOR_RELEASE_REVIEW" | "SUPERSEDED" | "RELEASED"
export type RefreshFreshnessState = "CURRENT" | "DELAYED" | "STALE" | "UNAVAILABLE" | "INCONSISTENT" | "CANDIDATE_ONLY"
export type RefreshReasonCode = "SOURCE_NOT_FINALIZED" | "SOURCE_UNAVAILABLE" | "SOURCE_GAP" | "SOURCE_CHECKSUM_MISMATCH" | "MANDATORY_WATERMARK_BEHIND" | "SUPPLEMENTAL_CONTEXT_BEHIND" | "CANDIDATE_VALIDATION_FAILED" | "CANDIDATE_NOT_ACTIVATED" | "FUNDING_REFRESH_PATH_UNAVAILABLE" | "ACTIVE_CORPUS_BEHIND_ELIGIBLE_WINDOW"
export type ReleaseChannel = "candidate" | "preview" | "production"
export type ReleaseResolutionMode = "PINNED_CORPUS" | "RELEASE_CHANNEL"

const PLAN_TRANSITIONS = { DRAFT: ["READY", "CANCELLED"], READY: ["SUPERSEDED", "CANCELLED"], SUPERSEDED: [], CANCELLED: [] } as const satisfies Readonly<Record<RefreshPlanState, readonly RefreshPlanState[]>>
const RUN_TRANSITIONS = {
  PLANNED: ["ACQUIRING", "NOOP", "BLOCKED", "CANCELLED"], ACQUIRING: ["NORMALIZING", "BLOCKED", "FAILED", "CANCELLED"], NORMALIZING: ["COMMITTING", "BLOCKED", "FAILED", "CANCELLED"], COMMITTING: ["VALIDATING", "BLOCKED", "FAILED", "CANCELLED"], VALIDATING: ["MATERIALIZING", "BLOCKED", "FAILED", "CANCELLED"], MATERIALIZING: ["COMPARING", "BLOCKED", "FAILED", "CANCELLED"], COMPARING: ["READY_FOR_RELEASE_REVIEW", "BLOCKED", "FAILED", "CANCELLED"], READY_FOR_RELEASE_REVIEW: [], NOOP: [], BLOCKED: [], FAILED: [], CANCELLED: [],
} as const satisfies Readonly<Record<RefreshRunState, readonly RefreshRunState[]>>
const UNIT_TRANSITIONS = { PENDING: ["LEASED", "UNAVAILABLE", "BLOCKED", "FAILED"], LEASED: ["ACQUIRED", "UNAVAILABLE", "BLOCKED", "FAILED"], ACQUIRED: ["NORMALIZED", "BLOCKED", "FAILED"], NORMALIZED: ["COMMITTED", "BLOCKED", "FAILED"], COMMITTED: ["VALIDATED", "BLOCKED", "FAILED"], VALIDATED: ["MATERIALIZED", "COMPLETE", "BLOCKED", "FAILED"], MATERIALIZED: ["COMPLETE", "BLOCKED", "FAILED"], COMPLETE: [], UNAVAILABLE: [], BLOCKED: [], FAILED: [] } as const satisfies Readonly<Record<RefreshUnitState, readonly RefreshUnitState[]>>
const CANDIDATE_TRANSITIONS = { BUILDING: ["VALIDATING", "INVALID"], VALIDATING: ["INVALID", "READY_FOR_RELEASE_REVIEW"], INVALID: [], READY_FOR_RELEASE_REVIEW: ["SUPERSEDED", "RELEASED"], SUPERSEDED: [], RELEASED: [] } as const satisfies Readonly<Record<CandidateLifecycle, readonly CandidateLifecycle[]>>

export const isLegalPlanTransition = (from: RefreshPlanState, to: RefreshPlanState) => (PLAN_TRANSITIONS[from] as readonly RefreshPlanState[]).includes(to)
export const isLegalRunTransition = (from: RefreshRunState, to: RefreshRunState) => (RUN_TRANSITIONS[from] as readonly RefreshRunState[]).includes(to)
export const isLegalUnitTransition = (from: RefreshUnitState, to: RefreshUnitState) => (UNIT_TRANSITIONS[from] as readonly RefreshUnitState[]).includes(to)
export const isLegalCandidateTransition = (from: CandidateLifecycle, to: CandidateLifecycle, allowRelease = false) => (CANDIDATE_TRANSITIONS[from] as readonly CandidateLifecycle[]).includes(to) && (to !== "RELEASED" || allowRelease)

export interface RefreshPolicy {
  readonly policyId: string
  readonly policyVersion: string
  readonly finalizationDelayMinutes: number
  readonly overlapHours: number
  readonly maximumCatchupDays: number
  readonly maximumRetries: number
  readonly leaseSeconds: number
  readonly checksum: string
}

export interface RefreshWindow {
  readonly requestedStart: string
  readonly requestedEnd: string
  readonly lastEligibleClosedEnd: string
  readonly unavailableInterval: { readonly start: string; readonly end: string } | null
  readonly gapInterval: { readonly start: string; readonly end: string } | null
  readonly overlapInterval: { readonly start: string; readonly end: string } | null
}

export interface SourceWatermark {
  readonly datasetId: string
  readonly sourceId: string
  readonly mandatory: boolean
  readonly observedThrough: string | null
  readonly state: "AVAILABLE" | "DELAYED" | "UNAVAILABLE" | "GAP" | "INCONSISTENT"
  readonly reasonCodes: readonly RefreshReasonCode[]
  readonly checksum: string | null
}

export interface RefreshPlan {
  readonly planId: string
  readonly policyId: string
  readonly activeCorpusId: string
  readonly activeServingChecksum: string
  readonly activeGovernedThrough: string
  readonly window: RefreshWindow
  readonly state: "READY"
  readonly checksum: string
}

export interface FreshnessSummary {
  readonly state: RefreshFreshnessState
  readonly reasonCodes: readonly RefreshReasonCode[]
  readonly observedThrough: string | null
  readonly eligibleThrough: string
  readonly pageLabel: string
  readonly pageExplanation: string
}

export interface ReleaseManifestCounts {
  readonly projections: number
  readonly evidenceSummaries: number
  readonly replaySnapshots: number
  readonly demoProfiles: number
  readonly releaseInventory: number
  readonly activeExposures: number
}

export interface CandidateCorpusDescriptor {
  readonly candidateId: string
  readonly corpusId: string
  readonly servingChecksum: string
  readonly sourceCorpusId: string
  readonly sourceCorpusChecksum: string
  readonly governedThrough: string
  readonly counts: ReleaseManifestCounts
  readonly mandatoryWatermarks: readonly SourceWatermark[]
  readonly supplementalWatermarks: readonly SourceWatermark[]
  readonly freshness: FreshnessSummary
  readonly limitations: readonly string[]
  readonly lifecycle: Exclude<CandidateLifecycle, "RELEASED">
}

export interface ReleaseManifest {
  readonly releaseManifestId: string
  readonly releaseChannel: ReleaseChannel
  readonly corpusId: string
  readonly servingChecksum: string
  readonly previousManifestId: string | null
  readonly previousServingChecksum: string | null
  readonly sourceCorpusId: string
  readonly sourceCorpusChecksum: string
  readonly schemaVersion: typeof MVP_REFRESH_SCHEMA_VERSION
  readonly generatedAt: string
  readonly governedThrough: string
  readonly counts: ReleaseManifestCounts
  readonly mandatorySourceWatermarks: readonly SourceWatermark[]
  readonly supplementalSourceWatermarks: readonly SourceWatermark[]
  readonly freshness: FreshnessSummary
  readonly limitations: readonly string[]
  readonly manifestChecksum: string
  readonly lifecycle: "CANDIDATE"
  readonly exposureEligibility: "ELIGIBLE" | "INELIGIBLE"
}

export interface ReleaseComparison {
  readonly comparisonId: string
  readonly activeCorpusId: string
  readonly candidateCorpusId: string
  readonly governedThroughDeltaMs: number
  readonly countDelta: ReleaseManifestCounts
  readonly checksumChanged: boolean
  readonly unexpectedDeletions: readonly string[]
  readonly missingMandatoryRecords: readonly string[]
  readonly routeProjectionCountImpact: Readonly<Record<string, number>>
  readonly blockerReasonCodes: readonly RefreshReasonCode[]
  readonly checksum: string
}

export interface RefreshLeaseState {
  readonly leaseKey: string
  readonly ownerId: string
  readonly fencingToken: number
  readonly expiresAt: string
  readonly released: boolean
}

function iso(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new Error("MVP_REFRESH_TIMESTAMP_INVALID")
  return new Date(parsed).toISOString()
}

export function createRefreshPolicy(input: Omit<RefreshPolicy, "policyId" | "checksum">): RefreshPolicy {
  if (!Number.isInteger(input.finalizationDelayMinutes) || input.finalizationDelayMinutes < 0 || !Number.isInteger(input.overlapHours) || input.overlapHours < 0 || !Number.isInteger(input.maximumCatchupDays) || input.maximumCatchupDays < 1 || !Number.isInteger(input.maximumRetries) || input.maximumRetries < 0 || !Number.isInteger(input.leaseSeconds) || input.leaseSeconds < 30) throw new Error("MVP_REFRESH_POLICY_INVALID")
  const basis = { schemaVersion: MVP_REFRESH_SCHEMA_VERSION, ...input }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ policyId: `mrp_${checksum}`, ...input, checksum })
}

export function resolveNextEligibleWindow(input: { readonly activeGovernedThrough: string; readonly now: string; readonly finalizationDelayMinutes: number; readonly overlapHours: number }): RefreshWindow | null {
  const active = Date.parse(iso(input.activeGovernedThrough)), now = Date.parse(iso(input.now)) - input.finalizationDelayMinutes * 60_000
  const lastEligibleClosedEnd = Math.floor(now / 86_400_000) * 86_400_000
  if (lastEligibleClosedEnd <= active) return null
  const requestedEnd = Math.min(active + 86_400_000, lastEligibleClosedEnd)
  return Object.freeze({ requestedStart: new Date(active).toISOString(), requestedEnd: new Date(requestedEnd).toISOString(), lastEligibleClosedEnd: new Date(lastEligibleClosedEnd).toISOString(), unavailableInterval: requestedEnd < lastEligibleClosedEnd ? Object.freeze({ start: new Date(requestedEnd).toISOString(), end: new Date(lastEligibleClosedEnd).toISOString() }) : null, gapInterval: null, overlapInterval: input.overlapHours ? Object.freeze({ start: new Date(Math.max(0, active - input.overlapHours * 3_600_000)).toISOString(), end: new Date(active).toISOString() }) : null })
}

export function createRefreshPlan(input: { readonly policy: RefreshPolicy; readonly activeCorpusId: string; readonly activeServingChecksum: string; readonly activeGovernedThrough: string; readonly window: RefreshWindow }): RefreshPlan {
  const basis = { schemaVersion: MVP_REFRESH_SCHEMA_VERSION, policyId: input.policy.policyId, activeCorpusId: input.activeCorpusId, activeServingChecksum: input.activeServingChecksum, activeGovernedThrough: iso(input.activeGovernedThrough), window: input.window }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ planId: `mrpl_${checksum}`, policyId: input.policy.policyId, activeCorpusId: input.activeCorpusId, activeServingChecksum: input.activeServingChecksum, activeGovernedThrough: iso(input.activeGovernedThrough), window: input.window, state: "READY", checksum })
}

export function mandatoryCommonWatermark(watermarks: readonly SourceWatermark[]): string | null {
  const mandatory = watermarks.filter((item) => item.mandatory)
  if (!mandatory.length || mandatory.some((item) => item.state !== "AVAILABLE" || !item.observedThrough)) return null
  return new Date(Math.min(...mandatory.map((item) => Date.parse(iso(item.observedThrough!))))).toISOString()
}

export function supplementalWatermark(watermarks: readonly SourceWatermark[]): string | null {
  const available = watermarks.filter((item) => !item.mandatory && item.state === "AVAILABLE" && item.observedThrough)
  return available.length ? new Date(Math.min(...available.map((item) => Date.parse(iso(item.observedThrough!))))).toISOString() : null
}

export function classifyFreshness(input: { readonly activeGovernedThrough: string; readonly candidateGovernedThrough?: string | null; readonly eligibleThrough: string; readonly watermarks: readonly SourceWatermark[]; readonly candidateActive: boolean }): FreshnessSummary {
  const mandatory = input.watermarks.filter((item) => item.mandatory), reasons = new Set<RefreshReasonCode>()
  if (mandatory.some((item) => item.state === "INCONSISTENT")) reasons.add("SOURCE_CHECKSUM_MISMATCH")
  if (mandatory.some((item) => item.state === "GAP")) reasons.add("SOURCE_GAP")
  if (mandatory.some((item) => item.state === "UNAVAILABLE")) reasons.add("SOURCE_UNAVAILABLE")
  const common = mandatoryCommonWatermark(mandatory)
  if (!common || Date.parse(common) < Date.parse(input.eligibleThrough)) reasons.add("MANDATORY_WATERMARK_BEHIND")
  if (Date.parse(input.activeGovernedThrough) < Date.parse(input.eligibleThrough)) reasons.add("ACTIVE_CORPUS_BEHIND_ELIGIBLE_WINDOW")
  if (input.candidateGovernedThrough && !input.candidateActive) reasons.add("CANDIDATE_NOT_ACTIVATED")
  const state: RefreshFreshnessState = reasons.has("SOURCE_CHECKSUM_MISMATCH") ? "INCONSISTENT" : reasons.has("SOURCE_UNAVAILABLE") ? "UNAVAILABLE" : input.candidateGovernedThrough && !input.candidateActive ? "CANDIDATE_ONLY" : Date.parse(input.activeGovernedThrough) >= Date.parse(input.eligibleThrough) ? "CURRENT" : common ? "DELAYED" : "STALE"
  const pageLabel = state === "CURRENT" ? "Current through the latest eligible closed window" : state === "CANDIDATE_ONLY" ? "A newer candidate exists but is not active" : state === "UNAVAILABLE" ? "A mandatory source is unavailable" : state === "INCONSISTENT" ? "Source validation is inconsistent" : "The active corpus is behind the latest eligible window"
  return Object.freeze({ state, reasonCodes: Object.freeze([...reasons].sort()), observedThrough: common, eligibleThrough: iso(input.eligibleThrough), pageLabel, pageExplanation: "Freshness is separate from Coverage, Consistency, Confidence, and release activation." })
}

export function acquireRefreshLease(current: RefreshLeaseState | null, input: { readonly leaseKey: string; readonly ownerId: string; readonly now: string; readonly leaseSeconds: number }): { readonly acquired: boolean; readonly lease: RefreshLeaseState } {
  const nowMs = Date.parse(iso(input.now))
  if (current && !current.released && Date.parse(current.expiresAt) > nowMs && current.ownerId !== input.ownerId) return Object.freeze({ acquired: false, lease: current })
  const lease = Object.freeze({ leaseKey: input.leaseKey, ownerId: input.ownerId, fencingToken: (current?.fencingToken ?? 0) + 1, expiresAt: new Date(nowMs + input.leaseSeconds * 1_000).toISOString(), released: false })
  return Object.freeze({ acquired: true, lease })
}

export function assertRefreshLeaseFence(lease: RefreshLeaseState, input: { readonly ownerId: string; readonly fencingToken: number; readonly now: string }): void {
  if (lease.released || lease.ownerId !== input.ownerId || lease.fencingToken !== input.fencingToken || Date.parse(lease.expiresAt) <= Date.parse(iso(input.now))) throw new Error("REFRESH_LEASE_FENCE_LOST")
}

export function createCandidateDescriptor(input: Omit<CandidateCorpusDescriptor, "candidateId">): CandidateCorpusDescriptor {
  const candidateId = `mrc_${canonicalChecksum({ schemaVersion: MVP_REFRESH_SCHEMA_VERSION, ...input })}`
  return Object.freeze({ candidateId, ...input })
}

export function createReleaseManifest(input: Omit<ReleaseManifest, "releaseManifestId" | "manifestChecksum" | "schemaVersion" | "lifecycle">): ReleaseManifest {
  if (input.releaseChannel !== "candidate") throw new Error("MVP8A_CANDIDATE_CHANNEL_ONLY")
  const basis = { schemaVersion: MVP_REFRESH_SCHEMA_VERSION, ...input, lifecycle: "CANDIDATE" as const }
  const manifestChecksum = canonicalChecksum(basis)
  return Object.freeze({ releaseManifestId: `mrm_${manifestChecksum}`, ...basis, manifestChecksum })
}

export function verifyReleaseManifest(manifest: ReleaseManifest, previous: ReleaseManifest | null = null): boolean {
  const { releaseManifestId, manifestChecksum, ...basis } = manifest
  if (releaseManifestId !== `mrm_${manifestChecksum}` || canonicalChecksum(basis) !== manifestChecksum) return false
  if (manifest.previousManifestId === null) return manifest.previousServingChecksum === null
  return Boolean(previous && previous.releaseManifestId === manifest.previousManifestId && previous.servingChecksum === manifest.previousServingChecksum && Date.parse(previous.governedThrough) <= Date.parse(manifest.governedThrough))
}

export function compareCandidateToActive(input: { readonly active: { readonly corpusId: string; readonly servingChecksum: string; readonly governedThrough: string; readonly counts: ReleaseManifestCounts; readonly requiredProjectionIds: readonly string[] }; readonly candidate: CandidateCorpusDescriptor; readonly candidateProjectionIds: readonly string[]; readonly routeProjectionCountImpact: Readonly<Record<string, number>> }): ReleaseComparison {
  const delta = (key: keyof ReleaseManifestCounts) => input.candidate.counts[key] - input.active.counts[key]
  const unexpectedDeletions = input.active.requiredProjectionIds.filter((id) => !input.candidateProjectionIds.includes(id)).sort()
  const missingMandatoryRecords = input.candidate.mandatoryWatermarks.filter((item) => item.state !== "AVAILABLE" || !item.observedThrough).map((item) => `${item.datasetId}:${item.sourceId}`).sort()
  const blockers: RefreshReasonCode[] = []
  if (unexpectedDeletions.length || missingMandatoryRecords.length) blockers.push("CANDIDATE_VALIDATION_FAILED")
  const basis = { activeCorpusId: input.active.corpusId, candidateCorpusId: input.candidate.corpusId, governedThroughDeltaMs: Date.parse(input.candidate.governedThrough) - Date.parse(input.active.governedThrough), countDelta: { projections: delta("projections"), evidenceSummaries: delta("evidenceSummaries"), replaySnapshots: delta("replaySnapshots"), demoProfiles: delta("demoProfiles"), releaseInventory: delta("releaseInventory"), activeExposures: delta("activeExposures") }, checksumChanged: input.active.servingChecksum !== input.candidate.servingChecksum, unexpectedDeletions, missingMandatoryRecords, routeProjectionCountImpact: input.routeProjectionCountImpact, blockerReasonCodes: blockers }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ comparisonId: `mrcmp_${checksum}`, ...basis, checksum })
}

export function resolveReleaseReference(input: { readonly mode: ReleaseResolutionMode; readonly pinned?: { readonly corpusId: string; readonly servingChecksum: string }; readonly channel?: ReleaseChannel; readonly manifest?: ReleaseManifest; readonly previousManifest?: ReleaseManifest | null }): { readonly corpusId: string; readonly servingChecksum: string; readonly mode: ReleaseResolutionMode } {
  if (input.mode === "PINNED_CORPUS") {
    if (!input.pinned?.corpusId || !/^[0-9a-f]{64}$/.test(input.pinned.servingChecksum)) throw new Error("PINNED_CORPUS_CONFIGURATION_INVALID")
    return Object.freeze({ ...input.pinned, mode: input.mode })
  }
  if (!input.channel || !input.manifest || input.manifest.releaseChannel !== input.channel || !verifyReleaseManifest(input.manifest, input.previousManifest ?? null) || input.manifest.exposureEligibility !== "ELIGIBLE") throw new Error("RELEASE_CHANNEL_MANIFEST_INVALID")
  return Object.freeze({ corpusId: input.manifest.corpusId, servingChecksum: input.manifest.servingChecksum, mode: input.mode })
}
