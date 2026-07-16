import { canonicalChecksum } from "@/lib/data-platform/contracts"
import type { MvpRefreshPostgresClient } from "./client"

export const CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION = "mvp-bounded-ohlcv/1.0.0" as const
export const CONTROLLED_OHLCV_CERTIFICATION_VERSION = "mvp-controlled-ohlcv-reacquisition/1.0.0" as const
export const LEGACY_COMMITTED_DISPOSITION = "LEGACY_COMMITTED_UNATTRIBUTABLE_NON_AUTHORITATIVE" as const
export const ORPHANED_ACQUIRED_DISPOSITION = "ORPHANED_NO_EVIDENCE_QUARANTINED" as const

export interface ControlledOhlcvSourceContract {
  readonly sourceContractId: string
  readonly provider: "binance-vision"
  readonly endpointClass: "BINANCE_VISION_USDM_DAILY_KLINES_ARCHIVE"
  readonly dataset: "ohlcv"
  readonly instrument: "BTCUSDT"
  readonly eventTimeStart: string
  readonly eventTimeEnd: string
  readonly cadence: "5m"
  readonly sourceObjectIdentityClass: "DAILY_KLINES_ZIP"
  readonly archiveNamingConvention: "USDM_DAILY_KLINES_INSTRUMENT_CADENCE_UTC_DAY_ZIP"
  readonly expectedContentTypes: readonly ["application/zip", "application/octet-stream"]
  readonly expectedRowCountRule: "EXACTLY_288_FIVE_MINUTE_CANDLES"
  readonly parserVersion: string
  readonly parserChecksum: string
  readonly normalizerVersion: string
  readonly normalizerChecksum: string
  readonly schemaVersion: "1"
  readonly schemaChecksum: string
  readonly repositorySourceRevision: string
  readonly boundedAdapterVersion: typeof CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION
  readonly boundedAdapterChecksum: string
  readonly finalizationRule: "CLOSED_UTC_DAY_AND_SUCCESSFUL_NONEMPTY_PROVIDER_ARCHIVE"
  readonly checksumAlgorithm: "SHA-256"
  readonly canonicalizationContract: "MVP_8A2E_STABLE_OHLCV_DOMAIN_V1"
  readonly limitations: readonly ["PROVIDER_ARCHIVE_MAY_BE_CORRECTED_AFTER_PUBLICATION"]
  readonly checksum: string
}

export interface ControlledRetrievalRecord {
  readonly retrievalId: string
  readonly runId: string
  readonly unitId: string
  readonly sourceContractId: string
  readonly artifactId: string
  readonly sourceObjectIdentity: string
  readonly sourceClassification: "HTTP_SUCCESS"
  readonly contentType: string
  readonly byteCount: number
  readonly rawChecksum: string
  readonly finalized: true
  readonly retrievedAt: string
  readonly checksum: string
}

export interface ControlledCandidateIdentity { readonly candidateId: string; readonly checksum: string }
export interface ControlledCandidateSetRecord {
  readonly candidateSetId: string
  readonly runId: string
  readonly unitId: string
  readonly retrievalId: string
  readonly sourceContractId: string
  readonly candidates: readonly ControlledCandidateIdentity[]
  readonly checksum: string
}

export interface ControlledCanonicalFactIdentity {
  readonly canonicalRecordId: string
  readonly recordVersion: number
  readonly checksum: string
  readonly commitId: string
  readonly eventTimestamp: string
}

export interface ControlledCanonicalCommitSetRecord {
  readonly commitSetId: string
  readonly runId: string
  readonly unitId: string
  readonly candidateSetId: string
  readonly status: "CREATED" | "DUPLICATE" | "CONFLICT"
  readonly facts: readonly ControlledCanonicalFactIdentity[]
  readonly canonicalStableDomainDigest: string | null
  readonly checksum: string
}

