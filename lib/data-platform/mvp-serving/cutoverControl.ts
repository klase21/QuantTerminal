import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"
import type { MvpServingPostgresClient } from "./client"

const EXPECTED_COUNTS = Object.freeze({ projections: 62, evidence: 6, replay: 6, members: 74, manifests: 1 })
const CHECKSUM = /^[0-9a-f]{64}$/

export type CutoverOperation = "ACTIVATE" | "ROLLBACK"

export interface CutoverApprovalInput {
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly memberSetChecksum: string
  readonly commonWatermarkId: string
  readonly commonWatermarkChecksum: string
  readonly reviewedCommit: string
  readonly reviewArtifactChecksums: Readonly<Record<string, string>>
  readonly targetFingerprint: string
  readonly operatorId: string
  readonly approvalReason: string
  readonly requestId: string
  readonly createdAt: string
  readonly expiresAt: string
}

export interface CutoverAuthorizationInput {
  readonly approvalId: string
  readonly operation: CutoverOperation
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly targetFingerprint: string
  readonly expectedCurrentExposureId: string
  readonly expectedCurrentCorpusId: string
  readonly expectedCurrentCorpusChecksum: string
  readonly rollbackExposureId: string
  readonly rollbackCorpusId: string
  readonly rollbackCorpusChecksum: string
  readonly rollbackPin: string
  readonly rollbackDeploymentId: string
  readonly relatedActivationEventId: string | null
  readonly operatorId: string
  readonly requestId: string
  readonly createdAt: string
  readonly expiresAt: string
}

export interface GuardedActivationInput {
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly memberSetChecksum: string
  readonly commonWatermarkId: string
  readonly commonWatermarkChecksum: string
  readonly expectedCurrentExposureId: string
  readonly expectedCurrentCorpusId: string
  readonly expectedCurrentCorpusChecksum: string
  readonly operatorId: string
  readonly authorizationId: string
  readonly activationReason: string
  readonly requestId: string
  readonly targetFingerprint: string
  readonly effectiveAt: string
  readonly dryRun: boolean
}

export interface GuardedRollbackInput {
  readonly activationEventId: string
  readonly expectedActiveExposureId: string
  readonly expectedActiveCandidateId: string
  readonly rollbackTargetExposureId: string
  readonly rollbackTargetCorpusId: string
  readonly rollbackTargetCorpusChecksum: string
  readonly operatorId: string
  readonly authorizationId: string
  readonly rollbackReason: string
  readonly requestId: string
  readonly targetFingerprint: string
  readonly effectiveAt: string
  readonly dryRun: boolean
}

export interface GuardedCutoverResult {
  readonly status: "DRY_RUN" | "COMMITTED" | "DUPLICATE"
  readonly eventId: string
  readonly exposureId: string
  readonly corpusId: string
  readonly previousExposureId: string
  readonly previousCorpusId: string
}

export const SERVING_CUTOVER_ORDER = Object.freeze(["PREPARE_DEPLOYMENT", "ACTIVATE_DATABASE", "PROMOTE_DEPLOYMENT", "VERIFY"] as const)
export const SERVING_ROLLBACK_ORDER = Object.freeze(["RESTORE_DEPLOYMENT", "ROLLBACK_DATABASE", "VERIFY"] as const)

function iso(value: string, code: string): string { const result = new Date(value).toISOString(); if (result !== value) throw new Error(code); return result }
function requireChecksum(value: string, code: string): void { if (!CHECKSUM.test(value)) throw new Error(code) }
function id(prefix: string, basis: unknown): string { return `${prefix}:${canonicalChecksum(basis)}` }

export function createCutoverRequestId(operation: string, basis: Readonly<Record<string, unknown>>): string { return id(`mvp8s-${operation.toLowerCase()}-request`, basis) }

