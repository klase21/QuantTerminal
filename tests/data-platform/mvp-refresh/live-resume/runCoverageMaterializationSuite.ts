import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpEvidenceWindowData } from "@/lib/data-platform/consistency"
import { MvpCoverageStore, type MvpBoundedCoverageResult } from "@/lib/data-platform/consistency-evidence/postgres"
import {
  createExpectedLiveResumeCoverage,
  LIVE_RESUME_COVERAGE_DATASETS,
  LIVE_RESUME_COVERAGE_POLICY_VERSION_ID,
  materializeLiveResumeCoverage,
} from "@/lib/data-platform/mvp-refresh"

const start = "2026-07-16T00:00:00.000Z"
const end = "2026-07-17T00:00:00.000Z"
const instruments = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])

function windows(): readonly MvpEvidenceWindowData[] {
  return Object.freeze(instruments.map((instrument, instrumentIndex) => {
    const coverageInputs = LIVE_RESUME_COVERAGE_DATASETS.flatMap((datasetId, datasetIndex) =>
      Array.from({ length: datasetId === "ohlcv" ? 2 : 1 }, (_, commitIndex) => Object.freeze({
        commitId: `commit:${instrument}:${datasetId}:${commitIndex}`,
        checksum: canonicalChecksum({ instrument, datasetId, commitIndex }),
        datasetId,
        providerId: datasetId === "funding" ? "binance-official-rest" : "binance-vision",
        providerSnapshotId: `snapshot:${datasetId}:${instrumentIndex}:${datasetIndex}:${commitIndex}`,
        venue: "BINANCE",
        symbol: instrument,
      })),
    )
    return Object.freeze({
      measurement: Object.freeze({
        instrument,
        eventTimeStart: start,
        eventTimeEnd: end,
        completeness: "COMPLETE",
        coverage: Object.freeze({ ohlcv: 1, openInterest: 1, funding: 1, aggTrades: 1 }),
      }),
      coverageInputs: Object.freeze(coverageInputs),
    }) as MvpEvidenceWindowData
  }))
}

function key(value: Pick<MvpBoundedCoverageResult, "datasetId" | "venue" | "subject" | "windowStart" | "windowEnd">): string {
  return [value.datasetId, value.venue, value.subject, value.windowStart, value.windowEnd].join("|")
}

function storeFixture(seed: readonly MvpBoundedCoverageResult[] = [], duplicateOnPersist = false) {
  const rows = new Map(seed.map((value) => [key(value), value]))
  let persistCalls = 0
  return {
    rows,
    persistCalls: () => persistCalls,
    store: {
      readBounded: async (scope: Parameters<typeof key>[0]) => rows.get(key(scope)) ?? null,
      persist: async ({ result }: { readonly result: MvpBoundedCoverageResult }) => {
        persistCalls += 1
        rows.set(key(result), result)
        return Object.freeze({ status: duplicateOnPersist ? "DUPLICATE" as const : "CREATED" as const, result })
      },
    },
  }
}

