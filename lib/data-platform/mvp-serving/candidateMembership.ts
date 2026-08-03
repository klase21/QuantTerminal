import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type postgres from "postgres"
import { MVP_SERVING_SCHEMA_VERSION } from "./contracts"
import type { MvpServingPostgresClient } from "./client"

export type ServingCorpusMemberKind = "PROJECTION" | "EVIDENCE_SUMMARY" | "REPLAY_SNAPSHOT" | "DEMO_PROFILE" | "SUPPLEMENTAL_CONTEXT" | "RELEASE_INVENTORY" | "RELEASE_MANIFEST"
export interface ServingCorpusMember {
  readonly memberKind: ServingCorpusMemberKind
  readonly memberId: string
  readonly memberChecksum: string
  readonly canonicalSortKey: string
  readonly inheritedSourceCorpusId: string | null
  readonly schemaVersion: string
  readonly metadata: Readonly<Record<string, unknown>>
}
export interface CandidateCorpusDescriptor {
  readonly corpusId: string
  readonly sourceCorpusId: string
  readonly sourceCorpusChecksum: string
  readonly governedThrough: string
  readonly schemaVersion: string
  readonly generatedAt: string
  readonly members: readonly ServingCorpusMember[]
  readonly limitations: readonly string[]
}
export interface CandidateMembershipComparison {
  readonly status: "PASS" | "BLOCKED"
  readonly added: Readonly<Record<ServingCorpusMemberKind, readonly string[]>>
  readonly retained: Readonly<Record<ServingCorpusMemberKind, readonly string[]>>
  readonly removed: Readonly<Record<ServingCorpusMemberKind, readonly string[]>>
  readonly superseded: Readonly<Record<ServingCorpusMemberKind, readonly string[]>>
  readonly missingRequiredMembers: readonly string[]
  readonly unexpectedDeletions: readonly string[]
  readonly immutableMismatches: readonly string[]
  readonly checksumChanged: boolean
  readonly governedThroughChanged: boolean
  readonly servingSizeEstimateBytes: number
  readonly uiContractImpact: "NONE" | "ADDITIVE" | "BLOCKED"
  readonly checksum: string
}
export interface CertifiedInactiveCandidateExpectation {
  readonly candidateId: string
  readonly candidateChecksum: string
  readonly governedThrough: string
  readonly sourceLineageIdentity?: string
}
export interface CertifiedInactiveCandidateBaseline {
  readonly corpusId: string
  readonly servingChecksum: string
  readonly governedThrough: string
  readonly members: readonly ServingCorpusMember[]
  readonly manifestId: string
  readonly manifestChecksum: string
  readonly memberSetChecksum: string
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
}
export interface InactiveCandidateWatermarkBinding {
  readonly commonWatermarkId: string
  readonly commonWatermarkValue: string
  readonly commonWatermarkChecksum: string
}

const kinds: readonly ServingCorpusMemberKind[] = Object.freeze(["PROJECTION", "EVIDENCE_SUMMARY", "REPLAY_SNAPSHOT", "DEMO_PROFILE", "SUPPLEMENTAL_CONTEXT", "RELEASE_INVENTORY", "RELEASE_MANIFEST"])
const emptyByKind = (): Record<ServingCorpusMemberKind, string[]> => Object.fromEntries(kinds.map((kind) => [kind, []])) as Record<ServingCorpusMemberKind, string[]>
const key = (member: ServingCorpusMember) => `${member.memberKind}:${member.memberId}`

export function canonicalizeServingCorpusMembers(members: readonly ServingCorpusMember[]): readonly ServingCorpusMember[] {
  const logical = new Set<string>(), sortKeys = new Set<string>()
  for (const member of members) {
    if (!member.memberId || !member.canonicalSortKey || !member.schemaVersion || !/^[0-9a-f]{64}$/.test(member.memberChecksum)) throw new Error("SERVING_CANDIDATE_MEMBER_INVALID")
    if (!kinds.includes(member.memberKind)) throw new Error("SERVING_CANDIDATE_MEMBER_KIND_INVALID")
    if (logical.has(key(member)) || sortKeys.has(member.canonicalSortKey)) throw new Error("SERVING_CANDIDATE_DUPLICATE_LOGICAL_MEMBER")
    logical.add(key(member)); sortKeys.add(member.canonicalSortKey)
  }
  return Object.freeze([...members].sort((left, right) => left.canonicalSortKey.localeCompare(right.canonicalSortKey) || key(left).localeCompare(key(right))).map((member) => Object.freeze({ ...member, metadata: Object.freeze({ ...member.metadata }) })))
}

