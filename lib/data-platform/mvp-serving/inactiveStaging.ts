import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { verifyMvpProjection, type MvpProjectionVersion } from "@/lib/data-platform/evidence-platform"
import type postgres from "postgres"
import type { MvpServingPostgresClient } from "./client"
import { verifyReplaySnapshot, verifyServingEvidenceSummary, type ServingEvidenceSummary, type ServingReplaySnapshot } from "./contracts"
import { canonicalizeServingCorpusMembers, type ServingCorpusMember } from "./candidateMembership"
import { insertServingEvidencePayload, insertServingProjectionPayload, insertServingReplayPayload, mapServingEvidencePayload, mapServingProjectionPayload, mapServingReplayPayload } from "./store"

export const MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION = "mvp-inactive-serving-stage/1.0.0" as const
export const MVP_INACTIVE_SERVING_STAGE_COUNTS = Object.freeze({ projections: 62, evidenceSummaries: 6, replaySnapshots: 6, members: 74 })
export const MVP_INACTIVE_SERVING_STAGE_WRITE_ORDER = Object.freeze(["PROJECTION_PAYLOADS", "EVIDENCE_PAYLOADS", "REPLAY_PAYLOADS", "MEMBERS", "MANIFEST", "READBACK"] as const)
const REQUIRED_SYMBOLS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])

export interface InactiveServingWatermarkBinding {
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
}

export interface InactiveServingCandidateInput extends InactiveServingWatermarkBinding {
  readonly schemaVersion: typeof MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION
  readonly replaySourceCorpusId: string
  readonly replaySourceCorpusChecksum: string
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
}

export interface InactiveServingCandidatePlan extends InactiveServingWatermarkBinding {
  readonly candidateId: string
  readonly servingChecksum: string
  readonly genesisCorpusId: string
  readonly genesisChecksum: string
  readonly schemaVersion: typeof MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION
  readonly verifiedSourceCorpusId: string
  readonly verifiedSourceCorpusChecksum: string
  readonly replaySourceCorpusId: string
  readonly replaySourceCorpusChecksum: string
  readonly generatedAt: string
  readonly governedThrough: string
  readonly counts: typeof MVP_INACTIVE_SERVING_STAGE_COUNTS
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
  readonly members: readonly ServingCorpusMember[]
  readonly memberSetChecksum: string
  readonly manifest: Readonly<Record<string, unknown>>
  readonly manifestId: string
  readonly manifestChecksum: string
}

export interface InactiveServingCandidateReview {
  readonly candidateId: string
  readonly servingChecksum: string
  readonly lifecycle: "WITHHELD"
  readonly exposure: "INTERNAL_ONLY"
  readonly exposureCount: 0
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
  readonly memberSetChecksum: string
  readonly manifestChecksum: string
  readonly counts: typeof MVP_INACTIVE_SERVING_STAGE_COUNTS
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
}

export interface StageInactiveServingCandidateOptions {
  readonly injectFailureAfter?: "PAYLOADS" | "MEMBERS" | "MANIFEST"
}

export interface SeparateTargetInactivePublicationOptions {
  readonly targetId: string
  readonly expectedTargetId: string
}

export interface ServingTargetInactiveCopyOptions extends SeparateTargetInactivePublicationOptions {
  readonly sourceTargetId: string
  readonly expectedActiveExposureId: string
  readonly expectedActiveCorpusId: string
  readonly requestId: string
  readonly operatorId: string
  readonly copyReason: string
  readonly dryRun: boolean
}

export function computeInactiveServingCandidateId(input: {
  readonly schemaVersion: string
  readonly verifiedSourceCorpusId: string
  readonly verifiedSourceCorpusChecksum: string
  readonly bindings: InactiveServingWatermarkBinding
  readonly counts: Readonly<Record<string, number>>
  readonly members: readonly ServingCorpusMember[]
}): string {
  const digest = canonicalChecksum({
    schemaVersion: input.schemaVersion,
    verifiedSourceCorpusId: input.verifiedSourceCorpusId,
    verifiedSourceCorpusChecksum: input.verifiedSourceCorpusChecksum,
    commonWatermarkId: input.bindings.commonWatermarkId,
    commonWatermarkValue: input.bindings.commonWatermarkValue,
    commonWatermarkChecksum: input.bindings.commonWatermarkChecksum,
    counts: input.counts,
    members: canonicalizeServingCorpusMembers(input.members).map(memberIdentity),
  })
  return `mvp8i-candidate:${digest}`
}

export function computeVerifiedInactiveServingSourceCorpus(input: {
  readonly projections: readonly MvpProjectionVersion[]
  readonly evidenceSummaries: readonly ServingEvidenceSummary[]
  readonly replaySourceCorpusId: string
  readonly replaySourceCorpusChecksum: string
  readonly replaySnapshots: readonly ServingReplaySnapshot[]
  readonly bindings: InactiveServingWatermarkBinding
}): { readonly corpusId: string; readonly checksum: string } {
  if (!input.replaySourceCorpusId || !isChecksum(input.replaySourceCorpusChecksum)) throw new Error("MVP8I_REPLAY_SOURCE_CORPUS_BINDING_INVALID")
  const basis = {
    schemaVersion: "mvp8i-verified-serving-source/1.0.0",
    projections: [...input.projections].sort((a, b) => a.projectionVersionId.localeCompare(b.projectionVersionId)).map((value) => [value.projectionVersionId, value.projectionVersionIdentity, value.projectionChecksum]),
    evidenceSummaries: [...input.evidenceSummaries].sort((a, b) => a.evidenceSummaryId.localeCompare(b.evidenceSummaryId)).map((value) => [value.evidenceSummaryId, value.evidencePacketId, value.summaryChecksum]),
    replaySourceCorpusId: input.replaySourceCorpusId,
    replaySourceCorpusChecksum: input.replaySourceCorpusChecksum,
    replaySnapshots: [...input.replaySnapshots].sort((a, b) => a.instrument.localeCompare(b.instrument)).map((value) => [value.replaySnapshotId, value.snapshotChecksum, value.modelChecksum]),
    commonWatermarkId: input.bindings.commonWatermarkId,
    commonWatermarkValue: input.bindings.commonWatermarkValue,
    commonWatermarkChecksum: input.bindings.commonWatermarkChecksum,
  }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ corpusId: `mvp8i-verified-source:${checksum}`, checksum })
}