export interface AuthoritativeSlotReconciliation {
  readonly reconciliationId: string
  readonly logicalSlotId: string
  readonly provider: "binance-vision"
  readonly dataset: "ohlcv"
  readonly instrument: "BTCUSDT"
  readonly intervalStart: string
  readonly intervalEnd: string
  readonly sourceContractVersion: typeof CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION
  readonly authoritativeUnitId: string
  readonly sourceContractId: string
  readonly retrievalId: string
  readonly artifactId: string
  readonly candidateSetId: string
  readonly commitSetId: string
  readonly canonicalFactSetDigest: string
  readonly factCount: 288
  readonly authorityReason: "CONTROLLED_REACQUISITION_WITH_COMPLETE_PROVENANCE"
  readonly certificationVersion: typeof CONTROLLED_OHLCV_CERTIFICATION_VERSION
  readonly legacyCommittedUnitIds: readonly string[]
  readonly orphanedAcquiredUnitId: string
  readonly checksum: string
}

export type AuthorityFailurePoint = "BEFORE_AUTHORITY_INSERT" | "AFTER_AUTHORITY_INSERT_BEFORE_VERIFICATION"
export type ProviderAuditDigestClassification = "MATCHES_8A2E_PROVIDER_AUDIT" | "PROVIDER_OUTPUT_CHANGED" | "DIGEST_COMPARISON_INCONCLUSIVE"

function exactIso(value: string): string {
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) throw new Error("CONTROLLED_OHLCV_TIMESTAMP_INVALID")
  return value
}

function checksum64(value: string, code: string): string {
  if (!/^[0-9a-f]{64}$/.test(value)) throw new Error(code)
  return value
}

export function classifyProviderAuditDigest(current: string | null, expected: string): ProviderAuditDigestClassification {
  if (!current || !/^[0-9a-f]{64}$/.test(current) || !/^[0-9a-f]{64}$/.test(expected)) return "DIGEST_COMPARISON_INCONCLUSIVE"
  return current === expected ? "MATCHES_8A2E_PROVIDER_AUDIT" : "PROVIDER_OUTPUT_CHANGED"
}

export function createControlledOhlcvSourceContract(input: Omit<ControlledOhlcvSourceContract, "sourceContractId" | "provider" | "endpointClass" | "dataset" | "instrument" | "cadence" | "sourceObjectIdentityClass" | "archiveNamingConvention" | "expectedContentTypes" | "expectedRowCountRule" | "boundedAdapterVersion" | "finalizationRule" | "checksumAlgorithm" | "canonicalizationContract" | "limitations" | "checksum">): ControlledOhlcvSourceContract {
  const eventTimeStart = exactIso(input.eventTimeStart), eventTimeEnd = exactIso(input.eventTimeEnd)
  if (Date.parse(eventTimeEnd) - Date.parse(eventTimeStart) !== 86_400_000) throw new Error("CONTROLLED_OHLCV_DAILY_INTERVAL_REQUIRED")
  for (const value of [input.parserChecksum, input.normalizerChecksum, input.schemaChecksum, input.boundedAdapterChecksum]) checksum64(value, "CONTROLLED_OHLCV_IMPLEMENTATION_CHECKSUM_INVALID")
  if (!/^[0-9a-f]{40}$/.test(input.repositorySourceRevision)) throw new Error("CONTROLLED_OHLCV_REPOSITORY_REVISION_INVALID")
  const basis = {
    provider: "binance-vision" as const,
    endpointClass: "BINANCE_VISION_USDM_DAILY_KLINES_ARCHIVE" as const,
    dataset: "ohlcv" as const,
    instrument: "BTCUSDT" as const,
    eventTimeStart,
    eventTimeEnd,
    cadence: "5m" as const,
    sourceObjectIdentityClass: "DAILY_KLINES_ZIP" as const,
    archiveNamingConvention: "USDM_DAILY_KLINES_INSTRUMENT_CADENCE_UTC_DAY_ZIP" as const,
    expectedContentTypes: Object.freeze(["application/zip", "application/octet-stream"] as const),
    expectedRowCountRule: "EXACTLY_288_FIVE_MINUTE_CANDLES" as const,
    ...input,
    boundedAdapterVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION,
    finalizationRule: "CLOSED_UTC_DAY_AND_SUCCESSFUL_NONEMPTY_PROVIDER_ARCHIVE" as const,
    checksumAlgorithm: "SHA-256" as const,
    canonicalizationContract: "MVP_8A2E_STABLE_OHLCV_DOMAIN_V1" as const,
    limitations: Object.freeze(["PROVIDER_ARCHIVE_MAY_BE_CORRECTED_AFTER_PUBLICATION"] as const),
  }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ sourceContractId: `mrsrc_${checksum}`, ...basis, checksum })
}