export function computeCandidateServingChecksum(input: { readonly governedThrough: string; readonly schemaVersion: string; readonly members: readonly ServingCorpusMember[] }): string {
  const governed = new Date(input.governedThrough).toISOString()
  return canonicalChecksum({ schemaVersion: input.schemaVersion, governedThrough: governed, members: canonicalizeServingCorpusMembers(input.members).map((member) => ({ kind: member.memberKind, id: member.memberId, checksum: member.memberChecksum, sortKey: member.canonicalSortKey, inheritedSourceCorpusId: member.inheritedSourceCorpusId, schemaVersion: member.schemaVersion, metadata: member.metadata })) })
}

export function compareServingCorpusMembership(input: { readonly activeMembers: readonly ServingCorpusMember[]; readonly candidateMembers: readonly ServingCorpusMember[]; readonly activeChecksum: string; readonly candidateChecksum: string; readonly activeGovernedThrough: string; readonly candidateGovernedThrough: string; readonly requiredActiveMemberKeys?: readonly string[] }): CandidateMembershipComparison {
  const active = new Map(canonicalizeServingCorpusMembers(input.activeMembers).map((member) => [key(member), member])), candidate = new Map(canonicalizeServingCorpusMembers(input.candidateMembers).map((member) => [key(member), member]))
  const added = emptyByKind(), retained = emptyByKind(), removed = emptyByKind(), superseded = emptyByKind(), immutableMismatches: string[] = []
  for (const [identity, member] of candidate) {
    const previous = active.get(identity)
    if (!previous) { added[member.memberKind].push(member.memberId); if (typeof member.metadata.supersedesMemberId === "string") superseded[member.memberKind].push(member.memberId) }
    else if (previous.memberChecksum === member.memberChecksum) retained[member.memberKind].push(member.memberId)
    else immutableMismatches.push(identity)
  }
  for (const [identity, member] of active) if (!candidate.has(identity)) removed[member.memberKind].push(member.memberId)
  const required = input.requiredActiveMemberKeys ?? [...active.keys()]
  const missingRequiredMembers = required.filter((identity) => !candidate.has(identity)).sort()
  const unexpectedDeletions = kinds.flatMap((kind) => removed[kind].map((id) => `${kind}:${id}`)).sort()
  const servingSizeEstimateBytes = Buffer.byteLength(JSON.stringify(canonicalizeServingCorpusMembers(input.candidateMembers)), "utf8")
  const blocked = unexpectedDeletions.length > 0 || missingRequiredMembers.length > 0 || immutableMismatches.length > 0
  const base = { status: blocked ? "BLOCKED" as const : "PASS" as const, added, retained, removed, superseded, missingRequiredMembers, unexpectedDeletions, immutableMismatches: Object.freeze(immutableMismatches.sort()), checksumChanged: input.activeChecksum !== input.candidateChecksum, governedThroughChanged: input.activeGovernedThrough !== input.candidateGovernedThrough, servingSizeEstimateBytes, uiContractImpact: blocked ? "BLOCKED" as const : kinds.some((kind) => added[kind].length || superseded[kind].length) ? "ADDITIVE" as const : "NONE" as const }
  return Object.freeze({ ...base, checksum: canonicalChecksum(base) })
}

export class LocalInactiveCandidateAssemblyService {
  constructor(private readonly client: MvpServingPostgresClient) {
    if (client.roleIntent !== "PUBLISHER" || client.targetKind !== "LOCAL_ISOLATED") throw new Error("LOCAL_SERVING_PUBLISHER_REQUIRED")
  }

  async activeBaseline(): Promise<{ readonly corpusId: string; readonly servingChecksum: string; readonly governedThrough: string; readonly members: readonly ServingCorpusMember[] }> {
    const corpus = await this.client.sql.unsafe<Array<{ corpus_id: string; serving_checksum: string; governed_through: string }>>("SELECT c.corpus_id,c.serving_checksum,c.governed_through::text FROM serving.serving_exposure e JOIN serving.serving_corpus c ON c.corpus_id=e.corpus_id WHERE e.exposure_state='CONSUMER_VISIBLE' ORDER BY e.effective_from DESC,e.exposure_id DESC LIMIT 1")
    if (!corpus[0]) throw new Error("ACTIVE_SERVING_CORPUS_MISSING")
    return Object.freeze({ corpusId: corpus[0].corpus_id, servingChecksum: corpus[0].serving_checksum, governedThrough: new Date(corpus[0].governed_through).toISOString(), members: await readPhysicalMembers(this.client.sql, corpus[0].corpus_id) })
  }

  async certifiedInactiveBaseline(expected: CertifiedInactiveCandidateExpectation): Promise<CertifiedInactiveCandidateBaseline> {
    return readCertifiedInactiveBaseline(this.client.sql, expected)
  }

