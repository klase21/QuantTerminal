import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  createImmutableConsistencyResult,
  validateConsistencyResultRequest,
  type ConsistencyResult,
  type ConsistencyResultConflict,
  type ConsistencyResultDiagnostic,
  type ConsistencyResultInputReference,
  type ConsistencyResultLookupResponse,
  type ConsistencyResultRunReference,
  type ConsistencyResultWriteOutcome,
  type ConsistencyResultWriteRequest,
} from "@/lib/data-platform/consistency"
import type postgres from "postgres"
import type { ConsistencyPostgresRuntime } from "./client"

type Sql = postgres.Sql | postgres.TransactionSql
export type ResultStoreFailurePoint = "AFTER_IDENTITY_CALCULATION" | "AFTER_RESULT_ROW" | "AFTER_FIRST_INPUT_LINK" | "AFTER_ALL_INPUT_LINKS" | "AFTER_TEMPORAL_LINK" | "AFTER_DIAGNOSTICS" | "AFTER_CHECKSUM_PERSISTENCE" | "AFTER_RUN_LINK" | "AFTER_COMMIT_UNKNOWN"
export interface ResultStoreFaultInjector { readonly fail: (point: ResultStoreFailurePoint) => void }

function conflictId(resultIdentity: string, existingChecksum: string, incomingChecksum: string): string {
  return "rconf_" + canonicalChecksum({ resultIdentity, existingChecksum, incomingChecksum })
}

