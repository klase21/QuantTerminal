import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import { MVP_EVIDENCE_POLICY } from "@/lib/data-platform/consistency"
import {
  createMvpBoundedCoverageResult,
  type MvpBoundedCoverageResult,
  type MvpCoverageStore,
} from "@/lib/data-platform/consistency-evidence/postgres"
import type { IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"

export const LIVE_RESUME_COVERAGE_DATASETS = Object.freeze(["agg-trade", "funding", "ohlcv", "open-interest"] as const)
export const LIVE_RESUME_COVERAGE_POLICY_VERSION_ID = MVP_EVIDENCE_POLICY.activation

type CoverageStorePort = Pick<MvpCoverageStore, "persist" | "readBounded">
type CanonicalReadPort = Pick<IsolatedPostgresClient, "sql">

function coverageAgreementBasis(result: MvpBoundedCoverageResult) {
  return Object.freeze({
    coverageVersionId: result.coverageVersionId,
    coverageChecksum: result.coverageChecksum,
    datasetId: result.datasetId,
    subject: result.subject,
    venue: result.venue,
    providerId: result.providerId,
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
    sourceWatermark: result.sourceWatermark,
    status: result.status,
    policyVersionId: result.policyVersionId,
    providerSnapshotIds: Object.freeze([...result.providerSnapshotIds]),
    inputCommitIds: Object.freeze([...result.inputCommitIds]),
  })
}

function assertCoverageAgreement(actual: MvpBoundedCoverageResult, expected: MvpBoundedCoverageResult): void {
  if (canonicalChecksum(coverageAgreementBasis(actual)) !== canonicalChecksum(coverageAgreementBasis(expected))) {
    throw new Error(`LIVE_RESUME_COVERAGE_MATERIALIZATION_CONFLICT:${expected.subject}:${expected.datasetId}`)
  }
}

export function createExpectedLiveResumeCoverage(
  windows: readonly MvpEvidenceWindowData[],
  intervalStart: string,
  intervalEnd: string,
  instruments: readonly string[],
): readonly MvpBoundedCoverageResult[] {
  if (
    windows.length !== instruments.length
    || new Set(windows.map((window) => window.measurement.instrument)).size !== instruments.length
    || instruments.some((instrument) => !windows.some((window) => window.measurement.instrument === instrument))
  ) throw new Error("LIVE_RESUME_COVERAGE_WINDOW_GRAPH_INVALID")

  const results: MvpBoundedCoverageResult[] = []
  for (const window of windows) {
    const subject = window.measurement.instrument
    if (
      window.measurement.eventTimeStart !== intervalStart
      || window.measurement.eventTimeEnd !== intervalEnd
      || window.measurement.completeness !== "COMPLETE"
    ) throw new Error(`LIVE_RESUME_COVERAGE_WINDOW_INVALID:${subject}`)

    const groups = new Map<string, typeof window.coverageInputs>()
    for (const datasetId of LIVE_RESUME_COVERAGE_DATASETS) {
      groups.set(datasetId, Object.freeze(window.coverageInputs.filter((value) => value.datasetId === datasetId)))
    }
    if (
      window.coverageInputs.some((value) => !LIVE_RESUME_COVERAGE_DATASETS.includes(value.datasetId as (typeof LIVE_RESUME_COVERAGE_DATASETS)[number]))
      || LIVE_RESUME_COVERAGE_DATASETS.some((datasetId) => !groups.get(datasetId)?.length)
    ) throw new Error(`LIVE_RESUME_COVERAGE_DATASET_GRAPH_INVALID:${subject}`)

    for (const datasetId of LIVE_RESUME_COVERAGE_DATASETS) {
      const commits = groups.get(datasetId)!
      const venues = [...new Set(commits.map((value) => value.venue))]
      if (commits.some((value) => value.symbol !== subject || value.datasetId !== datasetId) || venues.length !== 1) {
        throw new Error(`LIVE_RESUME_COVERAGE_SCOPE_INVALID:${subject}:${datasetId}`)
      }
      results.push(createMvpBoundedCoverageResult({
        datasetId,
        venue: venues[0]!,
        subject,
        windowStart: window.measurement.eventTimeStart,
        windowEnd: window.measurement.eventTimeEnd,
        sourceWatermark: window.measurement.eventTimeEnd,
        policyVersionId: LIVE_RESUME_COVERAGE_POLICY_VERSION_ID,
        commits,
        computedAt: window.measurement.eventTimeEnd,
      }))
    }
  }
  return Object.freeze(results.sort((left, right) => left.subject.localeCompare(right.subject) || left.datasetId.localeCompare(right.datasetId)))
}

export async function materializeLiveResumeCoverage(input: {
  readonly windows: readonly MvpEvidenceWindowData[]
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly instruments: readonly string[]
  readonly canonical: CanonicalReadPort
  readonly store: CoverageStorePort
}): Promise<Readonly<{ results: readonly MvpBoundedCoverageResult[]; created: number; duplicates: number }>> {
  const expected = createExpectedLiveResumeCoverage(input.windows, input.intervalStart, input.intervalEnd, input.instruments)
  if (expected.length !== input.instruments.length * LIVE_RESUME_COVERAGE_DATASETS.length) throw new Error("LIVE_RESUME_COVERAGE_EXPECTED_COUNT_INVALID")

  const existing = await Promise.all(expected.map((result) => input.store.readBounded({
    datasetId: result.datasetId,
    venue: result.venue,
    subject: result.subject,
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
  })))
  for (let index = 0; index < expected.length; index += 1) {
    if (existing[index]) assertCoverageAgreement(existing[index]!, expected[index]!)
  }

  let created = 0, duplicates = 0
  for (let index = 0; index < expected.length; index += 1) {
    if (existing[index]) {
      duplicates += 1
      continue
    }
    const persisted = await input.store.persist({ canonical: input.canonical, result: expected[index]! })
    if (persisted.status === "CREATED") created += 1
    else if (persisted.status === "DUPLICATE") duplicates += 1
    else throw new Error("LIVE_RESUME_COVERAGE_PERSIST_STATUS_INVALID")
  }

  const readback = await Promise.all(expected.map((result) => input.store.readBounded({
    datasetId: result.datasetId,
    venue: result.venue,
    subject: result.subject,
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
  })))
  for (let index = 0; index < expected.length; index += 1) {
    if (!readback[index]) throw new Error(`LIVE_RESUME_COVERAGE_READBACK_MISSING:${expected[index]!.subject}:${expected[index]!.datasetId}`)
    assertCoverageAgreement(readback[index]!, expected[index]!)
  }
  return Object.freeze({ results: expected, created, duplicates })
}