export function prepareInactiveServingCandidate(input: InactiveServingCandidateInput): InactiveServingCandidatePlan {
  requireInputRecord(input)
  const commonWatermarkValue = canonicalIso(input.commonWatermarkValue, "MVP8I_COMMON_WATERMARK_VALUE_INVALID")
  if (input.schemaVersion !== MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION) throw new Error("MVP8I_SCHEMA_VERSION_UNKNOWN")
  if (!input.replaySourceCorpusId || !isChecksum(input.replaySourceCorpusChecksum)) throw new Error("MVP8I_REPLAY_SOURCE_CORPUS_BINDING_INVALID")
  if (!input.commonWatermarkId || !isChecksum(input.commonWatermarkChecksum)) throw new Error("MVP8I_COMMON_WATERMARK_BINDING_INVALID")
  if (input.projections.length !== MVP_INACTIVE_SERVING_STAGE_COUNTS.projections || input.evidenceSummaries.length !== MVP_INACTIVE_SERVING_STAGE_COUNTS.evidenceSummaries || input.replaySnapshots.length !== MVP_INACTIVE_SERVING_STAGE_COUNTS.replaySnapshots) throw new Error("MVP8I_PAYLOAD_COUNTS_INVALID")

  const projections = Object.freeze([...input.projections].sort((a, b) => a.projectionVersionId.localeCompare(b.projectionVersionId)))
  requireUnique(projections.map((value) => value.projectionVersionId), "MVP8I_PROJECTION_ID_DUPLICATE")
  for (const projection of projections) {
    if (!verifyMvpProjection(projection)) throw new Error(`MVP8I_PROJECTION_CHECKSUM_MISMATCH:${projection.projectionVersionId}`)
    if (projection.eventTimeEnd !== commonWatermarkValue || projection.lifecycleState !== "GENERATED" || projection.consumerExposureState !== "READY_FOR_CUTOVER") throw new Error(`MVP8I_PROJECTION_CONTRACT_INVALID:${projection.projectionVersionId}`)
  }
  const research = projections.filter((value) => value.projectionKind === "ResearchEvidenceProjection")
  const replaySources = new Map(projections.filter((value) => value.projectionKind === "ReplayTimelineProjection").map((value) => [value.projectionVersionId, value]))
  if (research.length !== 6 || replaySources.size !== 6) throw new Error("MVP8I_SOURCE_PROJECTION_SHAPE_INVALID")
  requireInternalFacadeProjectionShape(projections)

  const evidenceSummaries = Object.freeze([...input.evidenceSummaries].sort((a, b) => a.evidenceSummaryId.localeCompare(b.evidenceSummaryId)))
  requireUnique(evidenceSummaries.map((value) => value.evidenceSummaryId), "MVP8I_EVIDENCE_ID_DUPLICATE")
  for (const summary of evidenceSummaries) {
    if (!verifyServingEvidenceSummary(summary)) throw new Error(`MVP8I_EVIDENCE_CHECKSUM_MISMATCH:${summary.evidenceSummaryId}`)
    const sourceId = summary.sourceProjectionIdentities.length === 1 ? summary.sourceProjectionIdentities[0] : null
    const source = research.find((value) => value.projectionVersionId === sourceId)
    if (!source || summary.evidencePacketId !== String(source.structuredPayload.packetId ?? "") || summary.eventTimeEnd !== commonWatermarkValue) throw new Error(`MVP8I_EVIDENCE_BINDING_INVALID:${summary.evidenceSummaryId}`)
  }
  if (evidenceSummaries.map((value) => value.instrument).sort().join(",") !== [...REQUIRED_SYMBOLS].sort().join(",")) throw new Error("MVP8I_EVIDENCE_SYMBOL_SET_INVALID")

  const replaySnapshots = Object.freeze([...input.replaySnapshots].sort((a, b) => a.instrument.localeCompare(b.instrument)))
  requireUnique(replaySnapshots.map((value) => value.replaySnapshotId), "MVP8I_REPLAY_ID_DUPLICATE")
  if (replaySnapshots.map((value) => value.instrument).join(",") !== [...REQUIRED_SYMBOLS].sort().join(",")) throw new Error("MVP8I_REPLAY_SYMBOL_SET_INVALID")
  for (const snapshot of replaySnapshots) {
    const source = replaySources.get(snapshot.sourceProjectionVersionId)
    if (!verifyReplaySnapshot(snapshot)) throw new Error(`MVP8I_REPLAY_CHECKSUM_MISMATCH:${snapshot.replaySnapshotId}`)
    if (!source || source.projectionChecksum !== snapshot.sourceProjectionChecksum || snapshot.payload.modelChecksum !== snapshot.modelChecksum || snapshot.eventTimeEnd !== commonWatermarkValue || snapshot.priceSampleCount !== 288 || snapshot.openInterestSampleCount !== 288 || snapshot.fundingSampleCount !== 3 || snapshot.flowBucketCount !== 48 || snapshot.payload.sampleCounts.price !== 288 || snapshot.payload.sampleCounts.openInterest !== 288 || snapshot.payload.sampleCounts.funding !== 3 || snapshot.payload.sampleCounts.flow !== 48) throw new Error(`MVP8I_REPLAY_BINDING_INVALID:${snapshot.replaySnapshotId}`)
  }

  const bindings = Object.freeze({ commonWatermarkId: input.commonWatermarkId, commonWatermarkValue, commonWatermarkChecksum: input.commonWatermarkChecksum })
  const verifiedSource = computeVerifiedInactiveServingSourceCorpus({ projections, evidenceSummaries, replaySourceCorpusId: input.replaySourceCorpusId, replaySourceCorpusChecksum: input.replaySourceCorpusChecksum, replaySnapshots, bindings })
  const members = canonicalizeServingCorpusMembers([
    ...projections.map((value): ServingCorpusMember => Object.freeze({ memberKind: "PROJECTION", memberId: value.projectionVersionId, memberChecksum: value.projectionChecksum, canonicalSortKey: `PROJECTION:${value.projectionKind}:${value.subjectId}:${value.projectionVersionId}`, inheritedSourceCorpusId: verifiedSource.corpusId, schemaVersion: value.schemaVersion, metadata: Object.freeze({ payloadTable: "serving_projection" }) })),
    ...evidenceSummaries.map((value): ServingCorpusMember => Object.freeze({ memberKind: "EVIDENCE_SUMMARY", memberId: value.evidenceSummaryId, memberChecksum: value.summaryChecksum, canonicalSortKey: `EVIDENCE_SUMMARY:${value.instrument}:${value.evidenceSummaryId}`, inheritedSourceCorpusId: verifiedSource.corpusId, schemaVersion: "mvp-serving-evidence/1.0.0", metadata: Object.freeze({ payloadTable: "serving_evidence_summary" }) })),
    ...replaySnapshots.map((value): ServingCorpusMember => Object.freeze({ memberKind: "REPLAY_SNAPSHOT", memberId: value.replaySnapshotId, memberChecksum: value.snapshotChecksum, canonicalSortKey: `REPLAY_SNAPSHOT:${value.instrument}:${value.replaySnapshotId}`, inheritedSourceCorpusId: verifiedSource.corpusId, schemaVersion: value.modelVersion, metadata: Object.freeze({ payloadTable: "serving_replay_sequence", modelChecksum: value.modelChecksum, replaySourceCorpusId: input.replaySourceCorpusId }) })),
  ])
  if (members.length !== MVP_INACTIVE_SERVING_STAGE_COUNTS.members) throw new Error("MVP8I_MEMBER_COUNT_INVALID")
  const memberSetChecksum = canonicalChecksum(members.map(memberIdentity))
  const candidateId = computeInactiveServingCandidateId({ schemaVersion: input.schemaVersion, verifiedSourceCorpusId: verifiedSource.corpusId, verifiedSourceCorpusChecksum: verifiedSource.checksum, bindings, counts: MVP_INACTIVE_SERVING_STAGE_COUNTS, members })
  const servingChecksum = candidateId.slice("mvp8i-candidate:".length)
  const genesisChecksum = canonicalChecksum({ schemaVersion: "mvp-inactive-serving-stage-genesis/1.0.0", verifiedSourceCorpusId: verifiedSource.corpusId, verifiedSourceCorpusChecksum: verifiedSource.checksum, ...bindings })
  const genesisCorpusId = `mvp8i-genesis:${genesisChecksum}`
  const manifest = Object.freeze({ schemaVersion: input.schemaVersion, candidateId, servingChecksum, verifiedSourceCorpusId: verifiedSource.corpusId, verifiedSourceCorpusChecksum: verifiedSource.checksum, replaySourceCorpusId: input.replaySourceCorpusId, replaySourceCorpusChecksum: input.replaySourceCorpusChecksum, genesisCorpusId, genesisChecksum, ...bindings, memberSetChecksum, counts: MVP_INACTIVE_SERVING_STAGE_COUNTS, lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY", exposureEligibility: "INELIGIBLE" })
  const manifestChecksum = canonicalChecksum(manifest)
  return Object.freeze({ candidateId, servingChecksum, genesisCorpusId, genesisChecksum, schemaVersion: input.schemaVersion, verifiedSourceCorpusId: verifiedSource.corpusId, verifiedSourceCorpusChecksum: verifiedSource.checksum, replaySourceCorpusId: input.replaySourceCorpusId, replaySourceCorpusChecksum: input.replaySourceCorpusChecksum, generatedAt: commonWatermarkValue, governedThrough: commonWatermarkValue, counts: MVP_INACTIVE_SERVING_STAGE_COUNTS, projections, evidenceSummaries, replaySnapshots, members, memberSetChecksum, manifest, manifestId: `mvp8i-manifest:${manifestChecksum}`, manifestChecksum, ...bindings })
}

export async function stageInactiveServingCandidate(client: MvpServingPostgresClient, input: InactiveServingCandidateInput, options: StageInactiveServingCandidateOptions = {}): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly review: InactiveServingCandidateReview }> {
  if (client.roleIntent !== "PUBLISHER" || client.targetKind !== "LOCAL_ISOLATED") throw new Error("MVP8I_LOCAL_SERVING_PUBLISHER_REQUIRED")
  const plan = prepareInactiveServingCandidate(input)
  return client.transaction(async (sql) => {
    await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [plan.candidateId])
    if (await exposureCount(sql) !== 0) throw new Error("MVP8I_ZERO_EXPOSURE_REQUIRED")
    const existing = await sql.unsafe<Array<{ corpus_id: string }>>("SELECT corpus_id FROM serving.serving_corpus WHERE corpus_id=$1", [plan.candidateId])
    if (existing[0]) return Object.freeze({ status: "DUPLICATE" as const, review: await readInactiveServingCandidateReview(sql, plan.candidateId, plan) })

    await ensureGenesis(sql, plan)
    await sql.unsafe("INSERT INTO serving.serving_corpus (corpus_id,corpus_version,source_corpus_id,source_corpus_checksum,serving_checksum,schema_version,generated_at,governed_through,lifecycle,exposure,projection_count,evidence_summary_count,replay_snapshot_count,demo_profile_count,release_inventory_count,publication_event_count) VALUES($1,'mvp-inactive-serving-candidate/1.0.0',$2,$3,$4,$5,$6,$7,'WITHHELD','INTERNAL_ONLY',$8,$9,$10,0,0,0)", [plan.candidateId, plan.verifiedSourceCorpusId, plan.verifiedSourceCorpusChecksum, plan.servingChecksum, plan.schemaVersion, plan.generatedAt, plan.governedThrough, plan.counts.projections, plan.counts.evidenceSummaries, plan.counts.replaySnapshots])
    const corpus = { corpusId: plan.candidateId, sourceCorpusId: plan.verifiedSourceCorpusId, generatedAt: plan.generatedAt }
    for (const value of plan.projections) await insertServingProjectionPayload(sql, corpus, value)
    for (const value of plan.evidenceSummaries) await insertServingEvidencePayload(sql, corpus, value)
    for (const value of plan.replaySnapshots) await insertServingReplayPayload(sql, corpus, value)
    await verifyPayloadReadback(sql, plan)
    if (options.injectFailureAfter === "PAYLOADS") throw new Error("MVP8I_INJECTED_FAILURE_AFTER_PAYLOADS")

    for (const member of plan.members) await sql.unsafe("INSERT INTO serving.serving_corpus_member (corpus_id,member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)", [plan.candidateId, member.memberKind, member.memberId, member.memberChecksum, member.canonicalSortKey, member.inheritedSourceCorpusId, member.schemaVersion, JSON.stringify(member.metadata), plan.generatedAt])
    await verifyMemberReadback(sql, plan)
    if (options.injectFailureAfter === "MEMBERS") throw new Error("MVP8I_INJECTED_FAILURE_AFTER_MEMBERS")

    await sql.unsafe("INSERT INTO serving.serving_candidate_manifest (manifest_id,corpus_id,previous_corpus_id,previous_serving_checksum,manifest_checksum,schema_version,lifecycle,exposure_eligibility,manifest,created_at,common_watermark_id,common_watermark_value,common_watermark_checksum,member_set_checksum) VALUES($1,$2,$3,$4,$5,$6,'CANDIDATE','INELIGIBLE',$7::text::jsonb,$8,$9,$10,$11,$12)", [plan.manifestId, plan.candidateId, plan.genesisCorpusId, plan.genesisChecksum, plan.manifestChecksum, plan.schemaVersion, JSON.stringify(plan.manifest), plan.generatedAt, plan.commonWatermarkId, plan.commonWatermarkValue, plan.commonWatermarkChecksum, plan.memberSetChecksum])
    const review = await readInactiveServingCandidateReview(sql, plan.candidateId, plan)
    if (options.injectFailureAfter === "MANIFEST") throw new Error("MVP8I_INJECTED_FAILURE_AFTER_MANIFEST")
    return Object.freeze({ status: "CREATED" as const, review })
  })
}