export function createControlledRetrievalRecord(input: Omit<ControlledRetrievalRecord, "retrievalId" | "checksum" | "sourceClassification" | "finalized">): ControlledRetrievalRecord {
  checksum64(input.rawChecksum, "CONTROLLED_RETRIEVAL_CHECKSUM_INVALID")
  if (!input.sourceObjectIdentity || !input.contentType || !Number.isSafeInteger(input.byteCount) || input.byteCount < 1) throw new Error("CONTROLLED_RETRIEVAL_INVALID")
  const basis = { ...input, retrievedAt: exactIso(input.retrievedAt), sourceClassification: "HTTP_SUCCESS" as const, finalized: true as const }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ retrievalId: `mrret_${checksum}`, ...basis, checksum })
}

export function createControlledCandidateSetRecord(input: Omit<ControlledCandidateSetRecord, "candidateSetId" | "checksum">): ControlledCandidateSetRecord {
  if (input.candidates.length !== 288 || new Set(input.candidates.map((item) => item.candidateId)).size !== 288 || input.candidates.some((item) => !item.candidateId || !/^[0-9a-f]{64}$/.test(item.checksum))) throw new Error("CONTROLLED_CANDIDATE_SET_INVALID")
  const candidates = Object.freeze([...input.candidates].sort((a, b) => a.candidateId.localeCompare(b.candidateId)))
  const basis = { ...input, candidates }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ candidateSetId: `mrcs_${checksum}`, ...basis, checksum })
}

export function createControlledCanonicalCommitSetRecord(input: Omit<ControlledCanonicalCommitSetRecord, "commitSetId" | "checksum">): ControlledCanonicalCommitSetRecord {
  const facts = Object.freeze([...input.facts].sort((a, b) => a.eventTimestamp.localeCompare(b.eventTimestamp) || a.canonicalRecordId.localeCompare(b.canonicalRecordId)))
  if (input.status === "CONFLICT" ? facts.length !== 0 : facts.length !== 288) throw new Error("CONTROLLED_CANONICAL_FACT_SET_INVALID")
  if (facts.some((fact) => !fact.canonicalRecordId || !fact.commitId || !Number.isInteger(fact.recordVersion) || fact.recordVersion < 1 || !/^[0-9a-f]{64}$/.test(fact.checksum))) throw new Error("CONTROLLED_CANONICAL_FACT_IDENTITY_INVALID")
  if (input.status !== "CONFLICT") checksum64(input.canonicalStableDomainDigest ?? "", "CONTROLLED_CANONICAL_DIGEST_INVALID")
  const basis = { ...input, facts }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ commitSetId: `mrcmt_${checksum}`, ...basis, checksum })
}