export class ConsistencyResultStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime, private readonly faults?: ResultStoreFaultInjector) {
    if (runtime.roleIntent !== "CONSISTENCY_WORKER") throw new Error("CONSISTENCY_WORKER_ROLE_REQUIRED")
  }

  async write(request: ConsistencyResultWriteRequest): Promise<ConsistencyResultWriteOutcome> {
    const validation = validateConsistencyResultRequest(request)
    if (validation) return { status: "REJECTED", reason: validation }
    const result = createImmutableConsistencyResult(structuredClone(request))
    this.faults?.fail("AFTER_IDENTITY_CALCULATION")
    let outcome: ConsistencyResultWriteOutcome
    try {
      outcome = await this.runtime.transaction((sql) => this.writeTransaction(sql, request, result))
    } catch {
      return { status: "RETRYABLE_FAILURE", reason: "DATABASE_RETRYABLE" }
    }
    try {
      this.faults?.fail("AFTER_COMMIT_UNKNOWN")
      return outcome
    } catch {
      const reconciled = await this.lookup(result.resultIdentity)
      if (reconciled.status === "FOUND" && reconciled.result.checksum === result.checksum) {
        const runReference = reconciled.runReferences.find((reference) => reference.runId === request.runSpecification.runId)
        if (runReference) return { status: "DUPLICATE", result: reconciled.result, runReference, reconciledUnknownOutcome: true }
      }
      return { status: "RETRYABLE_FAILURE", reason: "UNKNOWN_WRITE_OUTCOME_UNRESOLVED" }
    }
  }

  async lookup(resultIdentity: string): Promise<ConsistencyResultLookupResponse> {
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.immutable_results WHERE result_identity=$1", [resultIdentity])
    if (!rows[0]) return { status: "NOT_FOUND", resultIdentity }
    const result = await this.readResult(this.runtime.sql, rows[0])
    return { status: "FOUND", result, runReferences: await this.readRunReferences(this.runtime.sql, result.resultId) }
  }

  async conflicts(resultIdentity: string): Promise<readonly ConsistencyResultConflict[]> {
    const rows = await this.runtime.sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.result_conflicts WHERE result_identity=$1 ORDER BY detected_at,conflict_id", [resultIdentity])
    return Object.freeze(rows.map((row) => this.mapConflict(row)))
  }

  private async writeTransaction(sql: postgres.TransactionSql, request: ConsistencyResultWriteRequest, result: ConsistencyResult): Promise<ConsistencyResultWriteOutcome> {
    await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [result.resultIdentity])
    const binding = await sql.unsafe<{ readonly valid: boolean }[]>("SELECT EXISTS(SELECT 1 FROM consistency.run_specifications s JOIN consistency.rules r ON r.rule_id=$4 AND r.rule_version=$5 AND r.rule_set_id=s.rule_set_id AND r.rule_set_version=s.rule_set_version WHERE s.run_id=$1 AND s.specification_checksum=$2 AND s.rule_set_id=$3 AND s.rule_set_version=$6) valid", [request.runSpecification.runId, request.runSpecification.specificationChecksum, result.ruleSetId, result.ruleId, result.ruleVersion, result.ruleSetVersion])
    if (!binding[0]?.valid) return { status: "REJECTED", reason: "RUN_SPECIFICATION_MISMATCH" }
    const existingRows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.immutable_results WHERE result_identity=$1", [result.resultIdentity])
    if (existingRows[0]) {
      const existing = await this.readResult(sql, existingRows[0])
      if (existing.checksum !== result.checksum) {
        const conflict = this.createConflict(result, existing)
        await sql.unsafe("INSERT INTO consistency.result_conflicts(conflict_id,result_identity,existing_result_id,existing_checksum,incoming_checksum,rule_id,rule_version,input_set_identity,detected_at,reason_code) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT DO NOTHING", [conflict.conflictId, conflict.resultIdentity, conflict.existingResultId, conflict.existingChecksum, conflict.incomingChecksum, conflict.ruleId, conflict.ruleVersion, conflict.inputSetIdentity, conflict.detectedAt, conflict.reasonCode])
        return { status: "CONFLICT", conflict, existingResult: existing }
      }
      const inserted = await sql.unsafe<{ readonly result_id: string }[]>("INSERT INTO consistency.result_run_links(result_id,run_id,run_specification_checksum,source_alignment_id,source_alignment_checksum,linked_at) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING result_id", [existing.resultId, request.runSpecification.runId, request.runSpecification.specificationChecksum, request.alignment.alignmentId, request.alignment.checksum, request.createdAt])
      const runReference = this.runReference(existing.resultId, request)
      return inserted.length ? { status: "REUSED", result: existing, runReference, reconciledUnknownOutcome: false } : { status: "DUPLICATE", result: existing, runReference, reconciledUnknownOutcome: false }
    }
    await this.insertResult(sql, result)
    this.faults?.fail("AFTER_RESULT_ROW")
    for (let index = 0; index < result.inputs.length; index += 1) {
      await this.insertInput(sql, result.resultId, result.inputs[index]!)
      if (index === 0) this.faults?.fail("AFTER_FIRST_INPUT_LINK")
    }
    this.faults?.fail("AFTER_ALL_INPUT_LINKS")
    await sql.unsafe("INSERT INTO consistency.result_temporal_references VALUES($1,$2,$3,$4,$5,$6::text::jsonb)", [result.resultId, request.alignment.alignmentId, request.alignment.checksum, request.alignment.mode, request.alignment.status, JSON.stringify(request.alignment.noLookaheadDecisions)])
    this.faults?.fail("AFTER_TEMPORAL_LINK")
    for (const diagnostic of result.diagnostics) await this.insertDiagnostic(sql, result.resultId, diagnostic)
    this.faults?.fail("AFTER_DIAGNOSTICS")
    this.faults?.fail("AFTER_CHECKSUM_PERSISTENCE")
    const runReference = this.runReference(result.resultId, request)
    await sql.unsafe("INSERT INTO consistency.result_run_links VALUES($1,$2,$3,$4,$5,$6)", [runReference.resultId, runReference.runId, runReference.runSpecificationChecksum, runReference.sourceAlignmentId, runReference.sourceAlignmentChecksum, runReference.linkedAt])
    this.faults?.fail("AFTER_RUN_LINK")
    return { status: "CREATED", result, runReference, reconciledUnknownOutcome: false }
  }

  private async insertResult(sql: Sql, result: ConsistencyResult): Promise<void> {
    await sql.unsafe("INSERT INTO consistency.immutable_results VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19::text::jsonb,$20,$21,$22,$23,$24,$25)", [result.resultId, result.resultIdentity, result.inputSetIdentity, result.ruleId, result.ruleVersion, result.ruleSetId, result.ruleSetVersion, result.temporalAlignmentId, result.temporalAlignmentChecksum, result.outcome, result.severity, result.blocking, result.eventTimeWindow.start, result.eventTimeWindow.end, result.knowledgeMode, result.knowledgeTimeCutoff, result.policyBindings.temporalPolicyId, result.policyBindings.temporalPolicyVersion, JSON.stringify(result.policyBindings.comparisonPolicyReferences), result.policyBindings.severityPolicyId, result.policyBindings.severityPolicyVersion, result.diagnosticSchemaVersion, result.schemaVersion, result.checksum, result.createdAt])
  }

  private async insertInput(sql: Sql, resultId: string, input: ConsistencyResultInputReference): Promise<void> {
    await sql.unsafe("INSERT INTO consistency.result_input_references VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)", [resultId, input.roleId, input.canonicalRecordId, input.recordVersion, input.datasetId, input.providerId, input.providerSnapshotId, input.effectiveAt, input.observedAt, input.knowledgeAvailableAt, input.publicationState, input.supersessionState, input.checksum, input.lineageNodeId])
  }

  private async insertDiagnostic(sql: Sql, resultId: string, diagnostic: ConsistencyResultDiagnostic): Promise<void> {
    await sql.unsafe("INSERT INTO consistency.immutable_result_diagnostics VALUES($1,$2,$3,$4,$5,$6::text::jsonb,$7)", [resultId, diagnostic.diagnosticId, diagnostic.code, diagnostic.schemaVersion, diagnostic.inputRoleIds, JSON.stringify(diagnostic.boundedValues), diagnostic.explanationCode])
  }

  private async readResult(sql: Sql, row: Record<string, unknown>): Promise<ConsistencyResult> {
    const resultId = String(row.result_id)
    const inputs = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.result_input_references WHERE result_id=$1 ORDER BY role_id,canonical_record_id,record_version", [resultId])
    const diagnostics = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.immutable_result_diagnostics WHERE result_id=$1 ORDER BY diagnostic_id", [resultId])
    return Object.freeze({
      resultId, resultIdentity: String(row.result_identity), inputSetIdentity: String(row.input_set_identity), ruleId: String(row.rule_id), ruleVersion: String(row.rule_version), ruleSetId: String(row.rule_set_id), ruleSetVersion: String(row.rule_set_version), temporalAlignmentId: String(row.temporal_alignment_id), temporalAlignmentChecksum: String(row.temporal_alignment_checksum),
      inputs: Object.freeze(inputs.map((input) => this.mapInput(input))), outcome: row.outcome as ConsistencyResult["outcome"], severity: row.severity as ConsistencyResult["severity"], blocking: Boolean(row.blocking), diagnostics: Object.freeze(diagnostics.map((diagnostic) => this.mapDiagnostic(diagnostic))),
      eventTimeWindow: Object.freeze({ start: new Date(String(row.event_time_start)).toISOString(), end: new Date(String(row.event_time_end)).toISOString() }), knowledgeMode: row.knowledge_mode as ConsistencyResult["knowledgeMode"], knowledgeTimeCutoff: new Date(String(row.knowledge_time_cutoff)).toISOString(),
      policyBindings: Object.freeze({ temporalPolicyId: String(row.temporal_policy_id), temporalPolicyVersion: String(row.temporal_policy_version), comparisonPolicyReferences: Object.freeze(row.comparison_policy_references as ConsistencyResult["policyBindings"]["comparisonPolicyReferences"]), severityPolicyId: String(row.severity_policy_id), severityPolicyVersion: String(row.severity_policy_version) }),
      diagnosticSchemaVersion: String(row.diagnostic_schema_version), schemaVersion: String(row.result_schema_version), checksum: String(row.result_checksum), createdAt: new Date(String(row.created_at)).toISOString(),
    })
  }

  private mapInput(row: Record<string, unknown>): ConsistencyResultInputReference {
    return Object.freeze({ roleId: String(row.role_id), canonicalRecordId: String(row.canonical_record_id), recordVersion: Number(row.record_version), datasetId: String(row.dataset_id), providerId: String(row.provider_id), providerSnapshotId: String(row.provider_snapshot_id), effectiveAt: row.effective_at ? new Date(String(row.effective_at)).toISOString() : null, observedAt: new Date(String(row.observed_at)).toISOString(), knowledgeAvailableAt: new Date(String(row.knowledge_available_at)).toISOString(), publicationState: row.publication_state as ConsistencyResultInputReference["publicationState"], supersessionState: row.supersession_state as ConsistencyResultInputReference["supersessionState"], checksum: String(row.input_checksum), lineageNodeId: String(row.lineage_node_id) })
  }

  private mapDiagnostic(row: Record<string, unknown>): ConsistencyResultDiagnostic {
    return Object.freeze({ diagnosticId: String(row.diagnostic_id), code: String(row.code), schemaVersion: String(row.schema_version), inputRoleIds: Object.freeze(row.input_role_ids as string[]), boundedValues: Object.freeze(row.bounded_values as ConsistencyResultDiagnostic["boundedValues"]), explanationCode: String(row.explanation_code) })
  }

  private async readRunReferences(sql: Sql, resultId: string): Promise<readonly ConsistencyResultRunReference[]> {
    const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT * FROM consistency.result_run_links WHERE result_id=$1 ORDER BY run_id", [resultId])
    return Object.freeze(rows.map((row) => Object.freeze({ resultId, runId: String(row.run_id), runSpecificationChecksum: String(row.run_specification_checksum), sourceAlignmentId: String(row.source_alignment_id), sourceAlignmentChecksum: String(row.source_alignment_checksum), linkedAt: new Date(String(row.linked_at)).toISOString() })))
  }

  private runReference(resultId: string, request: ConsistencyResultWriteRequest): ConsistencyResultRunReference {
    return Object.freeze({ resultId, runId: request.runSpecification.runId, runSpecificationChecksum: request.runSpecification.specificationChecksum, sourceAlignmentId: request.alignment.alignmentId, sourceAlignmentChecksum: request.alignment.checksum, linkedAt: request.createdAt })
  }

  private createConflict(incoming: ConsistencyResult, existing: ConsistencyResult): ConsistencyResultConflict {
    return Object.freeze({ conflictId: conflictId(incoming.resultIdentity, existing.checksum, incoming.checksum), resultIdentity: incoming.resultIdentity, existingResultId: existing.resultId, existingChecksum: existing.checksum, incomingChecksum: incoming.checksum, ruleId: incoming.ruleId, ruleVersion: incoming.ruleVersion, inputSetIdentity: incoming.inputSetIdentity, detectedAt: incoming.createdAt, reasonCode: "IMMUTABLE_CONTENT_MISMATCH" })
  }

  private mapConflict(row: Record<string, unknown>): ConsistencyResultConflict {
    return Object.freeze({ conflictId: String(row.conflict_id), resultIdentity: String(row.result_identity), existingResultId: String(row.existing_result_id), existingChecksum: String(row.existing_checksum), incomingChecksum: String(row.incoming_checksum), ruleId: String(row.rule_id), ruleVersion: String(row.rule_version), inputSetIdentity: String(row.input_set_identity), detectedAt: new Date(String(row.detected_at)).toISOString(), reasonCode: "IMMUTABLE_CONTENT_MISMATCH" })
  }
}
