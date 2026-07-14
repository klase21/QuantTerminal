import type { MvpMarketAssessment } from "@/lib/data-platform/consistency/mvpEvidence"
import type { ConsistencyPostgresRuntime } from "./client"

export type MvpAssessmentWriteOutcome =
  | { readonly status: "CREATED" | "DUPLICATE"; readonly assessment: MvpMarketAssessment }
  | { readonly status: "CONFLICT"; readonly assessmentId: string }

export class MvpEvidenceAssessmentStore {
  constructor(private readonly runtime: ConsistencyPostgresRuntime) {
    if (runtime.roleIntent !== "EVIDENCE_ASSEMBLER") throw new Error("EVIDENCE_ASSEMBLER_ROLE_REQUIRED")
  }

  async write(packetVersionId: string, assessment: MvpMarketAssessment): Promise<MvpAssessmentWriteOutcome> {
    return this.runtime.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [assessment.assessmentIdentity])
      const existing = await sql.unsafe<{ assessment_checksum: string; packet_version_id: string }[]>("SELECT assessment_checksum,packet_version_id FROM evidence.mvp_market_assessments WHERE assessment_identity=$1", [assessment.assessmentIdentity])
      if (existing[0]) return existing[0].assessment_checksum === assessment.assessmentChecksum && existing[0].packet_version_id === packetVersionId ? { status: "DUPLICATE", assessment } : { status: "CONFLICT", assessmentId: assessment.assessmentId }
      await sql.unsafe(
        "INSERT INTO evidence.mvp_market_assessments VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::text::jsonb,$13::text::jsonb,$14,$15::text::jsonb,$16::text::jsonb,$17,$18::text::jsonb,$19::text::jsonb,$20,$21)",
        [assessment.assessmentId, assessment.assessmentIdentity, assessment.assessmentChecksum, packetVersionId, assessment.corpusId, assessment.corpusChecksum, assessment.instrument, assessment.eventTimeStart, assessment.eventTimeEnd, assessment.knowledgeTimeCutoff, assessment.marketState, JSON.stringify(assessment.structuredInterpretation), JSON.stringify(assessment.confidence.components), assessment.confidence.classification, JSON.stringify(assessment.coverage), JSON.stringify(assessment.sourceLineage), assessment.limitations, JSON.stringify(assessment.ruleVersions), JSON.stringify(assessment.measurementVersions), assessment.recomputeIdentity, assessment.createdAt],
      )
      return { status: "CREATED", assessment }
    })
  }

  async lookup(assessmentIdentity: string): Promise<{ readonly assessmentId: string; readonly checksum: string; readonly packetVersionId: string } | null> {
    const rows = await this.runtime.sql.unsafe<{ assessment_id: string; assessment_checksum: string; packet_version_id: string }[]>("SELECT assessment_id,assessment_checksum,packet_version_id FROM evidence.mvp_market_assessments WHERE assessment_identity=$1", [assessmentIdentity])
    return rows[0] ? Object.freeze({ assessmentId: rows[0].assessment_id, checksum: rows[0].assessment_checksum, packetVersionId: rows[0].packet_version_id }) : null
  }
}