export function createAuthoritativeSlotReconciliation(input: Omit<AuthoritativeSlotReconciliation, "reconciliationId" | "provider" | "dataset" | "instrument" | "sourceContractVersion" | "factCount" | "authorityReason" | "certificationVersion" | "checksum">): AuthoritativeSlotReconciliation {
  if (input.legacyCommittedUnitIds.length !== 4 || new Set(input.legacyCommittedUnitIds).size !== 4 || !input.orphanedAcquiredUnitId) throw new Error("CONTROLLED_LEGACY_DISPOSITION_INVALID")
  checksum64(input.canonicalFactSetDigest, "CONTROLLED_AUTHORITY_DIGEST_INVALID")
  const basis = {
    ...input,
    intervalStart: exactIso(input.intervalStart),
    intervalEnd: exactIso(input.intervalEnd),
    provider: "binance-vision" as const,
    dataset: "ohlcv" as const,
    instrument: "BTCUSDT" as const,
    sourceContractVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION,
    factCount: 288 as const,
    authorityReason: "CONTROLLED_REACQUISITION_WITH_COMPLETE_PROVENANCE" as const,
    certificationVersion: CONTROLLED_OHLCV_CERTIFICATION_VERSION,
    legacyCommittedUnitIds: Object.freeze([...input.legacyCommittedUnitIds].sort()),
  }
  const checksum = canonicalChecksum(basis)
  return Object.freeze({ reconciliationId: `mrrec_${checksum}`, ...basis, checksum })
}

async function immutableInsert(client: MvpRefreshPostgresClient, input: { readonly table: string; readonly idColumn: string; readonly id: string; readonly checksum: string; readonly sql: string; readonly values: readonly unknown[] }): Promise<"CREATED" | "DUPLICATE"> {
  const existing = await client.sql.unsafe<Array<{ checksum: string }>>(`SELECT checksum FROM refresh_control.${input.table} WHERE ${input.idColumn}=$1`, [input.id])
  if (existing[0]) {
    if (existing[0].checksum !== input.checksum) throw new Error("CONTROLLED_PROVENANCE_IMMUTABLE_CONFLICT")
    return "DUPLICATE"
  }
  await client.sql.unsafe(input.sql, input.values as never[])
  return "CREATED"
}

export class ControlledOhlcvRecoveryStore {
  constructor(private readonly client: MvpRefreshPostgresClient) {}

  putSourceContract(value: ControlledOhlcvSourceContract): Promise<"CREATED" | "DUPLICATE"> {
    return immutableInsert(this.client, { table: "source_contract", idColumn: "source_contract_id", id: value.sourceContractId, checksum: value.checksum, sql: "INSERT INTO refresh_control.source_contract(source_contract_id,provider,dataset_id,instrument,interval_start,interval_end,contract_version,contract,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now())", values: [value.sourceContractId, value.provider, value.dataset, value.instrument, value.eventTimeStart, value.eventTimeEnd, value.boundedAdapterVersion, JSON.stringify(value), value.checksum] })
  }

  putRetrieval(value: ControlledRetrievalRecord): Promise<"CREATED" | "DUPLICATE"> {
    return immutableInsert(this.client, { table: "controlled_retrieval", idColumn: "retrieval_id", id: value.retrievalId, checksum: value.checksum, sql: "INSERT INTO refresh_control.controlled_retrieval(retrieval_id,run_id,unit_id,source_contract_id,artifact_id,source_object_identity,source_classification,content_type,byte_count,raw_checksum,finalized,retrieval,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11::jsonb,$12,$13)", values: [value.retrievalId, value.runId, value.unitId, value.sourceContractId, value.artifactId, value.sourceObjectIdentity, value.sourceClassification, value.contentType, value.byteCount, value.rawChecksum, JSON.stringify(value), value.checksum, value.retrievedAt] })
  }

  putCandidateSet(value: ControlledCandidateSetRecord): Promise<"CREATED" | "DUPLICATE"> {
    return immutableInsert(this.client, { table: "controlled_candidate_set", idColumn: "candidate_set_id", id: value.candidateSetId, checksum: value.checksum, sql: "INSERT INTO refresh_control.controlled_candidate_set(candidate_set_id,run_id,unit_id,retrieval_id,source_contract_id,candidate_count,candidate_identities,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,now())", values: [value.candidateSetId, value.runId, value.unitId, value.retrievalId, value.sourceContractId, value.candidates.length, JSON.stringify(value.candidates), value.checksum] })
  }