  async assembleGenesis(input: { readonly candidate: CandidateCorpusDescriptor }): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly servingChecksum: string; readonly manifestChecksum: string; readonly exposureUnchanged: true }> {
    const members = canonicalizeServingCorpusMembers(input.candidate.members)
    const servingChecksum = computeCandidateServingChecksum({ governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion, members })
    const genesisChecksum = canonicalChecksum({ kind: "MVP8B_FRESH_SERVING_GENESIS", governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion })
    const genesisId = `mvp-serving-genesis:${genesisChecksum}`
    return this.client.transaction(async (sql) => {
      if (await activeExposure(sql)) throw new Error("FRESH_SERVING_EXPOSURE_MUST_BE_EMPTY")
      const existing = await sql.unsafe<Array<{ serving_checksum: string; lifecycle: string; exposure: string }>>("SELECT serving_checksum,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1", [input.candidate.corpusId])
      if (existing[0]) {
        if (existing[0].serving_checksum !== servingChecksum || existing[0].lifecycle !== "WITHHELD" || existing[0].exposure !== "INTERNAL_ONLY") throw new Error("SERVING_CANDIDATE_IMMUTABLE_CONFLICT")
        const stored = await readStoredMembers(sql, input.candidate.corpusId)
        if (canonicalChecksum(stored) !== canonicalChecksum(members)) throw new Error("SERVING_CANDIDATE_MEMBERSHIP_CONFLICT")
        return Object.freeze({ status: "DUPLICATE" as const, servingChecksum, manifestChecksum: await storedManifestChecksum(sql, input.candidate.corpusId), exposureUnchanged: true as const })
      }
      const generatedAt = input.candidate.generatedAt
      await sql.unsafe("INSERT INTO serving.serving_corpus VALUES($1,'mvp-serving-genesis/1.0.0',$1,$2,$2,$3,$4,$5,'WITHHELD','INTERNAL_ONLY',0,0,0,0,0,0)", [genesisId, genesisChecksum, input.candidate.schemaVersion, generatedAt, input.candidate.governedThrough])
      const count = (kind: ServingCorpusMemberKind) => members.filter((member) => member.memberKind === kind).length
      await sql.unsafe("INSERT INTO serving.serving_corpus VALUES($1,'mvp-serving-candidate/1.0.0',$2,$3,$4,$5,$6,$7,'WITHHELD','INTERNAL_ONLY',$8,$9,$10,$11,$12,0)", [input.candidate.corpusId, genesisId, genesisChecksum, servingChecksum, input.candidate.schemaVersion, generatedAt, input.candidate.governedThrough, count("PROJECTION") + count("SUPPLEMENTAL_CONTEXT"), count("EVIDENCE_SUMMARY"), count("REPLAY_SNAPSHOT"), count("DEMO_PROFILE"), count("RELEASE_INVENTORY")])
      for (const member of members) await sql.unsafe("INSERT INTO serving.serving_corpus_member VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)", [input.candidate.corpusId, member.memberKind, member.memberId, member.memberChecksum, member.canonicalSortKey, member.inheritedSourceCorpusId, member.schemaVersion, JSON.stringify(member.metadata), generatedAt])
      const manifest = { corpusId: input.candidate.corpusId, servingChecksum, previousCorpusId: genesisId, previousServingChecksum: genesisChecksum, governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion, memberCount: members.length, memberDigest: canonicalChecksum(members), limitations: input.candidate.limitations }
      const manifestChecksum = canonicalChecksum(manifest), manifestId = `mvp-candidate-manifest:${manifestChecksum}`
      await sql.unsafe("INSERT INTO serving.serving_candidate_manifest (manifest_id,corpus_id,previous_corpus_id,previous_serving_checksum,manifest_checksum,schema_version,lifecycle,exposure_eligibility,manifest,created_at) VALUES($1,$2,$3,$4,$5,$6,'CANDIDATE','ELIGIBLE',$7::text::jsonb,$8)", [manifestId, input.candidate.corpusId, genesisId, genesisChecksum, manifestChecksum, input.candidate.schemaVersion, JSON.stringify(manifest), generatedAt])
      if (await activeExposure(sql)) throw new Error("CANDIDATE_EXPOSURE_CHANGED")
      return Object.freeze({ status: "CREATED" as const, servingChecksum, manifestChecksum, exposureUnchanged: true as const })
    })
  }

  async assemble(input: { readonly candidate: CandidateCorpusDescriptor; readonly expectedActiveCorpusId: string; readonly expectedActiveChecksum: string; readonly requiredActiveMemberKeys?: readonly string[]; readonly injectFailureAfter?: "HEADER" | "MEMBERS" | "MANIFEST" }): Promise<{ readonly status: "CREATED" | "DUPLICATE"; readonly servingChecksum: string; readonly manifestChecksum: string; readonly comparison: CandidateMembershipComparison; readonly exposureUnchanged: true }> {
    const members = canonicalizeServingCorpusMembers(input.candidate.members)
    const servingChecksum = computeCandidateServingChecksum({ governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion, members })
    return this.client.transaction(async (sql) => {
      const exposureBefore = await activeExposure(sql)
      if (!exposureBefore || exposureBefore.corpusId !== input.expectedActiveCorpusId || exposureBefore.servingChecksum !== input.expectedActiveChecksum) throw new Error("ACTIVE_SERVING_BASELINE_MISMATCH")
      const activeMembers = await readPhysicalMembers(sql, exposureBefore.corpusId)
      const comparison = compareServingCorpusMembership({ activeMembers, candidateMembers: members, activeChecksum: exposureBefore.servingChecksum, candidateChecksum: servingChecksum, activeGovernedThrough: exposureBefore.governedThrough, candidateGovernedThrough: input.candidate.governedThrough, requiredActiveMemberKeys: input.requiredActiveMemberKeys })
      if (comparison.status === "BLOCKED") throw new Error("SERVING_CANDIDATE_UNEXPECTED_DELETION")
      const existing = await sql.unsafe<Array<{ serving_checksum: string; lifecycle: string; exposure: string }>>("SELECT serving_checksum,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1", [input.candidate.corpusId])
      if (existing[0]) {
        if (existing[0].serving_checksum !== servingChecksum || existing[0].lifecycle !== "WITHHELD" || existing[0].exposure !== "INTERNAL_ONLY") throw new Error("SERVING_CANDIDATE_IMMUTABLE_CONFLICT")
        const stored = await readStoredMembers(sql, input.candidate.corpusId)
        if (canonicalChecksum(stored) !== canonicalChecksum(members)) throw new Error("SERVING_CANDIDATE_MEMBERSHIP_CONFLICT")
        return Object.freeze({ status: "DUPLICATE" as const, servingChecksum, manifestChecksum: await storedManifestChecksum(sql, input.candidate.corpusId), comparison, exposureUnchanged: true as const })
      }
      const count = (kind: ServingCorpusMemberKind) => members.filter((member) => member.memberKind === kind).length
      await sql.unsafe("INSERT INTO serving.serving_corpus VALUES($1,'mvp-serving-candidate/1.0.0',$2,$3,$4,$5,$6,$7,'WITHHELD','INTERNAL_ONLY',$8,$9,$10,$11,$12,0)", [input.candidate.corpusId,input.candidate.sourceCorpusId,input.candidate.sourceCorpusChecksum,servingChecksum,input.candidate.schemaVersion,input.candidate.generatedAt,input.candidate.governedThrough,count("PROJECTION")+count("SUPPLEMENTAL_CONTEXT"),count("EVIDENCE_SUMMARY"),count("REPLAY_SNAPSHOT"),count("DEMO_PROFILE"),count("RELEASE_INVENTORY")])
      if (input.injectFailureAfter === "HEADER") throw new Error("INJECTED_CANDIDATE_FAILURE_HEADER")
      for (const member of members) await sql.unsafe("INSERT INTO serving.serving_corpus_member VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)", [input.candidate.corpusId,member.memberKind,member.memberId,member.memberChecksum,member.canonicalSortKey,member.inheritedSourceCorpusId,member.schemaVersion,JSON.stringify(member.metadata),input.candidate.generatedAt])
      if (input.injectFailureAfter === "MEMBERS") throw new Error("INJECTED_CANDIDATE_FAILURE_MEMBERS")
      const manifest = { corpusId: input.candidate.corpusId, servingChecksum, previousCorpusId: exposureBefore.corpusId, previousServingChecksum: exposureBefore.servingChecksum, governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion, memberCount: members.length, memberDigest: canonicalChecksum(members), limitations: input.candidate.limitations }
      const manifestChecksum = canonicalChecksum(manifest), manifestId = `mvp-candidate-manifest:${manifestChecksum}`
      await sql.unsafe("INSERT INTO serving.serving_candidate_manifest (manifest_id,corpus_id,previous_corpus_id,previous_serving_checksum,manifest_checksum,schema_version,lifecycle,exposure_eligibility,manifest,created_at) VALUES($1,$2,$3,$4,$5,$6,'CANDIDATE','ELIGIBLE',$7::text::jsonb,$8)", [manifestId,input.candidate.corpusId,exposureBefore.corpusId,exposureBefore.servingChecksum,manifestChecksum,input.candidate.schemaVersion,JSON.stringify(manifest),input.candidate.generatedAt])
      if (input.injectFailureAfter === "MANIFEST") throw new Error("INJECTED_CANDIDATE_FAILURE_MANIFEST")
      const exposureAfter = await activeExposure(sql)
      if (!exposureAfter || canonicalChecksum(exposureAfter) !== canonicalChecksum(exposureBefore)) throw new Error("CANDIDATE_EXPOSURE_CHANGED")
      return Object.freeze({ status: "CREATED" as const, servingChecksum, manifestChecksum, comparison, exposureUnchanged: true as const })
    })
  }

  async assembleFromCertifiedInactiveBaseline(input: {
    readonly candidate: CandidateCorpusDescriptor
    readonly expectedBaseline: CertifiedInactiveCandidateExpectation
    readonly binding: InactiveCandidateWatermarkBinding
    readonly requiredBaselineMemberKeys?: readonly string[]
    readonly injectFailureAfter?: "HEADER" | "MEMBERS" | "MANIFEST"
  }): Promise<{
    readonly status: "CREATED" | "DUPLICATE"
    readonly servingChecksum: string
    readonly manifestId: string
    readonly manifestChecksum: string
    readonly memberSetChecksum: string
    readonly commonWatermarkId: string
    readonly commonWatermarkValue: string
    readonly commonWatermarkChecksum: string
    readonly comparison: CandidateMembershipComparison
    readonly exposureUnchanged: true
  }> {
    const members = canonicalizeServingCorpusMembers(input.candidate.members)
    const servingChecksum = computeCandidateServingChecksum({ governedThrough: input.candidate.governedThrough, schemaVersion: input.candidate.schemaVersion, members })
    const commonWatermarkValue = exactIso(input.binding.commonWatermarkValue, "SERVING_CANDIDATE_COMMON_WATERMARK_INVALID")
    if (
      !input.binding.commonWatermarkId
      || !isChecksum(input.binding.commonWatermarkChecksum)
      || commonWatermarkValue !== exactIso(input.candidate.governedThrough, "SERVING_CANDIDATE_GOVERNED_THROUGH_INVALID")
    ) throw new Error("SERVING_CANDIDATE_COMMON_WATERMARK_BINDING_INVALID")
    return this.client.transaction(async (sql) => {
      const exposureBefore = await exposureFingerprint(sql)
      const baseline = await readCertifiedInactiveBaseline(sql, input.expectedBaseline)
      if (
        input.candidate.sourceCorpusId !== baseline.corpusId
        || input.candidate.sourceCorpusChecksum !== baseline.servingChecksum
        || Date.parse(input.candidate.governedThrough) <= Date.parse(baseline.governedThrough)
      ) throw new Error("INACTIVE_SERVING_BASELINE_MISMATCH")
      const comparison = compareServingCorpusMembership({
        activeMembers: baseline.members,
        candidateMembers: members,
        activeChecksum: baseline.servingChecksum,
        candidateChecksum: servingChecksum,
        activeGovernedThrough: baseline.governedThrough,
        candidateGovernedThrough: input.candidate.governedThrough,
        requiredActiveMemberKeys: input.requiredBaselineMemberKeys,
      })
      if (comparison.status === "BLOCKED") throw new Error("SERVING_CANDIDATE_UNEXPECTED_DELETION")
      const memberSetChecksum = canonicalChecksum(members.map(memberIdentity))
      const manifest = Object.freeze({
        corpusId: input.candidate.corpusId,
        servingChecksum,
        previousCorpusId: baseline.corpusId,
        previousServingChecksum: baseline.servingChecksum,
        governedThrough: commonWatermarkValue,
        schemaVersion: input.candidate.schemaVersion,
        memberCount: members.length,
        memberSetChecksum,
        commonWatermarkId: input.binding.commonWatermarkId,
        commonWatermarkValue,
        commonWatermarkChecksum: input.binding.commonWatermarkChecksum,
        lifecycle: "WITHHELD",
        exposure: "INTERNAL_ONLY",
        exposureEligibility: "INELIGIBLE",
        limitations: input.candidate.limitations,
      })
      const manifestChecksum = canonicalChecksum(manifest)
      const manifestId = `mvp-candidate-manifest:${manifestChecksum}`
      const existing = await sql.unsafe<Array<{ serving_checksum: string; lifecycle: string; exposure: string }>>("SELECT serving_checksum,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1", [input.candidate.corpusId])
      if (existing[0]) {
        if (existing[0].serving_checksum !== servingChecksum || existing[0].lifecycle !== "WITHHELD" || existing[0].exposure !== "INTERNAL_ONLY") throw new Error("SERVING_CANDIDATE_IMMUTABLE_CONFLICT")
        const stored = await readCertifiedInactiveBaseline(sql, { candidateId: input.candidate.corpusId, candidateChecksum: servingChecksum, governedThrough: commonWatermarkValue, sourceLineageIdentity: manifestId })
        if (
          stored.manifestChecksum !== manifestChecksum
          || stored.memberSetChecksum !== memberSetChecksum
          || stored.commonWatermarkId !== input.binding.commonWatermarkId
          || stored.commonWatermarkChecksum !== input.binding.commonWatermarkChecksum
        ) throw new Error("SERVING_CANDIDATE_MANIFEST_BINDING_CONFLICT")
        if (await exposureFingerprint(sql) !== exposureBefore) throw new Error("CANDIDATE_EXPOSURE_CHANGED")
        return Object.freeze({ status: "DUPLICATE" as const, servingChecksum, manifestId, manifestChecksum, memberSetChecksum, ...input.binding, commonWatermarkValue, comparison, exposureUnchanged: true as const })
      }
      const count = (kind: ServingCorpusMemberKind) => members.filter((member) => member.memberKind === kind).length
      await sql.unsafe("INSERT INTO serving.serving_corpus VALUES($1,'mvp-serving-candidate/1.0.0',$2,$3,$4,$5,$6,$7,'WITHHELD','INTERNAL_ONLY',$8,$9,$10,$11,$12,0)", [input.candidate.corpusId,baseline.corpusId,baseline.servingChecksum,servingChecksum,input.candidate.schemaVersion,input.candidate.generatedAt,commonWatermarkValue,count("PROJECTION")+count("SUPPLEMENTAL_CONTEXT"),count("EVIDENCE_SUMMARY"),count("REPLAY_SNAPSHOT"),count("DEMO_PROFILE"),count("RELEASE_INVENTORY")])
      if (input.injectFailureAfter === "HEADER") throw new Error("INJECTED_CANDIDATE_FAILURE_HEADER")
      for (const member of members) await sql.unsafe("INSERT INTO serving.serving_corpus_member VALUES($1,$2,$3,$4,$5,$6,$7,$8::text::jsonb,$9)", [input.candidate.corpusId,member.memberKind,member.memberId,member.memberChecksum,member.canonicalSortKey,member.inheritedSourceCorpusId,member.schemaVersion,JSON.stringify(member.metadata),input.candidate.generatedAt])
      if (input.injectFailureAfter === "MEMBERS") throw new Error("INJECTED_CANDIDATE_FAILURE_MEMBERS")
      await sql.unsafe("INSERT INTO serving.serving_candidate_manifest (manifest_id,corpus_id,previous_corpus_id,previous_serving_checksum,manifest_checksum,schema_version,lifecycle,exposure_eligibility,manifest,created_at,common_watermark_id,common_watermark_value,common_watermark_checksum,member_set_checksum) VALUES($1,$2,$3,$4,$5,$6,'CANDIDATE','INELIGIBLE',$7::text::jsonb,$8,$9,$10,$11,$12)", [manifestId,input.candidate.corpusId,baseline.corpusId,baseline.servingChecksum,manifestChecksum,input.candidate.schemaVersion,JSON.stringify(manifest),input.candidate.generatedAt,input.binding.commonWatermarkId,commonWatermarkValue,input.binding.commonWatermarkChecksum,memberSetChecksum])
      if (input.injectFailureAfter === "MANIFEST") throw new Error("INJECTED_CANDIDATE_FAILURE_MANIFEST")
      const candidateExposures = await sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure WHERE corpus_id=$1", [input.candidate.corpusId])
      if (candidateExposures[0]?.count !== 0 || await exposureFingerprint(sql) !== exposureBefore) throw new Error("CANDIDATE_EXPOSURE_CHANGED")
      return Object.freeze({ status: "CREATED" as const, servingChecksum, manifestId, manifestChecksum, memberSetChecksum, ...input.binding, commonWatermarkValue, comparison, exposureUnchanged: true as const })
    })
  }
}