export function computeCutoverApproval(input: CutoverApprovalInput) {
  requireChecksum(input.candidateChecksum, "MVP8S_CANDIDATE_CHECKSUM_INVALID")
  requireChecksum(input.memberSetChecksum, "MVP8S_MEMBER_SET_CHECKSUM_INVALID")
  requireChecksum(input.commonWatermarkChecksum, "MVP8S_WATERMARK_CHECKSUM_INVALID")
  if (!/^[0-9a-f]{40}$/.test(input.reviewedCommit) || !input.candidateId || !input.commonWatermarkId || !input.targetFingerprint || !input.operatorId || !input.approvalReason || !input.requestId) throw new Error("MVP8S_APPROVAL_INPUT_INVALID")
  for (const value of Object.values(input.reviewArtifactChecksums)) requireChecksum(value, "MVP8S_REVIEW_ARTIFACT_CHECKSUM_INVALID")
  const createdAt = iso(input.createdAt, "MVP8S_APPROVAL_CREATED_AT_INVALID"), expiresAt = iso(input.expiresAt, "MVP8S_APPROVAL_EXPIRES_AT_INVALID")
  if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw new Error("MVP8S_APPROVAL_EXPIRY_INVALID")
  const basis = { ...input, createdAt, expiresAt, reviewArtifactChecksums: Object.fromEntries(Object.entries(input.reviewArtifactChecksums).sort(([a], [b]) => a.localeCompare(b))) }
  const approvalChecksum = canonicalChecksum(basis)
  return Object.freeze({ approvalId: `mvp8s-approval:${approvalChecksum}`, ...basis, approvalChecksum })
}

export function computeCutoverAuthorization(input: CutoverAuthorizationInput) {
  requireChecksum(input.candidateChecksum, "MVP8S_CANDIDATE_CHECKSUM_INVALID")
  requireChecksum(input.expectedCurrentCorpusChecksum, "MVP8S_BASELINE_CHECKSUM_INVALID")
  requireChecksum(input.rollbackCorpusChecksum, "MVP8S_ROLLBACK_CHECKSUM_INVALID")
  if (!input.approvalId || !input.candidateId || !input.targetFingerprint || !input.expectedCurrentExposureId || !input.expectedCurrentCorpusId || !input.rollbackExposureId || !input.rollbackCorpusId || !input.rollbackPin || !input.rollbackDeploymentId || !input.operatorId || !input.requestId) throw new Error("MVP8S_AUTHORIZATION_INPUT_INVALID")
  if ((input.operation === "ROLLBACK") !== Boolean(input.relatedActivationEventId)) throw new Error("MVP8S_AUTHORIZATION_ACTIVATION_LINK_INVALID")
  const createdAt = iso(input.createdAt, "MVP8S_AUTHORIZATION_CREATED_AT_INVALID"), expiresAt = iso(input.expiresAt, "MVP8S_AUTHORIZATION_EXPIRES_AT_INVALID")
  if (Date.parse(expiresAt) <= Date.parse(createdAt)) throw new Error("MVP8S_AUTHORIZATION_EXPIRY_INVALID")
  const basis = { ...input, createdAt, expiresAt }
  const authorizationChecksum = canonicalChecksum(basis)
  return Object.freeze({ authorizationId: `mvp8s-authorization:${authorizationChecksum}`, ...basis, authorizationChecksum })
}

export class GuardedServingCutoverControlPlane {
  constructor(private readonly client: MvpServingPostgresClient, private readonly expectedTargetFingerprint: string) {
    if (client.roleIntent !== "PUBLISHER") throw new Error("MVP8S_CUTOVER_WRITER_REQUIRED")
    if (!expectedTargetFingerprint) throw new Error("MVP8S_TARGET_FINGERPRINT_REQUIRED")
  }

