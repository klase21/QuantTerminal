import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  LocalInactiveCandidateAssemblyService,
  type ServingCorpusMember,
} from "@/lib/data-platform/mvp-serving/candidateMembership"
import type { MvpServingPostgresClient } from "@/lib/data-platform/mvp-serving/client"

const BASELINE_ID = `mvp8i-candidate:${"a".repeat(64)}`
const BASELINE_CHECKSUM = "a".repeat(64)
const BASELINE_WATERMARK = "2026-07-16T00:00:00.000Z"
const BASELINE_WATERMARK_ID = `mre_${"b".repeat(64)}`
const BASELINE_WATERMARK_CHECKSUM = "b".repeat(64)
const BASELINE_MANIFEST_ID = "mvp8i-manifest:df394d92051d3838bf737ecd6edebdfe360b3096a03b2be07bc011abc27e63a4"
const NEXT_WATERMARK = "2026-07-17T00:00:00.000Z"

const baselineMember: ServingCorpusMember = Object.freeze({
  memberKind: "PROJECTION",
  memberId: "projection:baseline",
  memberChecksum: "d".repeat(64),
  canonicalSortKey: "PROJECTION:baseline",
  inheritedSourceCorpusId: "mvp8i-verified-source:baseline",
  schemaVersion: "mvp-serving-projection/1.0.0",
  metadata: Object.freeze({ certified: true }),
})
const nextMember: ServingCorpusMember = Object.freeze({
  memberKind: "RELEASE_MANIFEST",
  memberId: "current-catchup:2026-07-17",
  memberChecksum: "e".repeat(64),
  canonicalSortKey: "TARGET_WINDOW:2026-07-17",
  inheritedSourceCorpusId: null,
  schemaVersion: "mvp-live-resume/1.0.0",
  metadata: Object.freeze({ targetWindow: true }),
})

function memberIdentity(member: ServingCorpusMember) {
  return {
    kind: member.memberKind,
    id: member.memberId,
    checksum: member.memberChecksum,
    sortKey: member.canonicalSortKey,
    inheritedSourceCorpusId: member.inheritedSourceCorpusId,
    schemaVersion: member.schemaVersion,
    metadata: member.metadata,
  }
}