export async function publishInactiveCandidateToSeparateTarget(writer: MvpServingPostgresClient, reader: MvpServingPostgresClient, input: InactiveServingCandidateInput, options: SeparateTargetInactivePublicationOptions): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly review: InactiveServingCandidateReview; readonly exposureFingerprint: string }> {
  validateSeparateTargetPublicationClients(writer, reader, options)
  const plan = prepareInactiveServingCandidate(input)
  const before = await exposureFingerprint(reader.sql)
  if (await candidateExposureCount(reader.sql, plan.candidateId) !== 0) throw new Error("MVP8L_CANDIDATE_EXPOSURE_PREEXISTS")
  const existing = await reader.sql.unsafe<Array<{ corpus_id: string }>>("SELECT corpus_id FROM serving.serving_corpus WHERE corpus_id=$1", [plan.candidateId])
  let status: "CREATED" | "DUPLICATE" = "DUPLICATE"
  if (!existing[0]) {
    await writer.transaction(async (sql) => {
      await sql.unsafe("SELECT pg_advisory_xact_lock(hashtext($1))", [plan.candidateId])
      const concurrent = await sql.unsafe<Array<{ corpus_id: string }>>("SELECT corpus_id FROM serving.serving_corpus WHERE corpus_id=$1", [plan.candidateId])
      if (concurrent[0]) return
      await persistInactiveServingPlan(sql, plan)
      status = "CREATED"
    })
  }
  const review = await readInactiveServingCandidateReview(reader.sql, plan.candidateId, plan)
  const after = await exposureFingerprint(reader.sql)
  if (before !== after || review.exposureCount !== 0) throw new Error("MVP8L_ACTIVE_EXPOSURE_CHANGED")
  return Object.freeze({ status, review, exposureFingerprint: after })
}

