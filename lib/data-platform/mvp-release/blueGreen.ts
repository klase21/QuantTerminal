import { canonicalChecksum } from "@/lib/data-platform/contracts"

export const MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION = "mvp-blue-green-release/1.0.0" as const
export const MVP_BLUE_GREEN_RELEASE_MODE = "IMMUTABLE_CANDIDATE_DATABASE" as const
export const MVP_BLUE_GREEN_PRODUCTION_PARENT_BRANCH_ID = "br-flat-grass-ao9rtnyr" as const
export const MVP_BLUE_GREEN_PRODUCTION_PARENT_DATABASE = "neondb" as const
export const MVP_BLUE_GREEN_REQUIRED_SYMBOLS = Object.freeze([
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
] as const)
export const MVP_BLUE_GREEN_REQUIRED_DATASETS = Object.freeze([
  "ohlcv",
  "open-interest",
  "funding",
  "agg-trade",
] as const)

export type MvpBlueGreenReleaseState =
  | "BUILDING"
  | "FROZEN"
  | "CERTIFIED"
  | "PREVIEW_VERIFIED"
  | "PROMOTION_READY"
  | "PROMOTED"
  | "ROLLED_BACK"
  | "REJECTED"
  | "ARCHIVED"

export interface MvpBlueGreenSourceDay {
  readonly start: string
  readonly end: string
  readonly archiveChecks: readonly {
    readonly dataset: Exclude<typeof MVP_BLUE_GREEN_REQUIRED_DATASETS[number], "funding">
    readonly instrument: typeof MVP_BLUE_GREEN_REQUIRED_SYMBOLS[number]
    readonly available: boolean
    readonly finalized: boolean
    readonly checksumState: "VERIFIED" | "NOT_VERIFIED" | "MISMATCH"
  }[]
  readonly fundingChecks: readonly {
    readonly instrument: typeof MVP_BLUE_GREEN_REQUIRED_SYMBOLS[number]
    readonly providerId: string
    readonly events: readonly {
      readonly eventTime: string
      readonly sourceChecksum: string
    }[]
    readonly checksumState: "VERIFIED" | "NOT_VERIFIED" | "MISMATCH"
  }[]
}

export interface MvpBlueGreenBranchPlan {
  readonly schemaVersion: typeof MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION
  readonly projectId: string
  readonly parentBranchId: string
  readonly databaseName: string
  readonly applicationCommit: string
  readonly currentWatermark: string
  readonly governedThrough: string
  readonly branchName: string
  readonly incrementalWindows: readonly { readonly start: string; readonly end: string }[]
  readonly planChecksum: string
}

export interface MvpBlueGreenReleaseUnit {
  readonly schemaVersion: typeof MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION
  readonly state: MvpBlueGreenReleaseState
  readonly applicationCommit: string
  readonly projectId: string
  readonly parentBranchId: string
  readonly branchId: string
  readonly branchName: string
  readonly databaseName: string
  readonly readerRole: "mvp_serving_reader"
  readonly targetFingerprint: string
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly memberSetChecksum: string
  readonly commonWatermarkChecksum: string
  readonly governedThrough: string
  readonly counts: Readonly<{
    projections: number
    evidence: number
    replay: number
    members: number
    manifests: number
  }>
  readonly replayProjectionIds: Readonly<Record<typeof MVP_BLUE_GREEN_REQUIRED_SYMBOLS[number], string>>
  readonly previewDeploymentId: string | null
  readonly previewDeploymentCommit: string | null
  readonly receiptChecksums: Readonly<{
    health: string | null
    dashboard: string | null
    scanner: string | null
    trade: string | null
    replay: string | null
  }>
  readonly releaseChecksum: string
}

const DAY_MS = 86_400_000
const CHECKSUM = /^[0-9a-f]{64}$/
const COMMIT = /^[0-9a-f]{40}$/
const BRANCH = /^br-[a-z0-9-]+$/
const RELEASE_BRANCH = /^mvp-release-\d{4}-\d{2}-\d{2}-[0-9a-f]{12}$/

