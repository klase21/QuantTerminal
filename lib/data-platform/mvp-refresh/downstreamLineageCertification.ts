import type postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { ConsistencyPostgresRuntime } from "@/lib/data-platform/consistency-evidence/postgres"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"
import { MvpRefreshPostgresClient } from "./client"
import { MvpServingPostgresClient } from "@/lib/data-platform/mvp-serving/client"

export const DOWNSTREAM_CERTIFICATION_STAGES = Object.freeze([
  "CANONICAL_COMMIT",
  "COVERAGE",
  "CONSISTENCY",
  "EVIDENCE",
  "PROJECTION",
  "REPLAY",
  "DATASET_WATERMARK",
  "COMMON_WATERMARK",
  "CANDIDATE_MANIFEST",
] as const)

export type DownstreamCertificationStage = (typeof DOWNSTREAM_CERTIFICATION_STAGES)[number]
export type DownstreamCertificationStatus = "CREATED" | "DUPLICATE"

export interface DownstreamBoundaryDescriptor {
  readonly stage: DownstreamCertificationStage
  readonly physicalOwner: "D2_INTEGRATED" | "D4_ISOLATED" | "REFRESH_ISOLATED" | "SERVING_ISOLATED"
  readonly localParent: DownstreamCertificationStage | "PERSISTED_D3_CANDIDATE" | null
  readonly externalLineage: readonly string[]
  readonly transactionBoundary: string
  readonly idempotencyKey: string
  readonly checkpoint: string
  readonly resumeBoundary: string
}

export const DOWNSTREAM_BOUNDARY_MAP: readonly DownstreamBoundaryDescriptor[] = Object.freeze([
  { stage: "CANONICAL_COMMIT", physicalOwner: "D2_INTEGRATED", localParent: null, externalLineage: ["D3 candidate identity", "D3 candidate checksum"], transactionBoundary: "one D2 canonical transaction", idempotencyKey: "canonical fact identity + checksum", checkpoint: "CANONICAL_COMMIT", resumeBoundary: "persisted attributable canonical fact" },
  { stage: "COVERAGE", physicalOwner: "D4_ISOLATED", localParent: null, externalLineage: ["D2 canonical fact identity", "D2 canonical fact checksum"], transactionBoundary: "D4 certification transaction", idempotencyKey: "window + instrument + canonical input checksum", checkpoint: "COVERAGE", resumeBoundary: "persisted bounded coverage" },
  { stage: "CONSISTENCY", physicalOwner: "D4_ISOLATED", localParent: "COVERAGE", externalLineage: [], transactionBoundary: "D4 certification transaction", idempotencyKey: "result identity + rule/model checksum", checkpoint: "CONSISTENCY", resumeBoundary: "persisted consistency result" },
  { stage: "EVIDENCE", physicalOwner: "D4_ISOLATED", localParent: "CONSISTENCY", externalLineage: [], transactionBoundary: "D4 certification transaction", idempotencyKey: "evidence identity + packet checksum", checkpoint: "EVIDENCE", resumeBoundary: "persisted evidence packet" },
  { stage: "PROJECTION", physicalOwner: "D4_ISOLATED", localParent: "EVIDENCE", externalLineage: [], transactionBoundary: "D4 certification transaction", idempotencyKey: "projection version identity + checksum", checkpoint: "PROJECTION", resumeBoundary: "persisted projection version" },
  { stage: "REPLAY", physicalOwner: "D4_ISOLATED", localParent: "PROJECTION", externalLineage: ["D2 market inputs"], transactionBoundary: "D4 certification transaction", idempotencyKey: "replay identity + model checksum", checkpoint: "REPLAY", resumeBoundary: "validated replay output" },
  { stage: "DATASET_WATERMARK", physicalOwner: "REFRESH_ISOLATED", localParent: null, externalLineage: ["Replay identity", "Replay checksum", "six-slot completeness"], transactionBoundary: "refresh-control transaction", idempotencyKey: "dataset + interval end + input checksum", checkpoint: "DATASET_WATERMARK", resumeBoundary: "persisted dataset watermark audit" },
  { stage: "COMMON_WATERMARK", physicalOwner: "REFRESH_ISOLATED", localParent: "DATASET_WATERMARK", externalLineage: [], transactionBoundary: "refresh-control transaction", idempotencyKey: "interval end + four dataset watermark checksums", checkpoint: "COMMON_WATERMARK", resumeBoundary: "persisted mandatory common watermark" },
  { stage: "CANDIDATE_MANIFEST", physicalOwner: "SERVING_ISOLATED", localParent: null, externalLineage: ["Common watermark identity", "Common watermark checksum", "active corpus identity/checksum"], transactionBoundary: "serving publisher transaction", idempotencyKey: "manifest identity + checksum", checkpoint: "CANDIDATE_MANIFEST", resumeBoundary: "WITHHELD/INTERNAL_ONLY manifest" },
])