export async function copyInactiveCandidateToServingTarget(writer: MvpServingPostgresClient, reader: MvpServingPostgresClient, input: InactiveServingCandidateInput, options: ServingTargetInactiveCopyOptions): Promise<{ readonly status: "DRY_RUN" | "CREATED" | "DUPLICATE"; readonly candidateId: string; readonly receiptId: string; readonly review: InactiveServingCandidateReview | null; readonly exposureFingerprint: string }> {
  validateSeparateTargetPublicationClients(writer, reader, options)
  if (!options.sourceTargetId || options.sourceTargetId === options.targetId) throw new Error("MVP8P_SOURCE_TARGET_INVALID")
  if (!options.requestId.trim() || !options.operatorId.trim() || !options.copyReason.trim()) throw new Error("MVP8P_COPY_METADATA_REQUIRED")
  const privilege = await writer.sql.unsafe<Array<{ dangerous: boolean }>>("SELECT has_table_privilege(current_user,'serving.serving_exposure','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') dangerous")
  if (privilege[0]?.dangerous !== false) throw new Error("MVP8P_WRITER_EXPOSURE_PRIVILEGE_FORBIDDEN")
  const plan = prepareInactiveServingCandidate(input), baseline = await activeBaseline(reader.sql)
  if (baseline.exposureId !== options.expectedActiveExposureId || baseline.corpusId !== options.expectedActiveCorpusId) throw new Error("MVP8P_ACTIVE_BASELINE_MISMATCH")
  const before = await exposureFingerprint(reader.sql), receiptId = `mvp8p-copy:${canonicalChecksum({ requestId: options.requestId, candidateId: plan.candidateId, sourceTargetId: options.sourceTargetId, targetId: options.targetId, operatorId: options.operatorId, copyReason: options.copyReason, baseline })}`
  if (options.dryRun) return Object.freeze({ status: "DRY_RUN", candidateId: plan.candidateId, receiptId, review: null, exposureFingerprint: before })
  const outcome = await publishInactiveCandidateToSeparateTarget(writer, reader, input, options), afterBaseline = await activeBaseline(reader.sql)
  if (afterBaseline.exposureId !== baseline.exposureId || afterBaseline.corpusId !== baseline.corpusId || outcome.exposureFingerprint !== before) throw new Error("MVP8P_ACTIVE_BASELINE_CHANGED")
  return Object.freeze({ status: outcome.status, candidateId: plan.candidateId, receiptId, review: outcome.review, exposureFingerprint: outcome.exposureFingerprint })
}

export class PostgresMvpInactiveServingReadPort {
  constructor(private readonly client: MvpServingPostgresClient, private readonly sql: postgres.Sql | postgres.TransactionSql = client.sql) {
    if (client.roleIntent !== "READER") throw new Error("MVP8I_READER_ROLE_REQUIRED")
  }

  async selectCandidate(candidateId: string) {
    const review = await readInactiveServingCandidateReview(this.sql, candidateId)
    return createInactiveServingCandidateSelection(review)
  }