function exactIso(value: string, code: string): number {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error(code)
  return parsed
}

function uniqueExact<T extends string>(actual: readonly T[], required: readonly T[]): boolean {
  return actual.length === required.length
    && new Set(actual).size === required.length
    && [...actual].sort().join(",") === [...required].sort().join(",")
}

export function createMvpBlueGreenIncrementalWindows(currentWatermark: string, governedThrough: string) {
  const start = exactIso(currentWatermark, "MVP_BLUE_GREEN_CURRENT_WATERMARK_INVALID")
  const end = exactIso(governedThrough, "MVP_BLUE_GREEN_GOVERNED_THROUGH_INVALID")
  if (start % DAY_MS !== 0 || end % DAY_MS !== 0 || end <= start) throw new Error("MVP_BLUE_GREEN_INCREMENTAL_RANGE_INVALID")
  const windows: { start: string; end: string }[] = []
  for (let cursor = start; cursor < end; cursor += DAY_MS) {
    windows.push(Object.freeze({ start: new Date(cursor).toISOString(), end: new Date(cursor + DAY_MS).toISOString() }))
  }
  return Object.freeze(windows)
}

export function verifyMvpBlueGreenSourceDay(day: MvpBlueGreenSourceDay): boolean {
  const start = exactIso(day.start, "MVP_BLUE_GREEN_SOURCE_DAY_START_INVALID")
  const end = exactIso(day.end, "MVP_BLUE_GREEN_SOURCE_DAY_END_INVALID")
  if (end - start !== DAY_MS || start % DAY_MS !== 0) return false
  const archiveKinds = ["ohlcv", "open-interest", "agg-trade"] as const
  for (const dataset of archiveKinds) {
    const checks = day.archiveChecks.filter((item) => item.dataset === dataset)
    if (!uniqueExact(checks.map((item) => item.instrument), MVP_BLUE_GREEN_REQUIRED_SYMBOLS)) return false
    if (checks.some((item) => !item.available || !item.finalized || item.checksumState !== "VERIFIED")) return false
  }
  if (!uniqueExact(day.fundingChecks.map((item) => item.instrument), MVP_BLUE_GREEN_REQUIRED_SYMBOLS)) return false
  return day.fundingChecks.every((item) => {
    const timestamps = item.events.map((event) => event.eventTime)
    return item.providerId.trim().length > 0
      && item.events.length > 0
      && item.checksumState === "VERIFIED"
      && new Set(timestamps).size === timestamps.length
      && item.events.every((event) => {
        try {
          const eventTime = exactIso(event.eventTime, "MVP_BLUE_GREEN_FUNDING_EVENT_TIME_INVALID")
          return eventTime >= start && eventTime < end && CHECKSUM.test(event.sourceChecksum)
        } catch { return false }
      })
  })
}

export function discoverLatestMvpBlueGreenWatermark(currentWatermark: string, days: readonly MvpBlueGreenSourceDay[]) {
  const current = exactIso(currentWatermark, "MVP_BLUE_GREEN_CURRENT_WATERMARK_INVALID")
  const ordered = [...days].sort((left, right) => left.start.localeCompare(right.start))
  let cursor = current
  const accepted: MvpBlueGreenSourceDay[] = []
  for (const day of ordered) {
    if (Date.parse(day.start) < current) continue
    if (Date.parse(day.start) !== cursor || !verifyMvpBlueGreenSourceDay(day)) break
    accepted.push(day)
    cursor = Date.parse(day.end)
  }
  const status = accepted.length ? "COMPLETE_WATERMARK_FOUND" as const : "NO_NEW_COMPLETE_WATERMARK" as const
  const governedThrough = accepted.at(-1)?.end ?? currentWatermark
  const basis = { schemaVersion: MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION, status, currentWatermark, governedThrough, acceptedDays: accepted.map((day) => ({ start: day.start, end: day.end })) }
  return Object.freeze({ ...basis, checksum: canonicalChecksum(basis) })
}