  putCommitSet(value: ControlledCanonicalCommitSetRecord): Promise<"CREATED" | "DUPLICATE"> {
    return immutableInsert(this.client, { table: "controlled_canonical_commit_set", idColumn: "commit_set_id", id: value.commitSetId, checksum: value.checksum, sql: "INSERT INTO refresh_control.controlled_canonical_commit_set(commit_set_id,run_id,unit_id,candidate_set_id,status,fact_count,canonical_facts,canonical_stable_domain_digest,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,now())", values: [value.commitSetId, value.runId, value.unitId, value.candidateSetId, value.status, value.facts.length, JSON.stringify(value.facts), value.canonicalStableDomainDigest, value.checksum] })
  }

  async putAuthority(value: AuthoritativeSlotReconciliation, input: { readonly leaseKey: string; readonly ownerId: string; readonly fencingToken: number; readonly failurePoint?: AuthorityFailurePoint }): Promise<"CREATED" | "DUPLICATE"> {
    return this.client.transaction(async (sql) => {
      const existing = await sql.unsafe<Array<{ checksum: string }>>("SELECT checksum FROM refresh_control.logical_slot_reconciliation WHERE logical_slot_id=$1 FOR UPDATE", [value.logicalSlotId])
      if (existing[0]) {
        if (existing[0].checksum !== value.checksum) throw new Error("CONTROLLED_AUTHORITY_IMMUTABLE_CONFLICT")
        return "DUPLICATE"
      }
      const fence = await sql.unsafe<Array<{ valid: boolean }>>("SELECT owner_id=$2 AND fencing_token=$3 AND expires_at>now() AND released_at IS NULL valid FROM refresh_control.refresh_lease WHERE lease_key=$1 FOR UPDATE", [input.leaseKey, input.ownerId, input.fencingToken])
      if (!fence[0]?.valid) throw new Error("REFRESH_LEASE_FENCE_LOST")
      const lineage = await sql.unsafe<Array<{ valid: boolean }>>("SELECT sc.source_contract_id=$2 AND r.retrieval_id=$3 AND r.artifact_id=$4 AND cs.candidate_set_id=$5 AND cc.commit_set_id=$6 AND cc.status IN ('CREATED','DUPLICATE') AND cc.fact_count=288 AND cc.canonical_stable_domain_digest=$7 valid FROM refresh_control.source_contract sc JOIN refresh_control.controlled_retrieval r ON r.source_contract_id=sc.source_contract_id JOIN refresh_control.controlled_candidate_set cs ON cs.retrieval_id=r.retrieval_id JOIN refresh_control.controlled_canonical_commit_set cc ON cc.candidate_set_id=cs.candidate_set_id WHERE r.unit_id=$1 AND cc.unit_id=$1", [value.authoritativeUnitId, value.sourceContractId, value.retrievalId, value.artifactId, value.candidateSetId, value.commitSetId, value.canonicalFactSetDigest])
      if (!lineage[0]?.valid) throw new Error("CONTROLLED_AUTHORITY_LINEAGE_INCOMPLETE")
      if (input.failurePoint === "BEFORE_AUTHORITY_INSERT") throw new Error("INJECTED_BEFORE_AUTHORITY_INSERT")
      const dispositions = { legacyCommitted: value.legacyCommittedUnitIds.map((unitId) => ({ unitId, disposition: LEGACY_COMMITTED_DISPOSITION })), orphanedAcquired: { unitId: value.orphanedAcquiredUnitId, disposition: ORPHANED_ACQUIRED_DISPOSITION } }
      await sql.unsafe("INSERT INTO refresh_control.logical_slot_reconciliation(reconciliation_id,logical_slot_id,authoritative_unit_id,source_contract_id,retrieval_id,artifact_id,candidate_set_id,commit_set_id,canonical_fact_set_digest,fact_count,interval_start,interval_end,authority_reason,certification_version,legacy_dispositions,checksum,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,288,$10,$11,$12,$13,$14::jsonb,$15,now())", [value.reconciliationId, value.logicalSlotId, value.authoritativeUnitId, value.sourceContractId, value.retrievalId, value.artifactId, value.candidateSetId, value.commitSetId, value.canonicalFactSetDigest, value.intervalStart, value.intervalEnd, value.authorityReason, value.certificationVersion, JSON.stringify(dispositions), value.checksum])
      if (input.failurePoint === "AFTER_AUTHORITY_INSERT_BEFORE_VERIFICATION") throw new Error("INJECTED_AFTER_AUTHORITY_INSERT")
      const verified = await sql.unsafe<Array<{ valid: boolean }>>("SELECT checksum=$2 AND fact_count=288 valid FROM refresh_control.logical_slot_reconciliation WHERE reconciliation_id=$1", [value.reconciliationId, value.checksum])
      if (!verified[0]?.valid) throw new Error("CONTROLLED_AUTHORITY_VERIFICATION_FAILED")
      return "CREATED"
    })
  }