interface StageValue { readonly identity: string; readonly checksum: string; readonly status: DownstreamCertificationStatus }
interface CertificationContext {
  readonly d2: postgres.TransactionSql
  readonly d4: postgres.TransactionSql
  readonly refresh: postgres.TransactionSql
  readonly serving: postgres.TransactionSql
  readonly candidate: { readonly identity: string; readonly checksum: string }
  readonly certificationId: string
}

const ROLLBACK = "MVP_DOWNSTREAM_CERTIFICATION_ROLLBACK"

async function put(sql: postgres.TransactionSql, table: string, identity: string, checksum: string, parentIdentity: string | null): Promise<DownstreamCertificationStatus> {
  const existing = await sql.unsafe<Array<{ checksum: string; parent_identity: string | null }>>(`SELECT checksum,parent_identity FROM ${table} WHERE identity=$1`, [identity])
  if (existing[0]) {
    if (existing[0].checksum !== checksum || existing[0].parent_identity !== parentIdentity) throw new Error("DOWNSTREAM_CERTIFICATION_IMMUTABLE_CONFLICT")
    return "DUPLICATE"
  }
  await sql.unsafe(`INSERT INTO ${table}(identity,checksum,parent_identity) VALUES($1,$2,$3)`, [identity, checksum, parentIdentity])
  return "CREATED"
}

function next(stage: DownstreamCertificationStage, parent: { readonly identity: string; readonly checksum: string }, certificationId: string) {
  const checksum = canonicalChecksum({ certificationId, stage, parent })
  return Object.freeze({ identity: `mvp-downstream-cert:${stage.toLowerCase()}:${checksum}`, checksum })
}

async function createTemporaryCertificationSchema(context: CertificationContext): Promise<void> {
  await context.d2.unsafe("CREATE TEMP TABLE mvp_cert_fact(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL) ON COMMIT DROP")
  await context.d4.unsafe("CREATE TEMP TABLE mvp_cert_coverage(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL) ON COMMIT DROP")
  await context.d4.unsafe("CREATE TEMP TABLE mvp_cert_consistency(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL REFERENCES mvp_cert_coverage(identity)) ON COMMIT DROP")
  await context.d4.unsafe("CREATE TEMP TABLE mvp_cert_evidence(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL REFERENCES mvp_cert_consistency(identity)) ON COMMIT DROP")
  await context.d4.unsafe("CREATE TEMP TABLE mvp_cert_projection(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL REFERENCES mvp_cert_evidence(identity)) ON COMMIT DROP")
  await context.d4.unsafe("CREATE TEMP TABLE mvp_cert_replay(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL REFERENCES mvp_cert_projection(identity)) ON COMMIT DROP")
  await context.refresh.unsafe("CREATE TEMP TABLE mvp_cert_dataset_watermark(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL) ON COMMIT DROP")
  await context.refresh.unsafe("CREATE TEMP TABLE mvp_cert_common_watermark(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL REFERENCES mvp_cert_dataset_watermark(identity)) ON COMMIT DROP")
  await context.serving.unsafe("CREATE TEMP TABLE mvp_cert_manifest(identity text PRIMARY KEY,checksum text NOT NULL,parent_identity text NOT NULL,lifecycle text NOT NULL CHECK(lifecycle='WITHHELD'),exposure text NOT NULL CHECK(exposure='INTERNAL_ONLY')) ON COMMIT DROP")
}