export function createMvpBlueGreenBranchPlan(input: {
  readonly projectId: string
  readonly parentBranchId: string
  readonly databaseName: string
  readonly applicationCommit: string
  readonly currentWatermark: string
  readonly governedThrough: string
}): MvpBlueGreenBranchPlan {
  if (!input.projectId.trim() || input.parentBranchId !== MVP_BLUE_GREEN_PRODUCTION_PARENT_BRANCH_ID || !/^[a-z][a-z0-9_]{0,62}$/.test(input.databaseName) || !COMMIT.test(input.applicationCommit)) throw new Error("MVP_BLUE_GREEN_BRANCH_BINDING_INVALID")
  const incrementalWindows = createMvpBlueGreenIncrementalWindows(input.currentWatermark, input.governedThrough)
  const planBasis = {
    projectId: input.projectId,
    parentBranchId: input.parentBranchId,
    database: MVP_BLUE_GREEN_PRODUCTION_PARENT_DATABASE,
    applicationCommit: input.applicationCommit,
    from: input.currentWatermark,
    through: input.governedThrough,
    symbols: MVP_BLUE_GREEN_REQUIRED_SYMBOLS,
  }
  const planChecksum = canonicalChecksum(planBasis)
  const branchName = `mvp-release-${input.governedThrough.slice(0, 10)}-${planChecksum.slice(0, 12)}`
  return Object.freeze({ schemaVersion: MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION, ...input, branchName, incrementalWindows, planChecksum })
}

const transitions: Readonly<Record<MvpBlueGreenReleaseState, readonly MvpBlueGreenReleaseState[]>> = Object.freeze({
  BUILDING: ["FROZEN", "REJECTED"],
  FROZEN: ["CERTIFIED", "REJECTED"],
  CERTIFIED: ["PREVIEW_VERIFIED", "REJECTED"],
  PREVIEW_VERIFIED: ["PROMOTION_READY", "REJECTED"],
  PROMOTION_READY: ["PROMOTED", "REJECTED", "ARCHIVED"],
  PROMOTED: ["ROLLED_BACK", "ARCHIVED"],
  ROLLED_BACK: ["ARCHIVED"],
  REJECTED: ["ARCHIVED"],
  ARCHIVED: [],
})

export function transitionMvpBlueGreenRelease(state: MvpBlueGreenReleaseState, next: MvpBlueGreenReleaseState): MvpBlueGreenReleaseState {
  if (!transitions[state].includes(next)) throw new Error(`MVP_BLUE_GREEN_RELEASE_TRANSITION_INVALID:${state}:${next}`)
  return next
}

function releaseBasis(input: Omit<MvpBlueGreenReleaseUnit, "releaseChecksum">) {
  return {
    ...input,
    counts: { ...input.counts },
    replayProjectionIds: Object.fromEntries(Object.entries(input.replayProjectionIds).sort(([a], [b]) => a.localeCompare(b))),
    receiptChecksums: { ...input.receiptChecksums },
  }
}

