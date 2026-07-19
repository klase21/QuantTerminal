import assert from "node:assert/strict"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { MvpConsumerProjectionFacade, type MvpConsumerProjectionSource } from "@/lib/data-platform/consumer-projections"
import { createMvpProjection } from "@/lib/data-platform/evidence-platform"
import { createMvpServingManagedClient, verifyMvpServingReadOnlyTransactionState } from "@/lib/data-platform/mvp-serving/client"
import { PostgresMvpInactiveServingReadPort } from "@/lib/data-platform/mvp-serving/inactiveStaging"
import {
  MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP8V_APPROVED_CANDIDATE_ID,
  MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP8V_PRODUCTION_TARGET_ID,
  createMvpServingPreviewProjectionSource,
  mvpServingPreviewReadAuthorizationId,
  resolveMvpServingPreviewCandidate,
  verifyMvpServingPreviewCandidate,
} from "@/lib/data-platform/mvp-serving/preview"

const previewEnvironment = Object.freeze({
  NODE_ENV: "production",
  VERCEL_ENV: "preview",
  MVP_SERVING_PREVIEW_CANDIDATE_MODE: "EXPLICIT_INACTIVE_CANDIDATE",
  MVP_SERVING_PREVIEW_CANDIDATE_ID: MVP8V_APPROVED_CANDIDATE_ID,
  MVP_SERVING_PREVIEW_CANDIDATE_CHECKSUM: MVP8V_APPROVED_CANDIDATE_CHECKSUM,
  MVP_SERVING_PREVIEW_MEMBER_SET_CHECKSUM: MVP8V_APPROVED_MEMBER_SET_CHECKSUM,
  MVP_SERVING_PREVIEW_COMMON_WATERMARK_CHECKSUM: MVP8V_APPROVED_WATERMARK_CHECKSUM,
  MVP_SERVING_PREVIEW_TARGET_ID: MVP8V_PRODUCTION_TARGET_ID,
})

function expectReject(environment: Record<string, string | undefined>, code: RegExp) {
  assert.throws(() => resolveMvpServingPreviewCandidate(environment), code)
}

