import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { ConsistencyPostgresRuntime } from "./client"

export type MvpExposureAction = "CUTOVER" | "ROLLBACK"
export type MvpEffectiveExposure = "CONSUMER_VISIBLE" | "READY_FOR_CUTOVER"
export interface MvpProjectionExposureDecision {
  readonly decisionId: string
  readonly projectionCorpusId: string
  readonly projectionCorpusChecksum: string
  readonly action: MvpExposureAction
  readonly effectiveExposure: MvpEffectiveExposure
  readonly previousDecisionId: string | null
  readonly reasonCode: string
  readonly actorId: string
  readonly decisionChecksum: string
  readonly createdAt: string
}

export function createMvpProjectionExposureDecision(input: Omit<MvpProjectionExposureDecision, "decisionId" | "decisionChecksum" | "effectiveExposure">): MvpProjectionExposureDecision {
  if (!input.projectionCorpusId.trim() || !/^[0-9a-f]{64}$/.test(input.projectionCorpusChecksum) || !input.reasonCode.trim() || !input.actorId.trim() || !Number.isFinite(Date.parse(input.createdAt))) throw new Error("MVP_EXPOSURE_DECISION_INVALID")
  const createdAt = new Date(input.createdAt); createdAt.setUTCMilliseconds(0)
  const effectiveExposure = input.action === "CUTOVER" ? "CONSUMER_VISIBLE" as const : "READY_FOR_CUTOVER" as const
  const identity = { projectionCorpusId: input.projectionCorpusId, projectionCorpusChecksum: input.projectionCorpusChecksum, action: input.action, effectiveExposure, previousDecisionId: input.previousDecisionId, reasonCode: input.reasonCode, actorId: input.actorId }
  const decisionId = `mvpx_${canonicalChecksum(identity)}`
  const base = { decisionId, ...identity, createdAt: createdAt.toISOString() }
  return Object.freeze({ ...base, decisionChecksum: canonicalChecksum(base) })
}

export class MvpProjectionExposureStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime) {
    if (runtime.roleIntent !== "PROJECTION_PUBLISHER") throw new Error("PROJECTION_PUBLISHER_ROLE_REQUIRED")
  }
  async write(decision: MvpProjectionExposureDecision): Promise<"CREATED" | "DUPLICATE"> {
    const { decisionChecksum, ...base } = decision
    if (canonicalChecksum(base) !== decisionChecksum) throw new Error("MVP_EXPOSURE_DECISION_CHECKSUM_INVALID")
    return this.runtime.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [decision.projectionCorpusId])
      const existing = await sql.unsafe<Array<{ decision_checksum: string }>>("SELECT decision_checksum FROM projection.mvp_consumer_exposure_decisions WHERE decision_id=$1", [decision.decisionId])
      if (existing[0]) {
        if (existing[0].decision_checksum !== decision.decisionChecksum) throw new Error("MVP_EXPOSURE_DECISION_CONFLICT")
        return "DUPLICATE"
      }
      const latest = await sql.unsafe<Array<{ decision_id: string }>>("SELECT d.decision_id FROM projection.mvp_consumer_exposure_decisions d LEFT JOIN projection.mvp_consumer_exposure_invalidations i USING(decision_id) WHERE d.projection_corpus_id=$1 AND i.decision_id IS NULL ORDER BY d.created_at DESC,d.decision_id DESC LIMIT 1", [decision.projectionCorpusId])
      if ((latest[0]?.decision_id ?? null) !== decision.previousDecisionId) throw new Error("MVP_EXPOSURE_PREVIOUS_DECISION_MISMATCH")
      await sql.unsafe("INSERT INTO projection.mvp_consumer_exposure_decisions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)", [decision.decisionId, decision.projectionCorpusId, decision.projectionCorpusChecksum, decision.action, decision.effectiveExposure, decision.previousDecisionId, decision.reasonCode, decision.actorId, decision.decisionChecksum, decision.createdAt])
      return "CREATED"
    })
  }
}

export async function readLatestMvpProjectionExposure(runtime: ConsistencyPostgresRuntime, corpusId: string): Promise<MvpProjectionExposureDecision | null> {
  if (runtime.roleIntent !== "READ_ONLY" && runtime.roleIntent !== "PROJECTION_PUBLISHER") throw new Error("PROJECTION_EXPOSURE_READ_ROLE_REQUIRED")
  const rows = await runtime.sql.unsafe<Array<Record<string, unknown>>>("SELECT d.* FROM projection.mvp_consumer_exposure_decisions d LEFT JOIN projection.mvp_consumer_exposure_invalidations i USING(decision_id) WHERE d.projection_corpus_id=$1 AND i.decision_id IS NULL ORDER BY d.created_at DESC,d.decision_id DESC LIMIT 1", [corpusId])
  const row = rows[0]
  if (!row) return null
  const value = Object.freeze({ decisionId: String(row.decision_id), projectionCorpusId: String(row.projection_corpus_id), projectionCorpusChecksum: String(row.projection_corpus_checksum), action: String(row.action) as MvpExposureAction, effectiveExposure: String(row.effective_exposure) as MvpEffectiveExposure, previousDecisionId: row.previous_decision_id ? String(row.previous_decision_id) : null, reasonCode: String(row.reason_code), actorId: String(row.actor_id), decisionChecksum: String(row.decision_checksum), createdAt: new Date(String(row.created_at)).toISOString() })
  const { decisionChecksum, ...base } = value
  if (canonicalChecksum(base) !== decisionChecksum) throw new Error("MVP_EXPOSURE_PERSISTED_CHECKSUM_INVALID")
  return value
}

export async function reconcileMvpProjectionExposureDecisions(runtime: ConsistencyPostgresRuntime): Promise<{ readonly invalidated: number; readonly valid: number }> {
  if (runtime.roleIntent !== "PROJECTION_PUBLISHER") throw new Error("PROJECTION_PUBLISHER_ROLE_REQUIRED")
  const rows = await runtime.sql.unsafe<Array<Record<string, unknown>>>("SELECT d.* FROM projection.mvp_consumer_exposure_decisions d LEFT JOIN projection.mvp_consumer_exposure_invalidations i USING(decision_id) WHERE i.decision_id IS NULL ORDER BY d.created_at,d.decision_id")
  let invalidated = 0, valid = 0
  for (const row of rows) {
    const base = { decisionId: String(row.decision_id), projectionCorpusId: String(row.projection_corpus_id), projectionCorpusChecksum: String(row.projection_corpus_checksum), action: String(row.action), effectiveExposure: String(row.effective_exposure), previousDecisionId: row.previous_decision_id ? String(row.previous_decision_id) : null, reasonCode: String(row.reason_code), actorId: String(row.actor_id), createdAt: new Date(String(row.created_at)).toISOString() }
    const reproduced = canonicalChecksum(base), observed = String(row.decision_checksum)
    if (reproduced === observed) { valid += 1; continue }
    const id = `mvpxi_${canonicalChecksum({ decisionId: base.decisionId, observed, reproduced, reasonCode: "DECISION_CHECKSUM_MISMATCH" })}`
    await runtime.sql.unsafe("INSERT INTO projection.mvp_consumer_exposure_invalidations VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING", [id, base.decisionId, observed, reproduced, "DECISION_CHECKSUM_MISMATCH", new Date().toISOString()])
    invalidated += 1
  }
  return Object.freeze({ invalidated, valid })
}