  async exportCandidateInput(candidateId: string): Promise<InactiveServingCandidateInput> {
    const review = await readInactiveServingCandidateReview(this.sql, candidateId)
    const rows = await this.sql.unsafe<Array<{ manifest: unknown }>>("SELECT manifest FROM serving.serving_candidate_manifest WHERE corpus_id=$1", [candidateId])
    const manifest = requireRecord(rows[0]?.manifest, "MVP8L_SOURCE_MANIFEST_MALFORMED")
    const replaySourceCorpusId = String(manifest.replaySourceCorpusId ?? ""), replaySourceCorpusChecksum = String(manifest.replaySourceCorpusChecksum ?? "")
    if (!replaySourceCorpusId || !isChecksum(replaySourceCorpusChecksum)) throw new Error("MVP8L_SOURCE_REPLAY_BINDING_INVALID")
    return Object.freeze({ schemaVersion: MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION, replaySourceCorpusId, replaySourceCorpusChecksum, commonWatermarkId: review.commonWatermarkId, commonWatermarkValue: review.commonWatermarkValue, commonWatermarkChecksum: review.commonWatermarkChecksum, projections: review.projections, evidenceSummaries: review.evidenceSummaries, replaySnapshots: review.replaySnapshots })
  }
}

export function createInactiveServingCandidateSelection(review: InactiveServingCandidateReview) {
  const projection = (kind: MvpProjectionVersion["projectionKind"], subjectId: string) => {
    const matches = review.projections.filter((value) => value.projectionKind === kind && value.subjectId === subjectId)
    if (matches.length !== 1) throw new Error(`MVP8I_INTERNAL_PROJECTION_CONTRACT_INVALID:${kind}:${subjectId}`)
    return matches[0]!
  }
  const coverage = (instrument: string) => {
    const values = review.projections.filter((value) => value.projectionKind === "CoverageDataStatusProjection" && value.subjectId.startsWith(`${instrument}:`))
    if (values.length !== 4) throw new Error(`MVP8I_INTERNAL_COVERAGE_CONTRACT_INVALID:${instrument}`)
    return values
  }
  const bundle = (view: "dashboard" | "scanner" | "trade" | "replay", projections: readonly MvpProjectionVersion[]) => Object.freeze({ status: "AVAILABLE_INTERNAL" as const, view, candidateId: review.candidateId, lifecycle: review.lifecycle, exposure: review.exposure, projections: Object.freeze(projections) })
  return Object.freeze({
    review,
    projectionByVersion: (projectionVersionId: string) => Promise.resolve(review.projections.find((value) => value.projectionVersionId === projectionVersionId) ?? null),
    evidenceSummary: (evidencePacketId: string) => Promise.resolve(review.evidenceSummaries.find((value) => value.evidencePacketId === evidencePacketId) ?? null),
    replaySnapshot: (instrument: string) => Promise.resolve(review.replaySnapshots.find((value) => value.instrument === instrument) ?? null),
    dashboard: () => Promise.resolve(bundle("dashboard", [projection("DashboardMarketStateProjection", "MVP_SIX_INSTRUMENTS"), ...REQUIRED_SYMBOLS.flatMap((instrument) => [projection("InstrumentMarketSummaryProjection", instrument), projection("SourceLineageSummaryProjection", instrument), projection("EventAnnotationProjection", instrument), ...coverage(instrument)])])),
    scanner: () => Promise.resolve(bundle("scanner", [projection("ScannerCandidateProjection", "MVP_SIX_INSTRUMENTS"), ...REQUIRED_SYMBOLS.flatMap((instrument) => [projection("ResearchEvidenceProjection", instrument), ...coverage(instrument)])])),
    tradeDecisionContext: (instrument: string) => Promise.resolve(bundle("trade", [projection("TradeDecisionContextProjection", instrument), projection("InstrumentMarketSummaryProjection", instrument), projection("ResearchEvidenceProjection", instrument), projection("SourceLineageSummaryProjection", instrument), ...coverage(instrument)])),
    replay: (instrument: string) => {
      const sourceProjection = projection("ReplayTimelineProjection", instrument), snapshot = review.replaySnapshots.find((value) => value.instrument === instrument)
      if (!snapshot || snapshot.sourceProjectionVersionId !== sourceProjection.projectionVersionId || snapshot.sourceProjectionChecksum !== sourceProjection.projectionChecksum) throw new Error(`MVP8I_INTERNAL_REPLAY_CONTRACT_INVALID:${instrument}`)
      return Promise.resolve(Object.freeze({ ...bundle("replay", [sourceProjection, projection("ResearchEvidenceProjection", instrument), projection("SourceLineageSummaryProjection", instrument), projection("EventAnnotationProjection", instrument), ...coverage(instrument)]), snapshot }))
    },
  })
}

async function ensureGenesis(sql: postgres.TransactionSql, plan: InactiveServingCandidatePlan): Promise<void> {
  const rows = await sql.unsafe<Array<{ serving_checksum: string; lifecycle: string; exposure: string }>>("SELECT serving_checksum,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1", [plan.genesisCorpusId])
  if (rows[0]) {
    if (rows[0].serving_checksum !== plan.genesisChecksum || rows[0].lifecycle !== "WITHHELD" || rows[0].exposure !== "INTERNAL_ONLY") throw new Error("MVP8I_GENESIS_CONFLICT")
    return
  }
  await sql.unsafe("INSERT INTO serving.serving_corpus (corpus_id,corpus_version,source_corpus_id,source_corpus_checksum,serving_checksum,schema_version,generated_at,governed_through,lifecycle,exposure,projection_count,evidence_summary_count,replay_snapshot_count,demo_profile_count,release_inventory_count,publication_event_count) VALUES($1,'mvp-inactive-serving-stage-genesis/1.0.0',$1,$2,$2,$3,$4,$4,'WITHHELD','INTERNAL_ONLY',0,0,0,0,0,0)", [plan.genesisCorpusId, plan.genesisChecksum, plan.schemaVersion, plan.generatedAt])
}