export function createMvpBlueGreenReleaseUnit(input: Omit<MvpBlueGreenReleaseUnit, "schemaVersion" | "releaseChecksum">): MvpBlueGreenReleaseUnit {
  if (!COMMIT.test(input.applicationCommit) || !BRANCH.test(input.parentBranchId) || !BRANCH.test(input.branchId) || !RELEASE_BRANCH.test(input.branchName)) throw new Error("MVP_BLUE_GREEN_RELEASE_TARGET_INVALID")
  if (input.branchId === input.parentBranchId || input.databaseName === "neondb") throw new Error("MVP_BLUE_GREEN_RELEASE_MUST_USE_SEPARATE_DATABASE")
  if (input.targetFingerprint !== `neon:${input.projectId}/${input.branchId}/${input.databaseName}` || input.readerRole !== "mvp_serving_reader") throw new Error("MVP_BLUE_GREEN_RELEASE_FINGERPRINT_INVALID")
  if (!input.candidateId.startsWith("mvp8i-candidate:") || ![input.candidateChecksum, input.memberSetChecksum, input.commonWatermarkChecksum].every((value) => CHECKSUM.test(value))) throw new Error("MVP_BLUE_GREEN_RELEASE_IDENTITY_INVALID")
  if (input.candidateId !== `mvp8i-candidate:${input.candidateChecksum}`) throw new Error("MVP_BLUE_GREEN_RELEASE_CANDIDATE_CHECKSUM_MISMATCH")
  exactIso(input.governedThrough, "MVP_BLUE_GREEN_RELEASE_WATERMARK_INVALID")
  if (input.counts.projections !== 62 || input.counts.evidence !== 6 || input.counts.replay !== 6 || input.counts.members !== 74 || input.counts.manifests !== 1) throw new Error("MVP_BLUE_GREEN_RELEASE_COUNTS_INVALID")
  const replayEntries = Object.entries(input.replayProjectionIds)
  if (!uniqueExact(replayEntries.map(([symbol]) => symbol as typeof MVP_BLUE_GREEN_REQUIRED_SYMBOLS[number]), MVP_BLUE_GREEN_REQUIRED_SYMBOLS) || replayEntries.some(([, id]) => !id)) throw new Error("MVP_BLUE_GREEN_RELEASE_REPLAY_BINDING_INVALID")
  if (["PREVIEW_VERIFIED", "PROMOTION_READY", "PROMOTED", "ROLLED_BACK"].includes(input.state)) {
    if (!input.previewDeploymentId || input.previewDeploymentCommit !== input.applicationCommit) throw new Error("MVP_BLUE_GREEN_RELEASE_PREVIEW_BINDING_INVALID")
    if (Object.values(input.receiptChecksums).some((value) => !value || !CHECKSUM.test(value))) throw new Error("MVP_BLUE_GREEN_RELEASE_RECEIPTS_INCOMPLETE")
  }
  const { schemaVersion: _schemaVersion, releaseChecksum: _releaseChecksum, ...immutableInput } = input as MvpBlueGreenReleaseUnit
  const basis = releaseBasis({ schemaVersion: MVP_BLUE_GREEN_RELEASE_SCHEMA_VERSION, ...immutableInput })
  return Object.freeze({ ...basis, releaseChecksum: canonicalChecksum(basis) }) as MvpBlueGreenReleaseUnit
}

export function assertMvpBlueGreenReleaseImmutable(before: MvpBlueGreenReleaseUnit, after: MvpBlueGreenReleaseUnit): void {
  const mutable = new Set(["state", "previewDeploymentId", "previewDeploymentCommit", "receiptChecksums", "releaseChecksum"])
  for (const key of Object.keys(before) as (keyof MvpBlueGreenReleaseUnit)[]) {
    if (mutable.has(key)) continue
    if (canonicalChecksum(before[key]) !== canonicalChecksum(after[key])) throw new Error(`MVP_BLUE_GREEN_FROZEN_RELEASE_MUTATED:${String(key)}`)
  }
  transitionMvpBlueGreenRelease(before.state, after.state)
}

export function expectedMvpBlueGreenReplayShape(start: string, end: string, fundingEventCounts?: readonly number[]) {
  const duration = exactIso(end, "MVP_BLUE_GREEN_REPLAY_END_INVALID") - exactIso(start, "MVP_BLUE_GREEN_REPLAY_START_INVALID")
  if (duration <= 0 || duration % DAY_MS !== 0) throw new Error("MVP_BLUE_GREEN_REPLAY_INTERVAL_INVALID")
  const days = duration / DAY_MS
  const counts = fundingEventCounts ?? Array.from({ length: days }, () => 3)
  if (counts.length !== days || counts.some((count) => !Number.isSafeInteger(count) || count < 1)) throw new Error("MVP_BLUE_GREEN_REPLAY_FUNDING_COUNTS_INVALID")
  return Object.freeze({ price: 288 * days, openInterest: 288 * days, funding: counts.reduce((total, count) => total + count, 0), flow: 48 * days })
}