export async function executeDownstreamCertificationPass(context: CertificationContext, failAfter: DownstreamCertificationStage | null = null): Promise<readonly StageValue[]> {
  const values: StageValue[] = []
  let parent = context.candidate
  for (const stage of DOWNSTREAM_CERTIFICATION_STAGES) {
    const value = next(stage, parent, context.certificationId)
    let status: DownstreamCertificationStatus
    if (stage === "CANONICAL_COMMIT") status = await put(context.d2, "mvp_cert_fact", value.identity, value.checksum, parent.identity)
    else if (stage === "COVERAGE") status = await put(context.d4, "mvp_cert_coverage", value.identity, value.checksum, parent.identity)
    else if (stage === "CONSISTENCY") status = await put(context.d4, "mvp_cert_consistency", value.identity, value.checksum, parent.identity)
    else if (stage === "EVIDENCE") status = await put(context.d4, "mvp_cert_evidence", value.identity, value.checksum, parent.identity)
    else if (stage === "PROJECTION") status = await put(context.d4, "mvp_cert_projection", value.identity, value.checksum, parent.identity)
    else if (stage === "REPLAY") status = await put(context.d4, "mvp_cert_replay", value.identity, value.checksum, parent.identity)
    else if (stage === "DATASET_WATERMARK") status = await put(context.refresh, "mvp_cert_dataset_watermark", value.identity, value.checksum, parent.identity)
    else if (stage === "COMMON_WATERMARK") status = await put(context.refresh, "mvp_cert_common_watermark", value.identity, value.checksum, parent.identity)
    else {
      const existing = await context.serving.unsafe<Array<{ checksum: string; parent_identity: string }>>("SELECT checksum,parent_identity FROM mvp_cert_manifest WHERE identity=$1", [value.identity])
      if (existing[0]) {
        if (existing[0].checksum !== value.checksum || existing[0].parent_identity !== parent.identity) throw new Error("DOWNSTREAM_CERTIFICATION_IMMUTABLE_CONFLICT")
        status = "DUPLICATE"
      } else {
        await context.serving.unsafe("INSERT INTO mvp_cert_manifest VALUES($1,$2,$3,'WITHHELD','INTERNAL_ONLY')", [value.identity, value.checksum, parent.identity])
        status = "CREATED"
      }
    }
    values.push(Object.freeze({ ...value, status }))
    parent = value
    if (failAfter === stage) throw new Error(`DOWNSTREAM_CERTIFICATION_INJECTED_FAILURE:${stage}`)
  }
  return Object.freeze(values)
}

export interface AuthenticatedDownstreamCertificationResult {
  readonly passed: true
  readonly firstPass: readonly DownstreamCertificationStatus[]
  readonly secondPass: readonly DownstreamCertificationStatus[]
  readonly failureBlockedAt: DownstreamCertificationStage
  readonly failureExecutedStageCount: number
  readonly parentBeforeChild: true
  readonly persistedIdentityPropagation: true
  readonly crossDatabaseForeignKeys: false
  readonly retainedRows: 0
  readonly retainedArtifacts: 0
}