async function main() {
  assert.equal(resolveMvpServingPreviewCandidate({}), null)
  assert.equal(resolveMvpServingPreviewCandidate(previewEnvironment)?.candidateId, MVP8V_APPROVED_CANDIDATE_ID)
  expectReject({ ...previewEnvironment, VERCEL_ENV: "production" }, /SERVING_PREVIEW_ENVIRONMENT_INVALID/)
  expectReject({ ...previewEnvironment, VERCEL_ENV: undefined }, /SERVING_PREVIEW_ENVIRONMENT_INVALID/)
  expectReject({ ...previewEnvironment, MVP_SERVING_PREVIEW_CANDIDATE_ID: "*" }, /SERVING_PREVIEW_BINDING_INVALID/)
  expectReject({ ...previewEnvironment, MVP_SERVING_PREVIEW_CANDIDATE_CHECKSUM: "0".repeat(64) }, /SERVING_PREVIEW_BINDING_MISMATCH/)
  expectReject({ ...previewEnvironment, MVP_SERVING_PREVIEW_TARGET_ID: "neon:wrong/branch/neondb" }, /SERVING_PREVIEW_BINDING_MISMATCH/)

  // A pooled connection may be off between transactions; only in-transaction state is authoritative.
  assert.doesNotThrow(() => ({ default_transaction_read_only: "off", transaction_read_only: "off" }))
  assert.doesNotThrow(() => verifyMvpServingReadOnlyTransactionState({ database: "neondb", role: "mvp_serving_reader", read_only: "on" }, { database: "neondb", role: "mvp_serving_reader" }))
  assert.throws(() => verifyMvpServingReadOnlyTransactionState({ database: "neondb", role: "mvp_serving_reader", read_only: "off" }, { database: "neondb", role: "mvp_serving_reader" }), /MVP_SERVING_READ_ONLY_TRANSACTION_VERIFICATION_FAILED/)
  assert.throws(() => verifyMvpServingReadOnlyTransactionState({ database: "neondb", role: "qt_prod_candidate_reader", read_only: "on" }, { database: "neondb", role: "mvp_serving_reader" }), /MVP_SERVING_READ_ONLY_TRANSACTION_VERIFICATION_FAILED/)

  const projection = createMvpProjection({ kind: "DashboardMarketStateProjection", subjectId: "MVP_SIX_INSTRUMENTS", eventTimeStart: "2026-07-15T00:00:00.000Z", eventTimeEnd: "2026-07-16T00:00:00.000Z", knowledgeTimeCutoff: "2026-07-16T00:00:00.000Z", payload: { state: "NO DATA", reason: "Bounded unit fixture" }, dependencies: [{ dependencyType: "STREAM_SEGMENT", dependencyId: "mvp8v-test", dependencyVersion: "1", dependencyChecksum: canonicalChecksum("mvp8v-test") }] })
  const source: MvpConsumerProjectionSource = Object.freeze({ latest: (kind, subject) => Promise.resolve(kind === projection.projectionKind && subject === projection.subjectId ? projection : null), byVersion: () => Promise.resolve(null), list: () => Promise.resolve([]), exposure: () => Promise.resolve(null) })
  const previewFacade = new MvpConsumerProjectionFacade(source, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM }, { id: `mvp8v-preview-read:${canonicalChecksum(previewEnvironment)}` })
  const preview = await previewFacade.read({ view: "dashboard" })
  assert.equal(preview.projectionCorpusId, MVP8V_APPROVED_CANDIDATE_ID)
  assert.ok(preview.projections.every((value) => value.effectiveExposure === "INTERNAL_ONLY"))
  await assert.rejects(() => new MvpConsumerProjectionFacade(source, { id: MVP8V_APPROVED_CANDIDATE_ID, checksum: MVP8V_APPROVED_CANDIDATE_CHECKSUM }).read({ view: "dashboard" }), /matching cutover decision/)

  const pooledUrl = process.env.MVP8V_POOLED_READER_URL
  if (pooledUrl) {
    const client = createMvpServingManagedClient(pooledUrl, "READER")
    try {
      const outside = await client.sql.unsafe<Array<{ role: string; read_only: string }>>("SELECT current_user role,current_setting('transaction_read_only') read_only")
      assert.equal(outside[0]?.role, "mvp_serving_reader")
      await client.readOnlyTransaction(async (sql) => {
        const rows = await sql.unsafe<Array<{ role: string; database: string; branch_id: string | null; read_only: string; can_insert: boolean; can_update: boolean; can_delete: boolean; can_truncate: boolean }>>("SELECT current_user role,current_database() database,current_setting('neon.branch_id',true) branch_id,current_setting('transaction_read_only') read_only,has_table_privilege(current_user,'serving.serving_projection','INSERT') can_insert,has_table_privilege(current_user,'serving.serving_projection','UPDATE') can_update,has_table_privilege(current_user,'serving.serving_projection','DELETE') can_delete,has_table_privilege(current_user,'serving.serving_projection','TRUNCATE') can_truncate")
        assert.deepEqual(rows[0], { role: "mvp_serving_reader", database: "neondb", branch_id: "br-royal-block-aop70mzq", read_only: "on", can_insert: false, can_update: false, can_delete: false, can_truncate: false })
        const config = resolveMvpServingPreviewCandidate(previewEnvironment)!
        const selection = await new PostgresMvpInactiveServingReadPort(client, sql).selectCandidate(config.candidateId)
        verifyMvpServingPreviewCandidate(selection.review, config)
        const facade = new MvpConsumerProjectionFacade(createMvpServingPreviewProjectionSource(selection.review), { id: selection.review.candidateId, checksum: selection.review.servingChecksum }, { id: mvpServingPreviewReadAuthorizationId(config) })
        assert.equal((await facade.read({ view: "dashboard" })).projections.length > 0, true)
        assert.equal((await facade.read({ view: "scanner" })).projections.length > 0, true)
        for (const instrument of ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"] as const) {
          assert.equal((await facade.read({ view: "trade", instrument })).projections.length > 0, true)
          assert.equal((await facade.read({ view: "replay", instrument })).projections.length > 0, true)
          assert.ok(await selection.replay(instrument))
        }
      })
      await assert.rejects(() => client.readOnlyTransaction((sql) => sql.unsafe("CREATE TABLE mvp8v_forbidden_probe(id integer)")), /read-only transaction|permission denied/i)
    } finally { await client.shutdown() }
  }

  console.log(`MVP-8V POOLED READ-ONLY + PREVIEW SELECTOR SUITE: PASS (${pooledUrl ? "POOLED_INTEGRATION" : "UNIT"})`)
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP8V_PREVIEW_SUITE_FAILED"); process.exitCode = 1 })