async function main() {
  const source = windows()
  const expected = createExpectedLiveResumeCoverage(source, start, end, instruments)
  assert.equal(expected.length, 24)
  assert.equal(LIVE_RESUME_COVERAGE_POLICY_VERSION_ID, "mvp-evidence-activation/1.0.0")
  for (const instrument of instruments) {
    const rows = expected.filter((value) => value.subject === instrument)
    assert.equal(rows.length, 4)
    assert.deepEqual(rows.map((value) => value.datasetId).sort(), [...LIVE_RESUME_COVERAGE_DATASETS])
    assert.ok(rows.every((value) => value.status === "AVAILABLE" && value.windowStart === start && value.windowEnd === end && value.sourceWatermark === end))
  }

  const concreteRows = new Map<string, string>()
  const concreteSql = {
    unsafe: async (query: string, parameters: readonly unknown[]) => {
      if (query.startsWith("SELECT pg_advisory_xact_lock")) return []
      if (query.startsWith("INSERT INTO coverage.projection_versions")) {
        const coverageVersionId = String(parameters[0]), coverageChecksum = String(parameters[14])
        if (concreteRows.has(coverageVersionId)) return []
        concreteRows.set(coverageVersionId, coverageChecksum)
        return [{ coverage_version_id: coverageVersionId }]
      }
      if (query.startsWith("SELECT coverage_checksum FROM coverage.projection_versions")) {
        const checksum = concreteRows.get(String(parameters[0]))
        return checksum ? [{ coverage_checksum: checksum }] : []
      }
      throw new Error("UNEXPECTED_CONCRETE_COVERAGE_SQL")
    },
  }
  const concreteStore = new MvpCoverageStore({
    roleIntent: "CONSISTENCY_WORKER",
    transaction: async (work: (sql: typeof concreteSql) => Promise<unknown>) => work(concreteSql),
  } as never)
  const concreteCanonical = {
    sql: {
      unsafe: async (_query: string, parameters: readonly unknown[]) => {
        const ids = parameters[0] as readonly string[]
        return expected[0]!.inputCommitIds.filter((commitId) => ids.includes(commitId)).map((commitId) => ({
          commit_id: commitId,
          dataset_id: expected[0]!.datasetId,
          provider_id: expected[0]!.providerId,
        }))
      },
    },
  }
  assert.equal((await concreteStore.persist({ canonical: concreteCanonical as never, result: expected[0]! })).status, "CREATED")
  assert.equal((await concreteStore.persist({ canonical: concreteCanonical as never, result: expected[0]! })).status, "DUPLICATE")
  const readbackStore = new MvpCoverageStore({
    roleIntent: "CONSISTENCY_WORKER",
    sql: {
      unsafe: async () => [{
        coverage_version_id: expected[0]!.coverageVersionId,
        dataset_id: expected[0]!.datasetId,
        venue: expected[0]!.venue,
        subject: expected[0]!.subject,
        window_start: new Date(expected[0]!.windowStart),
        window_end: new Date(expected[0]!.windowEnd),
        source_watermark: new Date(expected[0]!.sourceWatermark),
        source_record_set_digest: expected[0]!.sourceRecordSetDigest,
        status: expected[0]!.status,
        policy_version_id: expected[0]!.policyVersionId,
        provider_id: expected[0]!.providerId,
        provider_snapshot_ids: expected[0]!.providerSnapshotIds,
        input_commit_ids: expected[0]!.inputCommitIds,
        coverage_checksum: expected[0]!.coverageChecksum,
        computed_at: new Date(expected[0]!.computedAt),
      }],
    },
  } as never)
  assert.deepEqual(
    await readbackStore.readBounded({ datasetId: expected[0]!.datasetId, venue: expected[0]!.venue, subject: expected[0]!.subject, windowStart: start, windowEnd: end }),
    expected[0],
  )

  const first = storeFixture()
  const created = await materializeLiveResumeCoverage({ windows: source, intervalStart: start, intervalEnd: end, instruments, canonical: {} as never, store: first.store as never })
  assert.deepEqual({ created: created.created, duplicates: created.duplicates, rows: first.rows.size, calls: first.persistCalls() }, { created: 24, duplicates: 0, rows: 24, calls: 24 })

  const exact = await materializeLiveResumeCoverage({ windows: source, intervalStart: start, intervalEnd: end, instruments, canonical: {} as never, store: first.store as never })
  assert.deepEqual({ created: exact.created, duplicates: exact.duplicates, calls: first.persistCalls() }, { created: 0, duplicates: 24, calls: 24 })

  const partial = storeFixture(expected.slice(0, 5))
  const completed = await materializeLiveResumeCoverage({ windows: source, intervalStart: start, intervalEnd: end, instruments, canonical: {} as never, store: partial.store as never })
  assert.deepEqual({ created: completed.created, duplicates: completed.duplicates, rows: partial.rows.size, calls: partial.persistCalls() }, { created: 19, duplicates: 5, rows: 24, calls: 19 })

  const duplicate = storeFixture([], true)
  const duplicateResult = await materializeLiveResumeCoverage({ windows: source, intervalStart: start, intervalEnd: end, instruments, canonical: {} as never, store: duplicate.store as never })
  assert.deepEqual({ created: duplicateResult.created, duplicates: duplicateResult.duplicates, rows: duplicate.rows.size }, { created: 0, duplicates: 24, rows: 24 })

  const conflicting = Object.freeze({ ...expected[0]!, providerId: "conflicting-provider" })
  const conflict = storeFixture([conflicting])
  await assert.rejects(
    materializeLiveResumeCoverage({ windows: source, intervalStart: start, intervalEnd: end, instruments, canonical: {} as never, store: conflict.store as never }),
    /LIVE_RESUME_COVERAGE_MATERIALIZATION_CONFLICT/,
  )
  assert.equal(conflict.persistCalls(), 0)

  const historicalOutputs = source.map((window) => {
    const checksum = canonicalChecksum({ instrument: window.measurement.instrument, start, end, coverage: window.measurement.coverage })
    return Object.freeze({ identity: `mrl_coverage_${checksum}`, checksum })
  })
  const historicalLogicalOutput = Object.freeze({ identities: Object.freeze(historicalOutputs.map((value) => value.identity)), checksum: canonicalChecksum(historicalOutputs) })
  const afterMaterializationOutputs = source.map((window) => {
    const checksum = canonicalChecksum({ instrument: window.measurement.instrument, start, end, coverage: window.measurement.coverage })
    return Object.freeze({ identity: `mrl_coverage_${checksum}`, checksum })
  })
  assert.deepEqual(
    { identities: afterMaterializationOutputs.map((value) => value.identity), checksum: canonicalChecksum(afterMaterializationOutputs) },
    historicalLogicalOutput,
  )

  console.log(JSON.stringify({ status: "PASS", coverageRows: 24, instruments: 6, datasetsPerInstrument: 4, created: 24, duplicate: 24, partialCompleted: 19, conflictWrites: 0, historicalLogicalOutputPreserved: true }))
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