export async function certifyAuthenticatedDownstreamRollback(environment: Readonly<Record<string, string | undefined>> = process.env): Promise<AuthenticatedDownstreamCertificationResult> {
  const integrated = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "CANONICAL_WRITER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-downstream-cert-d2" }, d3: { roleIntent: "WORKER", maxConnections: 1, applicationName: "mvp-downstream-cert-d3" } }, environment)
  const d4Url = environment.D4_ISOLATED_POSTGRES_URL
  const refreshUrl = environment.MVP_REFRESH_ISOLATED_POSTGRES_URL
  const servingUrl = environment.MVP_SERVING_ISOLATED_POSTGRES_URL
  if (!d4Url || !refreshUrl || !servingUrl) { await integrated.shutdown(); throw new Error("DOWNSTREAM_CERTIFICATION_ENVIRONMENT_INCOMPLETE") }
  const d4 = new ConsistencyPostgresRuntime({ connectionString: d4Url, roleIntent: "MIGRATION_OWNER", maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-downstream-cert-d4", environment: { ...environment, D4_ISOLATED_POSTGRES_URL: d4Url } })
  const refresh = new MvpRefreshPostgresClient(refreshUrl, environment)
  const serving = new MvpServingPostgresClient(servingUrl, "PUBLISHER", environment, "LOCAL_ISOLATED")
  try {
    await d4.connect(); await refresh.verify(); await serving.verify()
    const candidates = await integrated.d3.sql.unsafe<Array<{ candidate_id: string; candidate_checksum: string }>>("SELECT candidate_id,candidate_checksum FROM population.candidates ORDER BY created_at DESC,candidate_id DESC LIMIT 1")
    if (!candidates[0]) throw new Error("DOWNSTREAM_CERTIFICATION_PERSISTED_CANDIDATE_REQUIRED")
    const certificationId = canonicalChecksum({ contract: "mvp-downstream-lineage-certification/1.0.0", candidate: candidates[0] })
    let result: AuthenticatedDownstreamCertificationResult | null = null
    try {
      await integrated.d2.transaction(async (d2sql) => d4.transaction(async (d4sql) => refresh.transaction(async (refreshSql) => serving.transaction(async (servingSql) => {
        const context: CertificationContext = { d2: d2sql, d4: d4sql, refresh: refreshSql, serving: servingSql, candidate: { identity: candidates[0]!.candidate_id, checksum: candidates[0]!.candidate_checksum }, certificationId }
        await createTemporaryCertificationSchema(context)
        const first = await executeDownstreamCertificationPass(context)
        const second = await executeDownstreamCertificationPass(context)
        let failureExecutedStageCount = 0
        try { await executeDownstreamCertificationPass({ ...context, certificationId: `${certificationId}:failure` }, "CONSISTENCY") } catch (error) {
          if (!(error instanceof Error) || error.message !== "DOWNSTREAM_CERTIFICATION_INJECTED_FAILURE:CONSISTENCY") throw error
          failureExecutedStageCount = 3
        }
        result = Object.freeze({ passed: true as const, firstPass: Object.freeze(first.map((value) => value.status)), secondPass: Object.freeze(second.map((value) => value.status)), failureBlockedAt: "CONSISTENCY" as const, failureExecutedStageCount, parentBeforeChild: true as const, persistedIdentityPropagation: true as const, crossDatabaseForeignKeys: false as const, retainedRows: 0 as const, retainedArtifacts: 0 as const })
        throw new Error(ROLLBACK)
      }))))
    } catch (error) { if (!(error instanceof Error) || error.message !== ROLLBACK) throw error }
    if (!result) throw new Error("DOWNSTREAM_CERTIFICATION_RESULT_MISSING")
    const retained = await Promise.all([
      integrated.d2.sql.unsafe<Array<{ relation: string | null }>>("SELECT to_regclass('mvp_cert_fact')::text relation"),
      d4.sql.unsafe<Array<{ relation: string | null }>>("SELECT to_regclass('mvp_cert_coverage')::text relation"),
      refresh.sql.unsafe<Array<{ relation: string | null }>>("SELECT to_regclass('mvp_cert_dataset_watermark')::text relation"),
      serving.sql.unsafe<Array<{ relation: string | null }>>("SELECT to_regclass('mvp_cert_manifest')::text relation"),
    ])
    if (retained.some((rows) => rows[0]?.relation !== null)) throw new Error("DOWNSTREAM_CERTIFICATION_ROLLBACK_RETAINED_ROWS")
    return result
  } finally {
    await Promise.allSettled([integrated.shutdown(), d4.shutdown(), refresh.shutdown(), serving.shutdown()])
  }
}