function fixture() {
  const baselineMemberSetChecksum = canonicalChecksum([memberIdentity(baselineMember)])
  const baselineManifest = Object.freeze({
    candidateId: BASELINE_ID,
    servingChecksum: BASELINE_CHECKSUM,
    commonWatermarkId: BASELINE_WATERMARK_ID,
    commonWatermarkValue: BASELINE_WATERMARK,
    commonWatermarkChecksum: BASELINE_WATERMARK_CHECKSUM,
    memberSetChecksum: baselineMemberSetChecksum,
    lifecycle: "WITHHELD",
    exposure: "INTERNAL_ONLY",
    exposureEligibility: "INELIGIBLE",
  })
  const statements: string[] = []
  const active = Object.freeze({
    exposure_id: "active-exposure",
    corpus_id: "active-corpus",
    serving_checksum: "f".repeat(64),
    governed_through: "2026-07-15T00:00:00.000Z",
  })
  const activeMember = Object.freeze({ ...baselineMember, member_id: "projection:active", canonical_sort_key: "PROJECTION:active" })
  const unsafe = async (query: string, parameters: readonly unknown[] = []): Promise<unknown[]> => {
    statements.push(query)
    const corpusId = String(parameters[0] ?? "")
    if (query.includes("SELECT e.exposure_id,c.corpus_id")) return [active]
    if (query.includes("SELECT exposure_id,corpus_id,exposure_state")) return [{ ...active, exposure_state: "CONSUMER_VISIBLE", effective_from: "2026-07-15T00:00:00.000Z", checksum: "f".repeat(64), publication_note: null, created_at: "2026-07-15T00:00:00.000Z" }]
    if (query.includes("SELECT corpus_id,serving_checksum,governed_through::text,lifecycle,exposure")) {
      if (corpusId !== BASELINE_ID) return []
      return [{ corpus_id: BASELINE_ID, serving_checksum: BASELINE_CHECKSUM, governed_through: "2026-07-16 00:00:00+00", lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY" }]
    }
    if (query.includes("SELECT manifest_id,manifest_checksum,lifecycle,exposure_eligibility")) {
      if (corpusId !== BASELINE_ID) return []
      return [{
        manifest_id: BASELINE_MANIFEST_ID,
        manifest_checksum: canonicalChecksum(baselineManifest),
        lifecycle: "CANDIDATE",
        exposure_eligibility: "INELIGIBLE",
        manifest: baselineManifest,
        common_watermark_id: BASELINE_WATERMARK_ID,
        common_watermark_value: "2026-07-16 00:00:00+00",
        common_watermark_checksum: BASELINE_WATERMARK_CHECKSUM,
        member_set_checksum: baselineMemberSetChecksum,
      }]
    }
    if (query.includes("SELECT count(*)::int count FROM serving.serving_exposure WHERE corpus_id=$1")) return [{ count: 0 }]
    if (query.includes("SELECT member_kind,member_id,member_checksum")) {
      const member = corpusId === BASELINE_ID ? baselineMember : activeMember
      return [{
        member_kind: member.memberKind,
        member_id: member.memberId,
        member_checksum: member.memberChecksum,
        canonical_sort_key: member.canonicalSortKey,
        inherited_source_corpus_id: member.inheritedSourceCorpusId,
        schema_version: member.schemaVersion,
        metadata: member.metadata,
      }]
    }
    if (query.includes("SELECT c.corpus_id,c.serving_checksum")) return [active]
    if (query.includes("SELECT serving_checksum,lifecycle,exposure FROM serving.serving_corpus")) return []
    if (query.startsWith("INSERT INTO ")) return []
    throw new Error(`UNEXPECTED_TEST_SQL:${query.replace(/\s+/g, " ").slice(0, 100)}`)
  }
  const sql = Object.freeze({ unsafe })
  const client = {
    roleIntent: "PUBLISHER",
    targetKind: "LOCAL_ISOLATED",
    sql,
    transaction: async <T>(work: (transactionSql: typeof sql) => Promise<T>) => work(sql),
  } as unknown as MvpServingPostgresClient
  return { service: new LocalInactiveCandidateAssemblyService(client), statements }
}

async function main() {
  const { service, statements } = fixture()
  const active = await service.activeBaseline()
  assert.equal(active.corpusId, "active-corpus")
  assert.equal(active.servingChecksum, "f".repeat(64))
  const activeMode = await service.assemble({
    candidate: {
      corpusId: `legacy-active-candidate:${"9".repeat(64)}`,
      sourceCorpusId: active.corpusId,
      sourceCorpusChecksum: active.servingChecksum,
      governedThrough: NEXT_WATERMARK,
      schemaVersion: "mvp-serving/1.0.0",
      generatedAt: NEXT_WATERMARK,
      members: Object.freeze([...active.members, nextMember]),
      limitations: Object.freeze([]),
    },
    expectedActiveCorpusId: active.corpusId,
    expectedActiveChecksum: active.servingChecksum,
  })
  assert.equal(activeMode.status, "CREATED")
  assert.ok(statements.some((statement) => statement.includes("'CANDIDATE','ELIGIBLE'")))

  const baseline = await service.certifiedInactiveBaseline({
    candidateId: BASELINE_ID,
    candidateChecksum: BASELINE_CHECKSUM,
    governedThrough: BASELINE_WATERMARK,
    sourceLineageIdentity: BASELINE_MANIFEST_ID,
  })
  assert.equal(baseline.corpusId, BASELINE_ID)
  assert.equal(baseline.commonWatermarkValue, BASELINE_WATERMARK)
  assert.equal(baseline.members.length, 1)

  await assert.rejects(
    service.certifiedInactiveBaseline({
      candidateId: BASELINE_ID,
      candidateChecksum: "0".repeat(64),
      governedThrough: BASELINE_WATERMARK,
      sourceLineageIdentity: BASELINE_MANIFEST_ID,
    }),
    /INACTIVE_SERVING_BASELINE_MISMATCH/,
  )
  await assert.rejects(
    service.certifiedInactiveBaseline({
      candidateId: BASELINE_ID,
      candidateChecksum: BASELINE_CHECKSUM,
      governedThrough: BASELINE_WATERMARK,
      sourceLineageIdentity: `mvp8i-manifest:${"0".repeat(64)}`,
    }),
    /INACTIVE_SERVING_BASELINE_MANIFEST_BINDING_MISMATCH/,
  )

  const members = Object.freeze([baselineMember, nextMember])
  const nextChecksum = canonicalChecksum({
    schemaVersion: "mvp-serving/1.0.0",
    governedThrough: NEXT_WATERMARK,
    members: members.map((member) => ({
      kind: member.memberKind,
      id: member.memberId,
      checksum: member.memberChecksum,
      sortKey: member.canonicalSortKey,
      inheritedSourceCorpusId: member.inheritedSourceCorpusId,
      schemaVersion: member.schemaVersion,
      metadata: member.metadata,
    })),
  })
  const result = await service.assembleFromCertifiedInactiveBaseline({
    candidate: {
      corpusId: `mvp-serving-candidate:${nextChecksum}`,
      sourceCorpusId: BASELINE_ID,
      sourceCorpusChecksum: BASELINE_CHECKSUM,
      governedThrough: NEXT_WATERMARK,
      schemaVersion: "mvp-serving/1.0.0",
      generatedAt: NEXT_WATERMARK,
      members,
      limitations: Object.freeze(["INACTIVE_LOCAL_CANDIDATE"]),
    },
    expectedBaseline: {
      candidateId: BASELINE_ID,
      candidateChecksum: BASELINE_CHECKSUM,
      governedThrough: BASELINE_WATERMARK,
      sourceLineageIdentity: BASELINE_MANIFEST_ID,
    },
    binding: {
      commonWatermarkId: `mre_${"1".repeat(64)}`,
      commonWatermarkValue: NEXT_WATERMARK,
      commonWatermarkChecksum: "1".repeat(64),
    },
  })
  assert.equal(result.status, "CREATED")
  assert.equal(result.servingChecksum, nextChecksum)
  assert.equal(result.commonWatermarkValue, NEXT_WATERMARK)
  assert.ok(statements.some((statement) => statement.includes("'CANDIDATE','INELIGIBLE'")))
  assert.ok(!statements.some((statement) => /INSERT INTO serving\.serving_exposure/.test(statement)))

  const insertCount = statements.filter((statement) => statement.startsWith("INSERT INTO serving.serving_corpus VALUES")).length
  await assert.rejects(
    service.assembleFromCertifiedInactiveBaseline({
      candidate: {
        corpusId: `mvp-serving-candidate:${"2".repeat(64)}`,
        sourceCorpusId: "wrong-baseline",
        sourceCorpusChecksum: BASELINE_CHECKSUM,
        governedThrough: NEXT_WATERMARK,
        schemaVersion: "mvp-serving/1.0.0",
        generatedAt: NEXT_WATERMARK,
        members,
        limitations: Object.freeze([]),
      },
      expectedBaseline: { candidateId: BASELINE_ID, candidateChecksum: BASELINE_CHECKSUM, governedThrough: BASELINE_WATERMARK },
      binding: { commonWatermarkId: `mre_${"2".repeat(64)}`, commonWatermarkValue: NEXT_WATERMARK, commonWatermarkChecksum: "2".repeat(64) },
    }),
    /INACTIVE_SERVING_BASELINE_MISMATCH/,
  )
  assert.equal(statements.filter((statement) => statement.startsWith("INSERT INTO serving.serving_corpus VALUES")).length, insertCount)
  console.log("PASS current catch-up inactive baseline membership")
}

void main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