async function persistInactiveServingPlan(sql: postgres.TransactionSql, plan: InactiveServingCandidatePlan): Promise<void> {
  await ensureGenesis(sql, plan)
  await sql.unsafe("INSERT INTO serving.serving_corpus (corpus_id,corpus_version,source_corpus_id,source_corpus_checksum,serving_checksum,schema_version,generated_at,governed_through,lifecycle,exposure,projection_count,evidence_summary_count,replay_snapshot_count,demo_profile_count,release_inventory_count,publication_event_count) VALUES($1,'mvp-inactive-serving-candidate/1.0.0',$2,$3,$4,$5,$6,$7,'WITHHELD','INTERNAL_ONLY',$8,$9,$10,0,0,0)", [plan.candidateId, plan.verifiedSourceCorpusId, plan.verifiedSourceCorpusChecksum, plan.servingChecksum, plan.schemaVersion, plan.generatedAt, plan.governedThrough, plan.counts.projections, plan.counts.evidenceSummaries, plan.counts.replaySnapshots])
  const corpus = { corpusId: plan.candidateId, sourceCorpusId: plan.verifiedSourceCorpusId, generatedAt: plan.generatedAt }
  for (const value of plan.projections) await insertServingProjectionPayload(sql, corpus, value)
  for (const value of plan.evidenceSummaries) await insertServingEvidencePayload(sql, corpus, value)
  for (const value of plan.replaySnapshots) await insertServingReplayPayload(sql, corpus, value)
  await verifyPayloadReadback(sql, plan)
  for (const member of plan.members) await sql.unsafe("INSERT INTO serving.serving_corpus_member (corpus_id,member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)", [plan.candidateId, member.memberKind, member.memberId, member.memberChecksum, member.canonicalSortKey, member.inheritedSourceCorpusId, member.schemaVersion, JSON.stringify(member.metadata), plan.generatedAt])
  await verifyMemberReadback(sql, plan)
  await sql.unsafe("INSERT INTO serving.serving_candidate_manifest (manifest_id,corpus_id,previous_corpus_id,previous_serving_checksum,manifest_checksum,schema_version,lifecycle,exposure_eligibility,manifest,created_at,common_watermark_id,common_watermark_value,common_watermark_checksum,member_set_checksum) VALUES($1,$2,$3,$4,$5,$6,'CANDIDATE','INELIGIBLE',$7::text::jsonb,$8,$9,$10,$11,$12)", [plan.manifestId, plan.candidateId, plan.genesisCorpusId, plan.genesisChecksum, plan.manifestChecksum, plan.schemaVersion, JSON.stringify(plan.manifest), plan.generatedAt, plan.commonWatermarkId, plan.commonWatermarkValue, plan.commonWatermarkChecksum, plan.memberSetChecksum])
}