async function activeExposure(sql: postgres.Sql | postgres.TransactionSql) {
  const rows = await sql.unsafe<Array<{ corpus_id: string; serving_checksum: string; governed_through: string; exposure_id: string }>>("SELECT e.exposure_id,c.corpus_id,c.serving_checksum,c.governed_through::text FROM serving.serving_exposure e JOIN serving.serving_corpus c ON c.corpus_id=e.corpus_id WHERE e.exposure_state='CONSUMER_VISIBLE' ORDER BY e.effective_from DESC,e.exposure_id DESC LIMIT 1")
  return rows[0] ? Object.freeze({ exposureId: rows[0].exposure_id, corpusId: rows[0].corpus_id, servingChecksum: rows[0].serving_checksum, governedThrough: new Date(rows[0].governed_through).toISOString() }) : null
}
async function exposureFingerprint(sql: postgres.Sql | postgres.TransactionSql): Promise<string> {
  const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT exposure_id,corpus_id,exposure_state,effective_from,checksum,publication_note,created_at FROM serving.serving_exposure ORDER BY exposure_id")
  return canonicalChecksum(rows)
}
async function readCertifiedInactiveBaseline(sql: postgres.Sql | postgres.TransactionSql, expected: CertifiedInactiveCandidateExpectation): Promise<CertifiedInactiveCandidateBaseline> {
  const governedThrough = exactIso(expected.governedThrough, "INACTIVE_SERVING_BASELINE_WATERMARK_INVALID")
  if (!expected.candidateId || !isChecksum(expected.candidateChecksum)) throw new Error("INACTIVE_SERVING_BASELINE_IDENTITY_INVALID")
  const [corpusRows, manifestRows, exposureRows] = await Promise.all([
    sql.unsafe<Array<{ corpus_id: string; serving_checksum: string; governed_through: string; lifecycle: string; exposure: string }>>("SELECT corpus_id,serving_checksum,governed_through::text,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1", [expected.candidateId]),
    sql.unsafe<Array<{ manifest_id: string; manifest_checksum: string; lifecycle: string; exposure_eligibility: string; manifest: unknown; common_watermark_id: string | null; common_watermark_value: string | null; common_watermark_checksum: string | null; member_set_checksum: string | null }>>("SELECT manifest_id,manifest_checksum,lifecycle,exposure_eligibility,manifest,common_watermark_id,common_watermark_value::text,common_watermark_checksum,member_set_checksum FROM serving.serving_candidate_manifest WHERE corpus_id=$1 ORDER BY manifest_id", [expected.candidateId]),
    sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure WHERE corpus_id=$1", [expected.candidateId]),
  ])
  const corpus = corpusRows[0]
  if (
    corpusRows.length !== 1
    || !corpus
    || corpus.corpus_id !== expected.candidateId
    || corpus.serving_checksum !== expected.candidateChecksum
    || normalizeDatabaseTimestamp(corpus.governed_through, "INACTIVE_SERVING_BASELINE_WATERMARK_INVALID") !== governedThrough
    || corpus.lifecycle !== "WITHHELD"
    || corpus.exposure !== "INTERNAL_ONLY"
  ) throw new Error("INACTIVE_SERVING_BASELINE_MISMATCH")
  if (manifestRows.length !== 1 || exposureRows[0]?.count !== 0) throw new Error("INACTIVE_SERVING_BASELINE_NOT_ISOLATED")
  const row = manifestRows[0]!
  const manifest = requireRecord(row.manifest, "INACTIVE_SERVING_BASELINE_MANIFEST_MALFORMED")
  const manifestCorpusId = typeof manifest.corpusId === "string" ? manifest.corpusId : typeof manifest.candidateId === "string" ? manifest.candidateId : null
  const manifestIdentityConflict = typeof manifest.corpusId === "string" && typeof manifest.candidateId === "string" && manifest.corpusId !== manifest.candidateId
  const commonWatermarkValue = normalizeDatabaseTimestamp(row.common_watermark_value, "INACTIVE_SERVING_BASELINE_WATERMARK_INVALID")
  if (
    row.lifecycle !== "CANDIDATE"
    || row.exposure_eligibility !== "INELIGIBLE"
    || (expected.sourceLineageIdentity !== undefined && row.manifest_id !== expected.sourceLineageIdentity)
    || !isChecksum(row.manifest_checksum)
    || canonicalChecksum(manifest) !== row.manifest_checksum
    || !row.common_watermark_id
    || !isChecksum(row.common_watermark_checksum)
    || !isChecksum(row.member_set_checksum)
    || commonWatermarkValue !== governedThrough
    || manifestIdentityConflict
    || manifestCorpusId !== expected.candidateId
    || manifest.servingChecksum !== expected.candidateChecksum
    || manifest.commonWatermarkId !== row.common_watermark_id
    || manifest.commonWatermarkValue !== commonWatermarkValue
    || manifest.commonWatermarkChecksum !== row.common_watermark_checksum
    || manifest.memberSetChecksum !== row.member_set_checksum
    || manifest.lifecycle !== "WITHHELD"
    || manifest.exposure !== "INTERNAL_ONLY"
    || manifest.exposureEligibility !== "INELIGIBLE"
  ) throw new Error("INACTIVE_SERVING_BASELINE_MANIFEST_BINDING_MISMATCH")
  const members = await readStoredMembers(sql, expected.candidateId)
  if (!members.length || canonicalChecksum(members.map(memberIdentity)) !== row.member_set_checksum) throw new Error("INACTIVE_SERVING_BASELINE_MEMBER_SET_MISMATCH")
  return Object.freeze({
    corpusId: expected.candidateId,
    servingChecksum: expected.candidateChecksum,
    governedThrough,
    members,
    manifestId: row.manifest_id,
    manifestChecksum: row.manifest_checksum,
    memberSetChecksum: row.member_set_checksum,
    commonWatermarkId: row.common_watermark_id,
    commonWatermarkValue,
    commonWatermarkChecksum: row.common_watermark_checksum,
  })
}
async function storedManifestChecksum(sql: postgres.Sql | postgres.TransactionSql, corpusId: string): Promise<string> { const rows = await sql.unsafe<Array<{ manifest_checksum: string }>>("SELECT manifest_checksum FROM serving.serving_candidate_manifest WHERE corpus_id=$1", [corpusId]); if (!rows[0]) throw new Error("SERVING_CANDIDATE_MANIFEST_MISSING"); return rows[0].manifest_checksum }
async function readStoredMembers(sql: postgres.Sql | postgres.TransactionSql, corpusId: string): Promise<readonly ServingCorpusMember[]> {
  const rows = await sql.unsafe<Record<string, unknown>[]>("SELECT member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata FROM serving.serving_corpus_member WHERE corpus_id=$1 ORDER BY canonical_sort_key,member_kind,member_id", [corpusId])
  return Object.freeze(rows.map(mapMember))
}
async function readPhysicalMembers(sql: postgres.Sql | postgres.TransactionSql, corpusId: string): Promise<readonly ServingCorpusMember[]> {
  const existing = await readStoredMembers(sql, corpusId)
  if (existing.length) return existing
  const rows = await sql.unsafe<Array<{ kind: ServingCorpusMemberKind; id: string; checksum: string; sort_key: string; schema_version: string }>>(`
    SELECT 'PROJECTION' kind,projection_version_id id,projection_checksum checksum,'PROJECTION:'||projection_kind||':'||subject_id||':'||projection_version_id sort_key,schema_version FROM serving.serving_projection WHERE serving_corpus_id=$1
    UNION ALL SELECT 'EVIDENCE_SUMMARY',evidence_summary_id,summary_checksum,'EVIDENCE_SUMMARY:'||instrument||':'||evidence_summary_id,'mvp-serving-evidence/1.0.0' FROM serving.serving_evidence_summary WHERE serving_corpus_id=$1
    UNION ALL SELECT 'REPLAY_SNAPSHOT',replay_snapshot_id,snapshot_checksum,'REPLAY_SNAPSHOT:'||instrument||':'||replay_snapshot_id,model_version FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1
    UNION ALL SELECT 'DEMO_PROFILE',profile_id,profile_checksum,'DEMO_PROFILE:'||role||':'||profile_id,'mvp-serving-profile/1.0.0' FROM serving.serving_demo_profile WHERE serving_corpus_id=$1
    UNION ALL SELECT 'RELEASE_INVENTORY',inventory_id,source_checksum,'RELEASE_INVENTORY:'||projection_kind||':'||inventory_id,'mvp-serving-inventory/1.0.0' FROM serving.serving_release_inventory WHERE serving_corpus_id=$1
    ORDER BY sort_key`, [corpusId])
  return Object.freeze(rows.map((row) => Object.freeze({ memberKind: row.kind, memberId: row.id, memberChecksum: row.checksum, canonicalSortKey: row.sort_key, inheritedSourceCorpusId: corpusId, schemaVersion: row.schema_version || MVP_SERVING_SCHEMA_VERSION, metadata: Object.freeze({ inherited: true }) })))
}
function mapMember(row: Record<string, unknown>): ServingCorpusMember { return Object.freeze({ memberKind: String(row.member_kind) as ServingCorpusMemberKind, memberId: String(row.member_id), memberChecksum: String(row.member_checksum), canonicalSortKey: String(row.canonical_sort_key), inheritedSourceCorpusId: row.inherited_source_corpus_id ? String(row.inherited_source_corpus_id) : null, schemaVersion: String(row.schema_version), metadata: Object.freeze((row.metadata as Record<string, unknown>) ?? {}) }) }
function memberIdentity(member: ServingCorpusMember) { return { kind: member.memberKind, id: member.memberId, checksum: member.memberChecksum, sortKey: member.canonicalSortKey, inheritedSourceCorpusId: member.inheritedSourceCorpusId, schemaVersion: member.schemaVersion, metadata: member.metadata } }
function isChecksum(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{64}$/.test(value) }
function exactIso(value: unknown, code: string): string { try { const iso = new Date(String(value)).toISOString(); if (typeof value !== "string" || iso !== value) throw new Error(code); return iso } catch { throw new Error(code) } }
function normalizeDatabaseTimestamp(value: unknown, code: string): string { try { const timestamp = value instanceof Date ? value : new Date(String(value)); if (!Number.isFinite(timestamp.getTime())) throw new Error(code); return timestamp.toISOString() } catch { throw new Error(code) } }
function requireRecord(value: unknown, code: string): Record<string, unknown> { if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(code); return value as Record<string, unknown> }