  async approveServingCandidateForCutover(input: CutoverApprovalInput): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly approvalId: string; readonly eligibility: "ELIGIBLE_FOR_CUTOVER" }> {
    this.requireTarget(input.targetFingerprint)
    const value = computeCutoverApproval(input)
    return this.client.transaction(async (sql) => {
      await this.verifyCandidate(sql, input.candidateId, input.candidateChecksum, input.memberSetChecksum, input.commonWatermarkId, input.commonWatermarkChecksum, true)
      const existing = await sql.unsafe<Array<{ approval_id: string; approval_checksum: string }>>("SELECT approval_id,approval_checksum FROM serving_control.cutover_approval WHERE request_id=$1", [input.requestId])
      if (existing[0]) {
        if (existing[0].approval_id !== value.approvalId || existing[0].approval_checksum !== value.approvalChecksum) throw new Error("MVP8S_APPROVAL_REQUEST_CONFLICT")
        return Object.freeze({ status: "DUPLICATE" as const, approvalId: value.approvalId, eligibility: "ELIGIBLE_FOR_CUTOVER" as const })
      }
      await sql.unsafe("INSERT INTO serving_control.cutover_approval VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::text::jsonb,$10,$11,$12,$13,$14,$15)", [value.approvalId,value.requestId,value.candidateId,value.candidateChecksum,value.memberSetChecksum,value.commonWatermarkId,value.commonWatermarkChecksum,value.reviewedCommit,JSON.stringify(value.reviewArtifactChecksums),value.targetFingerprint,value.operatorId,value.approvalReason,value.createdAt,value.expiresAt,value.approvalChecksum])
      return Object.freeze({ status: "CREATED" as const, approvalId: value.approvalId, eligibility: "ELIGIBLE_FOR_CUTOVER" as const })
    })
  }

  async createServingCutoverAuthorization(input: CutoverAuthorizationInput): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly authorizationId: string }> {
    this.requireTarget(input.targetFingerprint)
    const value = computeCutoverAuthorization(input)
    return this.client.transaction(async (sql) => {
      const approval = await this.validApproval(sql, input.approvalId, input.candidateId, input.candidateChecksum, input.targetFingerprint, input.operatorId, input.createdAt)
      if (!approval) throw new Error("MVP8S_APPROVAL_INVALID")
      const existing = await sql.unsafe<Array<{ authorization_id: string; authorization_checksum: string }>>("SELECT authorization_id,authorization_checksum FROM serving_control.cutover_authorization WHERE request_id=$1", [input.requestId])
      if (existing[0]) {
        if (existing[0].authorization_id !== value.authorizationId || existing[0].authorization_checksum !== value.authorizationChecksum) throw new Error("MVP8S_AUTHORIZATION_REQUEST_CONFLICT")
        return Object.freeze({ status: "DUPLICATE" as const, authorizationId: value.authorizationId })
      }
      await sql.unsafe("INSERT INTO serving_control.cutover_authorization VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)", [value.authorizationId,value.requestId,value.approvalId,value.operation,value.candidateId,value.candidateChecksum,value.targetFingerprint,value.expectedCurrentExposureId,value.expectedCurrentCorpusId,value.expectedCurrentCorpusChecksum,value.rollbackExposureId,value.rollbackCorpusId,value.rollbackCorpusChecksum,value.rollbackPin,value.rollbackDeploymentId,value.relatedActivationEventId,value.operatorId,value.createdAt,value.expiresAt,value.authorizationChecksum])
      return Object.freeze({ status: "CREATED" as const, authorizationId: value.authorizationId })
    })
  }

  async activateServingCandidateGuarded(input: GuardedActivationInput): Promise<GuardedCutoverResult> {
    this.requireTarget(input.targetFingerprint)
    return this.client.transaction(async (sql) => {
      const duplicate = await this.existingResult(sql, input.requestId, "ACTIVATION_COMMITTED", input.authorizationId)
      if (duplicate) return duplicate
      if (!input.dryRun) await sql.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [input.targetFingerprint])
      await this.verifyCandidate(sql, input.candidateId, input.candidateChecksum, input.memberSetChecksum, input.commonWatermarkId, input.commonWatermarkChecksum, true)
      const authorization = await this.validAuthorization(sql, input.authorizationId, "ACTIVATE", input.candidateId, input.candidateChecksum, input.targetFingerprint, input.operatorId, input.expectedCurrentExposureId, input.expectedCurrentCorpusId, input.expectedCurrentCorpusChecksum, null, input.effectiveAt)
      const baseline = await this.activeBaseline(sql)
      if (baseline.exposureId !== input.expectedCurrentExposureId || baseline.corpusId !== input.expectedCurrentCorpusId || baseline.corpusChecksum !== input.expectedCurrentCorpusChecksum) throw new Error("MVP8S_ACTIVATION_BASELINE_CONFLICT")
      if (authorization.expected_current_exposure_id !== baseline.exposureId || authorization.expected_current_corpus_id !== baseline.corpusId || authorization.expected_current_corpus_checksum !== baseline.corpusChecksum) throw new Error("MVP8S_AUTHORIZATION_BASELINE_MISMATCH")
      const effectiveAt = iso(input.effectiveAt, "MVP8S_ACTIVATION_TIME_INVALID")
      const exposureBasis = { operation: "ACTIVATE", requestId: input.requestId, candidateId: input.candidateId, candidateChecksum: input.candidateChecksum, previousExposureId: baseline.exposureId, previousCorpusId: baseline.corpusId, authorizationId: input.authorizationId, operatorId: input.operatorId, targetFingerprint: input.targetFingerprint, effectiveAt }
      const exposureChecksum = canonicalChecksum(exposureBasis), exposureId = `msex_${exposureChecksum}`
      const eventBasis = { eventType: "ACTIVATION_COMMITTED", requestId: input.requestId, candidateId: input.candidateId, candidateChecksum: input.candidateChecksum, targetFingerprint: input.targetFingerprint, operatorId: input.operatorId, authorizationId: input.authorizationId, previousExposureId: baseline.exposureId, previousCorpusId: baseline.corpusId, newExposureId: exposureId, newCorpusId: input.candidateId, relatedActivationEventId: null, reason: input.activationReason, createdAt: effectiveAt }
      const eventChecksum = canonicalChecksum(eventBasis), eventId = `mvp8s-event:${eventChecksum}`
      const result = Object.freeze({ status: (input.dryRun ? "DRY_RUN" : "COMMITTED") as "DRY_RUN" | "COMMITTED", eventId, exposureId, corpusId: input.candidateId, previousExposureId: baseline.exposureId, previousCorpusId: baseline.corpusId })
      if (input.dryRun) return result
      await sql.unsafe("INSERT INTO serving.serving_exposure VALUES($1,$2,'CONSUMER_VISIBLE',$3,$4,$5,$3)", [exposureId,input.candidateId,effectiveAt,exposureChecksum,`guarded-activation:${eventId}`])
      await this.insertEvent(sql, eventId, eventBasis, eventChecksum)
      await sql.unsafe("INSERT INTO serving_control.cutover_authorization_consumption VALUES($1,$2,$3,$4)", [input.authorizationId,eventId,input.requestId,effectiveAt])
      return result
    })
  }

  async rollbackServingExposureGuarded(input: GuardedRollbackInput): Promise<GuardedCutoverResult> {
    this.requireTarget(input.targetFingerprint)
    return this.client.transaction(async (sql) => {
      const duplicate = await this.existingResult(sql, input.requestId, "ROLLBACK_COMMITTED", input.authorizationId)
      if (duplicate) return duplicate
      if (!input.dryRun) await sql.unsafe("SELECT pg_advisory_xact_lock(hashtextextended($1,0))", [input.targetFingerprint])
      const activation = await sql.unsafe<Array<Record<string, string>>>("SELECT * FROM serving_control.cutover_event WHERE event_id=$1 AND event_type='ACTIVATION_COMMITTED'", [input.activationEventId])
      const event = activation[0]
      if (!event || event.new_exposure_id !== input.expectedActiveExposureId || event.new_corpus_id !== input.expectedActiveCandidateId || event.previous_exposure_id !== input.rollbackTargetExposureId || event.previous_corpus_id !== input.rollbackTargetCorpusId) throw new Error("MVP8S_ROLLBACK_LINK_INVALID")
      const baseline = await this.activeBaseline(sql)
      if (baseline.exposureId !== input.expectedActiveExposureId || baseline.corpusId !== input.expectedActiveCandidateId) throw new Error("MVP8S_ROLLBACK_BASELINE_CONFLICT")
      const authorization = await this.validAuthorization(sql, input.authorizationId, "ROLLBACK", input.expectedActiveCandidateId, event.candidate_checksum, input.targetFingerprint, input.operatorId, input.expectedActiveExposureId, input.expectedActiveCandidateId, baseline.corpusChecksum, input.activationEventId, input.effectiveAt)
      if (authorization.rollback_exposure_id !== input.rollbackTargetExposureId || authorization.rollback_corpus_id !== input.rollbackTargetCorpusId || authorization.rollback_corpus_checksum !== input.rollbackTargetCorpusChecksum) throw new Error("MVP8S_ROLLBACK_AUTHORIZATION_MISMATCH")
      const target = await sql.unsafe<Array<{ serving_checksum: string }>>("SELECT serving_checksum FROM serving.serving_corpus WHERE corpus_id=$1", [input.rollbackTargetCorpusId])
      if (target[0]?.serving_checksum !== input.rollbackTargetCorpusChecksum) throw new Error("MVP8S_ROLLBACK_TARGET_INVALID")
      const effectiveAt = iso(input.effectiveAt, "MVP8S_ROLLBACK_TIME_INVALID")
      const exposureBasis = { operation: "ROLLBACK", requestId: input.requestId, activationEventId: input.activationEventId, candidateId: input.expectedActiveCandidateId, previousExposureId: baseline.exposureId, rollbackExposureId: input.rollbackTargetExposureId, rollbackCorpusId: input.rollbackTargetCorpusId, authorizationId: input.authorizationId, operatorId: input.operatorId, targetFingerprint: input.targetFingerprint, effectiveAt }
      const exposureChecksum = canonicalChecksum(exposureBasis), exposureId = `msex_${exposureChecksum}`
      const eventBasis = { eventType: "ROLLBACK_COMMITTED", requestId: input.requestId, candidateId: input.expectedActiveCandidateId, candidateChecksum: event.candidate_checksum, targetFingerprint: input.targetFingerprint, operatorId: input.operatorId, authorizationId: input.authorizationId, previousExposureId: baseline.exposureId, previousCorpusId: baseline.corpusId, newExposureId: exposureId, newCorpusId: input.rollbackTargetCorpusId, relatedActivationEventId: input.activationEventId, reason: input.rollbackReason, createdAt: effectiveAt }
      const eventChecksum = canonicalChecksum(eventBasis), eventId = `mvp8s-event:${eventChecksum}`
      const result = Object.freeze({ status: (input.dryRun ? "DRY_RUN" : "COMMITTED") as "DRY_RUN" | "COMMITTED", eventId, exposureId, corpusId: input.rollbackTargetCorpusId, previousExposureId: baseline.exposureId, previousCorpusId: baseline.corpusId })
      if (input.dryRun) return result
      await sql.unsafe("INSERT INTO serving.serving_exposure VALUES($1,$2,'CONSUMER_VISIBLE',$3,$4,$5,$3)", [exposureId,input.rollbackTargetCorpusId,effectiveAt,exposureChecksum,`guarded-rollback:${eventId}`])
      await this.insertEvent(sql, eventId, eventBasis, eventChecksum)
      await sql.unsafe("INSERT INTO serving_control.cutover_authorization_consumption VALUES($1,$2,$3,$4)", [input.authorizationId,eventId,input.requestId,effectiveAt])
      return result
    })
  }

  private requireTarget(value: string): void { if (value !== this.expectedTargetFingerprint) throw new Error("MVP8S_TARGET_FINGERPRINT_MISMATCH") }

  private async verifyCandidate(sql: postgres.TransactionSql, candidateId: string, checksum: string, memberSetChecksum: string, watermarkId: string, watermarkChecksum: string, requireInactive: boolean): Promise<void> {
    const rows = await sql.unsafe<Array<Record<string, unknown>>>("SELECT c.serving_checksum,c.lifecycle,c.exposure,c.projection_count,c.evidence_summary_count,c.replay_snapshot_count,m.exposure_eligibility,m.member_set_checksum,m.common_watermark_id,m.common_watermark_checksum,(SELECT count(*)::int FROM serving.serving_projection WHERE serving_corpus_id=c.corpus_id) projections,(SELECT count(*)::int FROM serving.serving_evidence_summary WHERE serving_corpus_id=c.corpus_id) evidence,(SELECT count(*)::int FROM serving.serving_replay_sequence WHERE serving_corpus_id=c.corpus_id) replay,(SELECT count(*)::int FROM serving.serving_corpus_member WHERE corpus_id=c.corpus_id) members,(SELECT count(*)::int FROM serving.serving_candidate_manifest WHERE corpus_id=c.corpus_id) manifests,(SELECT count(*)::int FROM serving.serving_exposure WHERE corpus_id=c.corpus_id) exposures FROM serving.serving_corpus c JOIN serving.serving_candidate_manifest m ON m.corpus_id=c.corpus_id WHERE c.corpus_id=$1", [candidateId])
    const row = rows[0]
    if (!row || row.serving_checksum !== checksum || row.member_set_checksum !== memberSetChecksum || row.common_watermark_id !== watermarkId || row.common_watermark_checksum !== watermarkChecksum) throw new Error("MVP8S_CANDIDATE_BINDING_MISMATCH")
    if (Number(row.projections) !== EXPECTED_COUNTS.projections || Number(row.evidence) !== EXPECTED_COUNTS.evidence || Number(row.replay) !== EXPECTED_COUNTS.replay || Number(row.members) !== EXPECTED_COUNTS.members || Number(row.manifests) !== EXPECTED_COUNTS.manifests) throw new Error("MVP8S_CANDIDATE_COUNTS_INVALID")
    if (Number(row.projection_count) !== EXPECTED_COUNTS.projections || Number(row.evidence_summary_count) !== EXPECTED_COUNTS.evidence || Number(row.replay_snapshot_count) !== EXPECTED_COUNTS.replay) throw new Error("MVP8S_CANDIDATE_DECLARED_COUNTS_INVALID")
    if (requireInactive && (row.lifecycle !== "WITHHELD" || row.exposure !== "INTERNAL_ONLY" || row.exposure_eligibility !== "INELIGIBLE" || Number(row.exposures) !== 0)) throw new Error("MVP8S_CANDIDATE_NOT_INACTIVE")
  }

  private async validApproval(sql: postgres.TransactionSql, approvalId: string, candidateId: string, candidateChecksum: string, target: string, operator: string, at: string) {
    const rows = await sql.unsafe<Array<Record<string, string>>>("SELECT * FROM serving_control.cutover_approval WHERE approval_id=$1 AND candidate_id=$2 AND candidate_checksum=$3 AND target_fingerprint=$4 AND operator_id=$5 AND created_at <= $6 AND expires_at > $6", [approvalId,candidateId,candidateChecksum,target,operator,at])
    return rows[0] ?? null
  }

  private async validAuthorization(sql: postgres.TransactionSql, authorizationId: string, operation: CutoverOperation, candidateId: string, candidateChecksum: string, target: string, operator: string, expectedExposure: string, expectedCorpus: string, expectedCorpusChecksum: string, activationEventId: string | null, at: string) {
    const rows = await sql.unsafe<Array<Record<string, string>>>("SELECT a.* FROM serving_control.cutover_authorization a LEFT JOIN serving_control.cutover_authorization_consumption c ON c.authorization_id=a.authorization_id WHERE a.authorization_id=$1 AND a.operation=$2 AND a.candidate_id=$3 AND a.candidate_checksum=$4 AND a.target_fingerprint=$5 AND a.operator_id=$6 AND a.expected_current_exposure_id=$7 AND a.expected_current_corpus_id=$8 AND a.expected_current_corpus_checksum=$9 AND a.related_activation_event_id IS NOT DISTINCT FROM $10 AND a.created_at <= $11 AND a.expires_at > $11 AND c.authorization_id IS NULL", [authorizationId,operation,candidateId,candidateChecksum,target,operator,expectedExposure,expectedCorpus,expectedCorpusChecksum,activationEventId,at])
    if (!rows[0]) throw new Error("MVP8S_AUTHORIZATION_INVALID_OR_CONSUMED")
    return rows[0]
  }

  private async activeBaseline(sql: postgres.TransactionSql) {
    const rows = await sql.unsafe<Array<{ exposure_id: string; corpus_id: string; serving_checksum: string }>>("SELECT e.exposure_id,e.corpus_id,c.serving_checksum FROM serving.serving_exposure e JOIN serving.serving_corpus c ON c.corpus_id=e.corpus_id WHERE e.exposure_state='CONSUMER_VISIBLE' ORDER BY e.effective_from DESC,e.exposure_id DESC LIMIT 1")
    if (!rows[0]) throw new Error("MVP8S_ACTIVE_BASELINE_MISSING")
    return Object.freeze({ exposureId: rows[0].exposure_id, corpusId: rows[0].corpus_id, corpusChecksum: rows[0].serving_checksum })
  }

  private async existingResult(sql: postgres.TransactionSql, requestId: string, eventType: string, authorizationId: string): Promise<GuardedCutoverResult | null> {
    const rows = await sql.unsafe<Array<Record<string, string>>>("SELECT * FROM serving_control.cutover_event WHERE request_id=$1", [requestId])
    const row = rows[0]
    if (!row) return null
    if (row.event_type !== eventType || row.authorization_id !== authorizationId) throw new Error("MVP8S_CUTOVER_REQUEST_CONFLICT")
    return Object.freeze({ status: "DUPLICATE", eventId: row.event_id, exposureId: row.new_exposure_id, corpusId: row.new_corpus_id, previousExposureId: row.previous_exposure_id, previousCorpusId: row.previous_corpus_id })
  }

  private async insertEvent(sql: postgres.TransactionSql, eventId: string, basis: Record<string, unknown>, checksum: string): Promise<void> {
    await sql.unsafe("INSERT INTO serving_control.cutover_event VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)", [eventId,String(basis.eventType),String(basis.requestId),String(basis.candidateId),String(basis.candidateChecksum),String(basis.targetFingerprint),String(basis.operatorId),String(basis.authorizationId),String(basis.previousExposureId),String(basis.previousCorpusId),String(basis.newExposureId),String(basis.newCorpusId),basis.relatedActivationEventId === null ? null : String(basis.relatedActivationEventId),String(basis.reason),String(basis.createdAt),checksum])
  }
}