async function verifyPayloadReadback(sql: postgres.Sql | postgres.TransactionSql, plan: InactiveServingCandidatePlan): Promise<void> {
  const [projectionRows, evidenceRows, replayRows] = await Promise.all([
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_projection WHERE serving_corpus_id=$1 ORDER BY projection_version_id", [plan.candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_evidence_summary WHERE serving_corpus_id=$1 ORDER BY evidence_summary_id", [plan.candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1 ORDER BY instrument", [plan.candidateId]),
  ])
  const projections = projectionRows.map(mapServingProjectionPayload), evidence = evidenceRows.map(mapServingEvidencePayload), replay = replayRows.map(mapServingReplayPayload)
  if (canonicalChecksum(projections.map((value) => [value.projectionVersionId, value.projectionChecksum])) !== canonicalChecksum(plan.projections.map((value) => [value.projectionVersionId, value.projectionChecksum]))) throw new Error("MVP8I_PROJECTION_READBACK_MISMATCH")
  if (canonicalChecksum(evidence.map((value) => [value.evidenceSummaryId, value.summaryChecksum])) !== canonicalChecksum(plan.evidenceSummaries.map((value) => [value.evidenceSummaryId, value.summaryChecksum]))) throw new Error("MVP8I_EVIDENCE_READBACK_MISMATCH")
  if (canonicalChecksum(replay.map((value) => [value.replaySnapshotId, value.snapshotChecksum, value.modelChecksum])) !== canonicalChecksum(plan.replaySnapshots.map((value) => [value.replaySnapshotId, value.snapshotChecksum, value.modelChecksum]))) throw new Error("MVP8I_REPLAY_READBACK_MISMATCH")
}

async function verifyMemberReadback(sql: postgres.Sql | postgres.TransactionSql, plan: InactiveServingCandidatePlan): Promise<void> {
  const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata FROM serving.serving_corpus_member WHERE corpus_id=$1 ORDER BY canonical_sort_key,member_kind,member_id", [plan.candidateId])
  const members = canonicalizeServingCorpusMembers(rows.map(mapMember))
  if (members.length !== plan.counts.members || canonicalChecksum(members.map(memberIdentity)) !== plan.memberSetChecksum) throw new Error("MVP8I_MEMBER_SET_READBACK_MISMATCH")
}

async function readInactiveServingCandidateReview(sql: postgres.Sql | postgres.TransactionSql, candidateId: string, expected?: InactiveServingCandidatePlan): Promise<InactiveServingCandidateReview> {
  if (!/^mvp8i-candidate:[0-9a-f]{64}$/.test(candidateId)) throw new Error("MVP8I_CANDIDATE_ID_INVALID")
  const [corpusRows, manifestRows] = await Promise.all([
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_corpus WHERE corpus_id=$1", [candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_candidate_manifest WHERE corpus_id=$1", [candidateId]),
  ])
  const corpus = corpusRows[0], row = manifestRows[0]
  if (!corpus || String(corpus.corpus_version) !== "mvp-inactive-serving-candidate/1.0.0" || String(corpus.lifecycle) !== "WITHHELD" || String(corpus.exposure) !== "INTERNAL_ONLY" || String(corpus.schema_version) !== MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION) throw new Error("MVP8I_CANDIDATE_CORPUS_INVALID")
  if (!row || String(row.lifecycle) !== "CANDIDATE" || String(row.exposure_eligibility) !== "INELIGIBLE") throw new Error("MVP8I_CANDIDATE_MANIFEST_INVALID")
  const manifest = requireRecord(row.manifest, "MVP8I_CANDIDATE_MANIFEST_MALFORMED")
  const commonWatermarkId = String(row.common_watermark_id ?? ""), commonWatermarkValue = canonicalIso(row.common_watermark_value, "MVP8I_STORED_WATERMARK_VALUE_INVALID"), commonWatermarkChecksum = String(row.common_watermark_checksum ?? ""), memberSetChecksum = String(row.member_set_checksum ?? "")
  if (!commonWatermarkId || !isChecksum(commonWatermarkChecksum) || !isChecksum(memberSetChecksum) || manifest.commonWatermarkId !== commonWatermarkId || manifest.commonWatermarkValue !== commonWatermarkValue || manifest.commonWatermarkChecksum !== commonWatermarkChecksum || manifest.memberSetChecksum !== memberSetChecksum) throw new Error("MVP8I_MANIFEST_BINDING_MISMATCH")
  const manifestChecksum = String(row.manifest_checksum ?? "")
  if (!isChecksum(manifestChecksum) || canonicalChecksum(manifest) !== manifestChecksum) throw new Error("MVP8I_MANIFEST_CHECKSUM_MISMATCH")
  if (String(manifest.candidateId) !== candidateId || String(manifest.servingChecksum) !== String(corpus.serving_checksum) || String(manifest.lifecycle) !== "WITHHELD" || String(manifest.exposure) !== "INTERNAL_ONLY" || String(manifest.exposureEligibility) !== "INELIGIBLE") throw new Error("MVP8I_MANIFEST_CONTRACT_MISMATCH")
  if (!/^mvp8i-verified-source:[0-9a-f]{64}$/.test(String(manifest.verifiedSourceCorpusId)) || !isChecksum(manifest.verifiedSourceCorpusChecksum) || String(corpus.source_corpus_id) !== manifest.verifiedSourceCorpusId || String(corpus.source_corpus_checksum) !== manifest.verifiedSourceCorpusChecksum || !String(manifest.replaySourceCorpusId ?? "") || !isChecksum(manifest.replaySourceCorpusChecksum)) throw new Error("MVP8I_VERIFIED_SOURCE_BINDING_INVALID")
  if (Number(corpus.projection_count) !== 62 || Number(corpus.evidence_summary_count) !== 6 || Number(corpus.replay_snapshot_count) !== 6 || Number(corpus.demo_profile_count) !== 0 || Number(corpus.release_inventory_count) !== 0 || Number(corpus.publication_event_count) !== 0) throw new Error("MVP8I_STORED_COUNTS_INVALID")

  const planStub = expected ?? ({ candidateId, projections: [], evidenceSummaries: [], replaySnapshots: [] } as unknown as InactiveServingCandidatePlan)
  const [projectionRows, evidenceRows, replayRows, memberRows, exposures] = await Promise.all([
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_projection WHERE serving_corpus_id=$1 ORDER BY projection_version_id", [candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_evidence_summary WHERE serving_corpus_id=$1 ORDER BY evidence_summary_id", [candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1 ORDER BY instrument", [candidateId]),
    sql.unsafe<Record<string, unknown>[]>("SELECT member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata FROM serving.serving_corpus_member WHERE corpus_id=$1 ORDER BY canonical_sort_key,member_kind,member_id", [candidateId]),
    sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure WHERE corpus_id=$1", [candidateId]),
  ])
  const projections = Object.freeze(projectionRows.map(mapServingProjectionPayload)), evidenceSummaries = Object.freeze(evidenceRows.map(mapServingEvidencePayload)), replaySnapshots = Object.freeze(replayRows.map(mapServingReplayPayload)), members = canonicalizeServingCorpusMembers(memberRows.map(mapMember))
  if (projections.length !== 62 || evidenceSummaries.length !== 6 || replaySnapshots.length !== 6 || members.length !== 74) throw new Error("MVP8I_READBACK_COUNTS_INVALID")
  if (canonicalChecksum(members.map(memberIdentity)) !== memberSetChecksum) throw new Error("MVP8I_MEMBER_SET_CHECKSUM_MISMATCH")
  if (members.some((member) => member.inheritedSourceCorpusId !== manifest.verifiedSourceCorpusId || /mvp8e-candidate:/.test(member.inheritedSourceCorpusId ?? "") || /mvp8e-candidate:/.test(JSON.stringify(member.metadata)))) throw new Error("MVP8I_MEMBER_SOURCE_LINEAGE_INVALID")
  if (/mvp8e-candidate:/.test(JSON.stringify(manifest)) || /mvp8e-candidate:/.test(String(corpus.source_corpus_id))) throw new Error("MVP8I_FAILED_CANDIDATE_IDENTITY_CONTAMINATION")
  const verifiedSource = computeVerifiedInactiveServingSourceCorpus({ projections, evidenceSummaries, replaySourceCorpusId: String(manifest.replaySourceCorpusId), replaySourceCorpusChecksum: String(manifest.replaySourceCorpusChecksum), replaySnapshots, bindings: { commonWatermarkId, commonWatermarkValue, commonWatermarkChecksum } })
  if (verifiedSource.corpusId !== manifest.verifiedSourceCorpusId || verifiedSource.checksum !== manifest.verifiedSourceCorpusChecksum) throw new Error("MVP8I_VERIFIED_SOURCE_CHECKSUM_MISMATCH")
  const recomputedId = computeInactiveServingCandidateId({ schemaVersion: String(manifest.schemaVersion), verifiedSourceCorpusId: verifiedSource.corpusId, verifiedSourceCorpusChecksum: verifiedSource.checksum, bindings: { commonWatermarkId, commonWatermarkValue, commonWatermarkChecksum }, counts: MVP_INACTIVE_SERVING_STAGE_COUNTS, members })
  if (recomputedId !== candidateId || String(corpus.serving_checksum) !== candidateId.slice("mvp8i-candidate:".length)) throw new Error("MVP8I_CANDIDATE_IDENTITY_MISMATCH")
  if (exposures[0]?.count !== 0) throw new Error("MVP8I_ZERO_EXPOSURE_VIOLATED")
  if (expected) {
    await verifyPayloadReadback(sql, planStub)
    await verifyMemberReadback(sql, planStub)
    if (expected.manifestChecksum !== manifestChecksum) throw new Error("MVP8I_EXPECTED_MANIFEST_MISMATCH")
  }
  return Object.freeze({ candidateId, servingChecksum: String(corpus.serving_checksum), lifecycle: "WITHHELD", exposure: "INTERNAL_ONLY", exposureCount: 0, commonWatermarkId, commonWatermarkValue, commonWatermarkChecksum, memberSetChecksum, manifestChecksum, counts: MVP_INACTIVE_SERVING_STAGE_COUNTS, projections, evidenceSummaries, replaySnapshots })
}

async function exposureCount(sql: postgres.Sql | postgres.TransactionSql): Promise<number> { const rows = await sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure"); return rows[0]?.count ?? -1 }
async function candidateExposureCount(sql: postgres.Sql | postgres.TransactionSql, candidateId: string): Promise<number> { const rows = await sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure WHERE corpus_id=$1", [candidateId]); return rows[0]?.count ?? -1 }
async function exposureFingerprint(sql: postgres.Sql | postgres.TransactionSql): Promise<string> { const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT exposure_id,corpus_id,exposure_state,effective_from,checksum,publication_note,created_at FROM serving.serving_exposure ORDER BY exposure_id"); return canonicalChecksum(rows) }
async function activeBaseline(sql: postgres.Sql | postgres.TransactionSql): Promise<{ readonly exposureId: string; readonly corpusId: string }> { const rows = await sql.unsafe<Array<{ exposure_id: string; corpus_id: string }>>("SELECT exposure_id,corpus_id FROM serving.serving_exposure WHERE exposure_state='CONSUMER_VISIBLE' ORDER BY effective_from DESC,exposure_id DESC LIMIT 1"); if (!rows[0]) throw new Error("MVP8P_ACTIVE_BASELINE_MISSING"); return Object.freeze({ exposureId: rows[0].exposure_id, corpusId: rows[0].corpus_id }) }
export function validateSeparateTargetPublicationFingerprint(targetKind: MvpServingPostgresClient["targetKind"], targetId: string, expectedTargetId: string): void {
  if (targetId !== expectedTargetId) throw new Error("MVP8L_TARGET_FINGERPRINT_MISMATCH")
  if (targetKind === "MANAGED_POSTGRES" && !/^neon:[a-z0-9-]+\/[a-z0-9-]+\/[a-zA-Z0-9_-]+$/.test(targetId)) throw new Error("MVP8L_NEON_TARGET_FINGERPRINT_INVALID")
  if (targetKind === "LOCAL_DISPOSABLE_CERTIFICATION" && !/^local-postgres:(?:127\.0\.0\.1|localhost):[0-9]+\/quantterminal_mvp8(?:[lp]|s)_canary_[a-z0-9]+$/.test(targetId)) throw new Error("MVP_DISPOSABLE_TARGET_FINGERPRINT_INVALID")
}

function validateSeparateTargetPublicationClients(writer: MvpServingPostgresClient, reader: MvpServingPostgresClient, options: SeparateTargetInactivePublicationOptions): void {
  if (writer.roleIntent !== "PUBLISHER" || reader.roleIntent !== "READER" || writer.targetKind !== reader.targetKind || !["LOCAL_DISPOSABLE_CERTIFICATION", "MANAGED_POSTGRES"].includes(writer.targetKind)) throw new Error("MVP8L_SEPARATE_TARGET_CLIENTS_REQUIRED")
  validateSeparateTargetPublicationFingerprint(writer.targetKind, options.targetId, options.expectedTargetId)
  const writerUrl = new URL(writer.connectionString), readerUrl = new URL(reader.connectionString)
  if (writerUrl.hostname !== readerUrl.hostname || writerUrl.port !== readerUrl.port || writerUrl.pathname !== readerUrl.pathname || writerUrl.username === readerUrl.username || writer.connectionString === reader.connectionString) throw new Error("MVP8L_TARGET_ROLE_BINDING_INVALID")
}
function memberIdentity(member: ServingCorpusMember) { return { kind: member.memberKind, id: member.memberId, checksum: member.memberChecksum, sortKey: member.canonicalSortKey, inheritedSourceCorpusId: member.inheritedSourceCorpusId, schemaVersion: member.schemaVersion, metadata: member.metadata } }
function mapMember(row: Record<string, unknown>): ServingCorpusMember { return Object.freeze({ memberKind: String(row.member_kind) as ServingCorpusMember["memberKind"], memberId: String(row.member_id), memberChecksum: String(row.member_checksum), canonicalSortKey: String(row.canonical_sort_key), inheritedSourceCorpusId: row.inherited_source_corpus_id ? String(row.inherited_source_corpus_id) : null, schemaVersion: String(row.schema_version), metadata: Object.freeze(requireRecord(row.metadata, "MVP8I_MEMBER_METADATA_MALFORMED")) }) }
function isChecksum(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) }
function canonicalIso(value: unknown, code: string): string { try { const iso = new Date(String(value)).toISOString(); if (iso !== String(value) && !(value instanceof Date)) throw new Error(code); return iso } catch { throw new Error(code) } }
function requireUnique(values: readonly string[], code: string): void { if (new Set(values).size !== values.length || values.some((value) => !value)) throw new Error(code) }
function requireInternalFacadeProjectionShape(projections: readonly MvpProjectionVersion[]): void {
  const count = (kind: MvpProjectionVersion["projectionKind"], subjectId: string) => projections.filter((value) => value.projectionKind === kind && value.subjectId === subjectId).length
  if (count("DashboardMarketStateProjection", "MVP_SIX_INSTRUMENTS") !== 1 || count("ScannerCandidateProjection", "MVP_SIX_INSTRUMENTS") !== 1) throw new Error("MVP8I_AGGREGATE_PROJECTION_CONTRACT_INVALID")
  for (const instrument of REQUIRED_SYMBOLS) {
    for (const kind of ["InstrumentMarketSummaryProjection", "ResearchEvidenceProjection", "ReplayTimelineProjection", "TradeDecisionContextProjection", "SourceLineageSummaryProjection", "EventAnnotationProjection"] as const) if (count(kind, instrument) !== 1) throw new Error(`MVP8I_INSTRUMENT_PROJECTION_CONTRACT_INVALID:${kind}:${instrument}`)
    if (projections.filter((value) => value.projectionKind === "CoverageDataStatusProjection" && value.subjectId.startsWith(`${instrument}:`)).length !== 4) throw new Error(`MVP8I_COVERAGE_PROJECTION_CONTRACT_INVALID:${instrument}`)
  }
}
function requireInputRecord(value: unknown): asserts value is InactiveServingCandidateInput { const record = requireRecord(value, "MVP8I_INPUT_MALFORMED"); if (!Array.isArray(record.projections) || !Array.isArray(record.evidenceSummaries) || !Array.isArray(record.replaySnapshots)) throw new Error("MVP8I_INPUT_MALFORMED") }
function requireRecord(value: unknown, code: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code); return value as Record<string, unknown> }