  async readAuthoritiesForWindow(intervalStart: string, intervalEnd: string): Promise<readonly AuthoritativeSlotReconciliation[]> {
    type Dispositions = { legacyCommitted: Array<{ unitId: string }>; orphanedAcquired: { unitId: string } }
    const rows = await this.client.sql.unsafe<Array<{ reconciliation_id: string; logical_slot_id: string; authoritative_unit_id: string; source_contract_id: string; retrieval_id: string; artifact_id: string; candidate_set_id: string; commit_set_id: string; canonical_fact_set_digest: string; interval_start: string; interval_end: string; certification_version: string; checksum: string; legacy_dispositions: Dispositions | string }>>("SELECT reconciliation_id,logical_slot_id,authoritative_unit_id,source_contract_id,retrieval_id,artifact_id,candidate_set_id,commit_set_id,canonical_fact_set_digest,interval_start::text,interval_end::text,certification_version,checksum,legacy_dispositions FROM refresh_control.logical_slot_reconciliation WHERE interval_start=$1 AND interval_end=$2 ORDER BY logical_slot_id", [intervalStart, intervalEnd])
    return Object.freeze(rows.map((row) => {
      const dispositions = typeof row.legacy_dispositions === "string" ? JSON.parse(row.legacy_dispositions) as Dispositions : row.legacy_dispositions
      return Object.freeze({ reconciliationId: row.reconciliation_id, logicalSlotId: row.logical_slot_id, provider: "binance-vision" as const, dataset: "ohlcv" as const, instrument: "BTCUSDT" as const, intervalStart: new Date(row.interval_start).toISOString(), intervalEnd: new Date(row.interval_end).toISOString(), sourceContractVersion: CONTROLLED_OHLCV_SOURCE_CONTRACT_VERSION, authoritativeUnitId: row.authoritative_unit_id, sourceContractId: row.source_contract_id, retrievalId: row.retrieval_id, artifactId: row.artifact_id, candidateSetId: row.candidate_set_id, commitSetId: row.commit_set_id, canonicalFactSetDigest: row.canonical_fact_set_digest, factCount: 288 as const, authorityReason: "CONTROLLED_REACQUISITION_WITH_COMPLETE_PROVENANCE" as const, certificationVersion: CONTROLLED_OHLCV_CERTIFICATION_VERSION, legacyCommittedUnitIds: Object.freeze(dispositions.legacyCommitted.map((item) => item.unitId).sort()), orphanedAcquiredUnitId: dispositions.orphanedAcquired.unitId, checksum: row.checksum })
    }))
  }
}
