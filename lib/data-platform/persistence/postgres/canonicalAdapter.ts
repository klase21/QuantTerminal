import type postgres from "postgres"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { plannedCommitIdentity, validateCanonicalCommitCommand } from "../canonicalCommit"
import type { CanonicalCommit, CanonicalCommitCommand, CanonicalCommitResult, CanonicalFactReference, LineageEdge, PersistenceConflict, PublicationState, QuarantineCandidate, RawObjectManifest } from "../contracts"
import { isLegalPublicationTransition } from "../publication"
import type { IsolatedPostgresClient } from "./client"
import { insertTypedCanonicalFact, validateTypedCanonicalFact } from "./typedFactWriter"
import type { CanonicalPersistenceAdapter, IsolatedAdapterOptions, LatestCanonicalVersionResult, ManifestResult, OutboxRead, PolicyVersionInput, ProviderSnapshotInput, PublicationCommand, PublicationResult, QuarantineConflictRead, RecordVersionRead, ReconciliationResult, RegistrationResult, RegistrySnapshotInput } from "./adapterTypes"

interface VersionRow { readonly canonical_record_id: string; readonly record_version: number; readonly checksum: string; readonly current_publication_state: PublicationState; readonly commit_id: string; readonly business_identity: string }
interface LatestVersionRow extends VersionRow { readonly dataset_id: string; readonly provider_id: string; readonly registry_snapshot_id: string; readonly provider_snapshot_id: string; readonly provider_certification_snapshot_id: string; readonly policy_version_id: string; readonly schema_version: string; readonly normalization_version: string; readonly created_at: Date; readonly is_superseded: boolean }
interface CountRow { readonly count: number }
interface EnvelopeRow { readonly fact_table: string }

function errorCode(cause: unknown): string | null { return cause && typeof cause === "object" && "code" in cause && typeof cause.code === "string" ? cause.code : null }
function retryCode(cause: unknown): "DEADLOCK" | "SERIALIZATION_FAILURE" | "CONNECTION_INTERRUPTED" | null {
  const code = errorCode(cause)
  if (code === "40P01") return "DEADLOCK"
  if (code === "40001") return "SERIALIZATION_FAILURE"
  if (["CONNECTION_CLOSED", "CONNECTION_DESTROYED", "ECONNRESET", "ETIMEDOUT"].includes(code ?? "")) return "CONNECTION_INTERRUPTED"
  return null
}
const delay = (milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
const factTable = (kind: CanonicalCommitCommand["fact"]["kind"]) => kind
const id = (prefix: string, parts: readonly unknown[]) => `${prefix}_${canonicalChecksum(parts)}`

async function registerImmutableSnapshot(client: IsolatedPostgresClient, table: "registry" | "provider" | "policy", input: RegistrySnapshotInput | ProviderSnapshotInput | PolicyVersionInput): Promise<RegistrationResult> {
  if (table === "registry") {
    const value = input as RegistrySnapshotInput
    const rows = await client.sql<{ readonly snapshot_id: string }[]>`INSERT INTO control.registry_snapshots (snapshot_id,registry_version,content_checksum,canonical_content,effective_at,created_at)
      VALUES (${value.snapshotId},${value.registryVersion},${value.contentChecksum},${client.sql.json(value.canonicalContent)},${value.effectiveAt},${value.createdAt}) ON CONFLICT DO NOTHING RETURNING snapshot_id`
    if (rows[0]) return { status: "SUCCESS", identity: rows[0].snapshot_id }
    const existing = await client.sql<{ readonly content_checksum: string }[]>`SELECT content_checksum FROM control.registry_snapshots WHERE snapshot_id = ${value.snapshotId}`
    return existing[0]?.content_checksum === value.contentChecksum ? { status: "DUPLICATE", identity: value.snapshotId } : { status: "CONFLICT", reason: "REGISTRY_SNAPSHOT_CONFLICT" }
  }
  if (table === "provider") {
    const value = input as ProviderSnapshotInput
    const rows = await client.sql<{ readonly snapshot_id: string }[]>`INSERT INTO control.provider_snapshots (snapshot_id,provider_id,registration_version,certification_status,content_checksum,canonical_content,effective_at,created_at)
      VALUES (${value.snapshotId},${value.providerId},${value.registrationVersion},${value.certificationStatus},${value.contentChecksum},${client.sql.json(value.canonicalContent)},${value.effectiveAt},${value.createdAt}) ON CONFLICT DO NOTHING RETURNING snapshot_id`
    if (rows[0]) return { status: "SUCCESS", identity: rows[0].snapshot_id }
    const existing = await client.sql<{ readonly content_checksum: string }[]>`SELECT content_checksum FROM control.provider_snapshots WHERE snapshot_id = ${value.snapshotId}`
    return existing[0]?.content_checksum === value.contentChecksum ? { status: "DUPLICATE", identity: value.snapshotId } : { status: "CONFLICT", reason: "PROVIDER_SNAPSHOT_CONFLICT" }
  }
  const value = input as PolicyVersionInput
  const rows = await client.sql<{ readonly policy_version_id: string }[]>`INSERT INTO control.policy_versions (policy_version_id,dataset_id,policy_version,content_checksum,canonical_content,effective_at,created_at)
    VALUES (${value.policyVersionId},${value.datasetId},${value.policyVersion},${value.contentChecksum},${client.sql.json(value.canonicalContent)},${value.effectiveAt},${value.createdAt}) ON CONFLICT DO NOTHING RETURNING policy_version_id`
  if (rows[0]) return { status: "SUCCESS", identity: rows[0].policy_version_id }
  const existing = await client.sql<{ readonly content_checksum: string }[]>`SELECT content_checksum FROM control.policy_versions WHERE policy_version_id = ${value.policyVersionId}`
  return existing[0]?.content_checksum === value.contentChecksum ? { status: "DUPLICATE", identity: value.policyVersionId } : { status: "CONFLICT", reason: "POLICY_VERSION_CONFLICT" }
}

async function validateBindings(sql: postgres.TransactionSql, command: CanonicalCommitCommand): Promise<boolean> {
  const g = command.fact.governance
  const rows = await sql<{ readonly registry: boolean; readonly provider: boolean; readonly certification: boolean; readonly policy: boolean; readonly raw: boolean }[]>`
    SELECT
      EXISTS(SELECT 1 FROM control.registry_snapshots WHERE snapshot_id=${g.datasetRegistrySnapshotId}) AS registry,
      EXISTS(SELECT 1 FROM control.provider_snapshots WHERE snapshot_id=${g.providerRegistrySnapshotId} AND provider_id=${command.fact.providerId}) AS provider,
      EXISTS(SELECT 1 FROM control.provider_snapshots WHERE snapshot_id=${g.providerCertificationSnapshotId} AND provider_id=${command.fact.providerId} AND certification_status IN ('CERTIFIED','CERTIFIED_WITH_LIMITATIONS')) AS certification,
      EXISTS(SELECT 1 FROM control.policy_versions WHERE policy_version_id=${g.policyVersionId} AND dataset_id=${command.fact.identity.datasetId}) AS policy,
      EXISTS(SELECT 1 FROM raw.objects WHERE object_id=${command.rawObject.objectId} AND content_hash=${command.rawObject.contentHash} AND provider_snapshot_id=${command.rawObject.providerSnapshotId} AND verification_state='VERIFIED') AS raw`
  const value = rows[0]
  return Boolean(value?.registry && value.provider && value.certification && value.policy && value.raw)
}

async function insertConflict(sql: postgres.TransactionSql, command: CanonicalCommitCommand, existingChecksum: string): Promise<{ conflict: PersistenceConflict; quarantine: QuarantineCandidate }> {
  const detectedAt = command.initiatedAt
  const conflictId = id("conf", [command.fact.identity.canonicalRecordId, command.targetRecordVersion, existingChecksum, command.fact.checksum])
  const quarantineId = id("qua", [conflictId, command.rawObject.objectId])
  await sql`INSERT INTO quarantine.candidates (quarantine_id,raw_object_id,attempted_canonical_record_id,attempted_record_version,status,reason_codes,created_at)
    VALUES (${quarantineId},${command.rawObject.objectId},${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},'OPEN',${sql.array(["IMMUTABLE_CONTENT_CONFLICT"])},${detectedAt}) ON CONFLICT DO NOTHING`
  await sql`INSERT INTO quarantine.conflicts (conflict_id,quarantine_id,canonical_record_id,record_version,existing_checksum,candidate_checksum,detected_at)
    VALUES (${conflictId},${quarantineId},${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},${existingChecksum},${command.fact.checksum},${detectedAt}) ON CONFLICT DO NOTHING`
  return {
    conflict: { conflictId, identity: command.fact.identity, recordVersion: command.targetRecordVersion, existingChecksum, candidateChecksum: command.fact.checksum, rawObjectId: command.rawObject.objectId, detectedAt },
    quarantine: { quarantineId, rawObjectId: command.rawObject.objectId, attemptedIdentity: command.fact.identity, conflictId, reasonCodes: ["IMMUTABLE_CONTENT_CONFLICT"], createdAt: detectedAt },
  }
}

function inject(options: IsolatedAdapterOptions, point: NonNullable<IsolatedAdapterOptions["failurePoint"]>) {
  if (options.failurePoint !== point) return
  if (!options.allowFailureInjection) throw new Error("Failure injection requires explicit isolated-test authorization")
  const error = new Error(`D2 isolated failure at ${point}`) as Error & { code: string }
  error.code = "40001"
  throw error
}

async function countFact(sql: postgres.Sql, table: string, commitId: string): Promise<number> {
  const query = table === "OHLCV" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.ohlcv WHERE commit_id=${commitId}`
    : table === "FUNDING" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.funding WHERE commit_id=${commitId}`
    : table === "OPEN_INTEREST" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.open_interest WHERE commit_id=${commitId}`
    : table === "AGG_TRADE" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.agg_trades WHERE commit_id=${commitId}`
    : table === "LIQUIDATION" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.liquidations WHERE commit_id=${commitId}`
    : table === "PREDICTION_SNAPSHOT" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.prediction_snapshots WHERE commit_id=${commitId}`
    : table === "ETF_OBSERVATION" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.etf_observations WHERE commit_id=${commitId}`
    : table === "RESERVE_OBSERVATION" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.reserve_observations WHERE commit_id=${commitId}`
    : table === "MACRO_OBSERVATION" ? sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.macro_observations WHERE commit_id=${commitId}`
    : sql<CountRow[]>`SELECT count(*)::int AS count FROM canonical.stream_manifests WHERE commit_id=${commitId}`
  return (await query)[0]?.count ?? 0
}

export function createCanonicalPersistenceAdapter(client: IsolatedPostgresClient, options: IsolatedAdapterOptions = {}): CanonicalPersistenceAdapter {
  const maxRetries = Math.min(Math.max(options.maxRetries ?? 2, 0), 5)
  const retryBaseDelayMs = Math.min(Math.max(options.retryBaseDelayMs ?? 25, 1), 1000)

  const executeOnce = async (command: CanonicalCommitCommand): Promise<CanonicalCommitResult> => {
    const validation = [...validateCanonicalCommitCommand(command), ...validateTypedCanonicalFact(command.fact)]
    if (validation.length) return { status: "REJECTED", reasons: ["IDENTITY_MISSING"] }
    const commitId = plannedCommitIdentity(command)
    return client.transaction(async (sql) => {
      if (!await validateBindings(sql, command)) return { status: "REJECTED", reasons: ["CANONICAL_SCHEMA_MISSING"] }
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${command.fact.identity.canonicalRecordId}, 0))`
      const existing = await sql<VersionRow[]>`SELECT canonical_record_id,record_version,checksum,current_publication_state,commit_id,business_identity FROM repository.record_versions
        WHERE canonical_record_id=${command.fact.identity.canonicalRecordId} AND record_version=${command.targetRecordVersion}`
      if (existing[0]) {
        if (existing[0].checksum === command.fact.checksum) return { status: "DUPLICATE", canonicalRecordId: existing[0].canonical_record_id, recordVersion: existing[0].record_version, checksum: existing[0].checksum }
        const conflict = await insertConflict(sql, command, existing[0].checksum)
        return { status: "CONFLICT", ...conflict }
      }
      const boundary = await sql<{ readonly max_version: number | null }[]>`SELECT max(record_version)::int AS max_version FROM repository.record_versions WHERE canonical_record_id=${command.fact.identity.canonicalRecordId}`
      const maxVersion = boundary[0]?.max_version ?? 0
      if ((command.operationType === "INITIAL_VERSION" && (maxVersion !== 0 || command.targetRecordVersion !== 1)) ||
          (command.operationType === "PROVIDER_CORRECTION" && (!command.predecessor || command.predecessor.recordVersion !== maxVersion || command.targetRecordVersion !== maxVersion + 1))) {
        const conflict = await insertConflict(sql, command, canonicalChecksum(["VERSION_BOUNDARY", maxVersion > 0 ? maxVersion : "missing"]))
        return { status: "CONFLICT", ...conflict }
      }
      if (command.operationType === "PROVIDER_CORRECTION") {
        const competing = await sql<{ readonly successor_commit_id: string }[]>`SELECT successor_commit_id FROM repository.supersessions WHERE canonical_record_id=${command.fact.identity.canonicalRecordId} AND predecessor_version=${maxVersion}`
        if (competing[0]) {
          const conflict = await insertConflict(sql, command, canonicalChecksum(["COMPETING_CORRECTION", competing[0].successor_commit_id]))
          return { status: "CONFLICT", ...conflict }
        }
      }
      const g = command.fact.governance
      const commitRows = await sql<{ readonly committed_at: Date }[]>`INSERT INTO control.canonical_commits (commit_id,operation_type,dataset_id,provider_id,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,initiated_at,committed_at,idempotency_key,candidate_count,committed_record_count)
        VALUES (${commitId},${command.operationType},${command.fact.identity.datasetId},${command.fact.providerId},${g.datasetRegistrySnapshotId},${g.providerRegistrySnapshotId},${g.providerCertificationSnapshotId},${g.policyVersionId},${g.schemaVersion},${g.normalizationVersion},${command.initiatedAt},now(),${command.idempotencyKey},1,1) RETURNING committed_at`
      inject(options, "AFTER_COMMIT_ROW")
      await insertTypedCanonicalFact(sql, command.fact, commitId, command.targetRecordVersion)
      inject(options, "AFTER_FACT_ROW")
      const envelopeId = id("env", [commitId])
      await sql`INSERT INTO repository.envelopes (envelope_id,commit_id,dataset_id,canonical_record_id,record_version,fact_table,checksum,provider_id,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,created_at)
        VALUES (${envelopeId},${commitId},${command.fact.identity.datasetId},${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},${factTable(command.fact.kind)},${command.fact.checksum},${command.fact.providerId},${g.datasetRegistrySnapshotId},${g.providerRegistrySnapshotId},${g.providerCertificationSnapshotId},${g.policyVersionId},${g.schemaVersion},${g.normalizationVersion},now())`
      inject(options, "AFTER_ENVELOPE_ROW")
      const versionId = id("ver", [commitId, command.targetRecordVersion])
      const decisionId = id("dec", [commitId, "PENDING"])
      await sql`INSERT INTO repository.record_versions (version_id,commit_id,envelope_id,dataset_id,business_identity,canonical_record_id,record_version,checksum,registry_snapshot_id,provider_snapshot_id,provider_certification_snapshot_id,policy_version_id,schema_version,normalization_version,current_publication_state,current_decision_id,created_at)
        VALUES (${versionId},${commitId},${envelopeId},${command.fact.identity.datasetId},${command.fact.identity.businessIdentity},${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},${command.fact.checksum},${g.datasetRegistrySnapshotId},${g.providerRegistrySnapshotId},${g.providerCertificationSnapshotId},${g.policyVersionId},${g.schemaVersion},${g.normalizationVersion},'PENDING',${decisionId},now())`
      inject(options, "AFTER_VERSION_ROW")
      const required = command.requiredLineage.filter((edge) => edge.source.nodeType === "RAW_OBJECT" && edge.source.nodeId === command.rawObject.objectId && edge.destination.nodeType === "CANONICAL_FACT" && edge.destination.nodeId === command.fact.identity.canonicalRecordId && edge.destination.nodeVersion === String(command.targetRecordVersion))
      if (required.length !== 1) throw new Error("Canonical commit requires exactly one matching RAW_OBJECT to CANONICAL_FACT edge")
      for (const edge of command.requiredLineage) await sql`INSERT INTO repository.lineage_edges (edge_id,source_node_type,source_node_id,source_node_version,destination_node_type,destination_node_id,destination_node_version,relationship_type,commit_id,created_at,digest)
        VALUES (${edge.edgeId},${edge.source.nodeType},${edge.source.nodeId},${edge.source.nodeVersion},${edge.destination.nodeType},${edge.destination.nodeId},${edge.destination.nodeVersion},${edge.relationship},${commitId},${edge.createdAt},${edge.digest}) ON CONFLICT DO NOTHING`
      inject(options, "AFTER_LINEAGE_ROW")
      await sql`SELECT repository.append_initial_publication_decision(${decisionId},${commitId},${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},${g.policyVersionId},now(),${sql.array(["CANONICAL_COMMIT"])})`
      inject(options, "AFTER_DECISION_ROW")
      if (command.operationType === "PROVIDER_CORRECTION" && command.predecessor) {
        await sql`INSERT INTO repository.supersessions (supersession_id,canonical_record_id,predecessor_version,successor_version,successor_commit_id,created_at)
          VALUES (${id("sup", [commitId])},${command.fact.identity.canonicalRecordId},${command.predecessor.recordVersion},${command.targetRecordVersion},${commitId},now())`
      }
      inject(options, "BEFORE_OUTBOX_ROW")
      await sql`INSERT INTO control.outbox (event_id,commit_id,event_type,payload_version,canonical_record_id,record_version,publication_decision_id,created_at,published_at,attempt_count)
        VALUES (${id("out", [commitId, "CANONICAL_RECORD_COMMITTED"])},${commitId},'CANONICAL_RECORD_COMMITTED','1',${command.fact.identity.canonicalRecordId},${command.targetRecordVersion},NULL,now(),NULL,0)`
      const commit: CanonicalCommit = { commitId, operationType: command.operationType, datasetId: command.fact.identity.datasetId, providerId: command.fact.providerId, registrySnapshotId: g.datasetRegistrySnapshotId, providerSnapshotId: g.providerRegistrySnapshotId, providerCertificationSnapshotId: g.providerCertificationSnapshotId, policyVersionId: g.policyVersionId, schemaVersion: g.schemaVersion, normalizationVersion: g.normalizationVersion, initiatedAt: command.initiatedAt, committedAt: commitRows[0]?.committed_at.toISOString() ?? command.initiatedAt, idempotencyKey: command.idempotencyKey, candidateCount: 1, committedRecordCount: 1 }
      const fact: CanonicalFactReference = { ...command.fact.identity, recordVersion: command.targetRecordVersion, factTable: factTable(command.fact.kind) }
      return { status: "SUCCESS", commit, fact }
    })
  }

  return Object.freeze({
    registerRegistrySnapshot: (input) => registerImmutableSnapshot(client, "registry", input),
    registerProviderSnapshot: (input) => registerImmutableSnapshot(client, "provider", input),
    registerPolicyVersion: (input) => registerImmutableSnapshot(client, "policy", input),
    async registerRawObjectManifest(input: RawObjectManifest): Promise<ManifestResult> {
      if (!input.objectId || !input.contentHash || input.sizeBytes < 0 || !input.mediaType || !input.objectStorageKey || !Number.isFinite(Date.parse(input.retrievedAt))) return { status: "REJECTED", reason: "INVALID_RAW_MANIFEST" }
      if (input.objectId !== `raw_${input.contentHash}`) return { status: "REJECTED", reason: "NON_DETERMINISTIC_RAW_OBJECT_IDENTITY" }
      const rows = await client.sql<{ readonly object_id: string }[]>`INSERT INTO raw.objects (object_id,dataset_id,provider_id,venue,symbol_or_subject,window_start,window_end,content_hash,size_bytes,media_type,compression,retrieved_at,provider_snapshot_id,retention_class,verification_state,object_storage_key,created_at)
        VALUES (${input.objectId},${input.datasetId},${input.providerId},${input.venue},${input.symbolOrSubject},${input.windowStart},${input.windowEnd},${input.contentHash},${input.sizeBytes},${input.mediaType},${input.compression},${input.retrievedAt},${input.providerSnapshotId},${input.retentionClass},${input.verificationState},${input.objectStorageKey},${input.createdAt}) ON CONFLICT DO NOTHING RETURNING object_id`
      if (rows[0]) return { status: "SUCCESS", objectId: rows[0].object_id }
      const existing = await client.sql<{ readonly content_hash: string; readonly object_storage_key: string; readonly size_bytes: string; readonly dataset_id: string; readonly provider_id: string; readonly media_type: string; readonly compression: string; readonly provider_snapshot_id: string }[]>`SELECT content_hash,object_storage_key,size_bytes::text AS size_bytes,dataset_id,provider_id,media_type,compression,provider_snapshot_id FROM raw.objects WHERE object_id=${input.objectId} OR content_hash=${input.contentHash}`
      return existing[0]?.content_hash === input.contentHash && existing[0].object_storage_key === input.objectStorageKey && existing[0].size_bytes === String(input.sizeBytes)
        && existing[0].dataset_id === input.datasetId && existing[0].provider_id === input.providerId && existing[0].media_type === input.mediaType
        && existing[0].compression === input.compression && existing[0].provider_snapshot_id === input.providerSnapshotId
        ? { status: "DUPLICATE", objectId: input.objectId } : { status: "CONFLICT", reason: "RAW_MANIFEST_CONFLICT" }
    },
    async executeCanonicalCommit(command: CanonicalCommitCommand): Promise<CanonicalCommitResult> {
      for (let attempt = 0; ; attempt += 1) {
        try { return await executeOnce(command) }
        catch (cause) {
          const code = retryCode(cause)
          if (!code) return { status: "REJECTED", reasons: ["CONSISTENCY_FAILED"] }
          if (code === "CONNECTION_INTERRUPTED") {
            try {
              const commitId = plannedCommitIdentity(command)
              const found = await client.sql<{ readonly commit_id: string }[]>`SELECT commit_id FROM control.canonical_commits WHERE commit_id=${commitId}`
              if (found[0]) return { status: "DUPLICATE", canonicalRecordId: command.fact.identity.canonicalRecordId, recordVersion: command.targetRecordVersion, checksum: command.fact.checksum }
            } catch { /* Unknown outcomes remain retryable and explicit. */ }
          }
          if (attempt >= maxRetries) return { status: "RETRYABLE_FAILURE", code, retryWithSameIdempotencyKey: true }
          await delay(retryBaseDelayMs * (attempt + 1))
        }
      }
    },
    async readCanonicalRecordVersion(canonicalRecordId, recordVersion): Promise<RecordVersionRead | null> {
      const rows = await client.sql<VersionRow[]>`SELECT canonical_record_id,record_version,checksum,current_publication_state,commit_id,business_identity FROM repository.record_versions WHERE canonical_record_id=${canonicalRecordId} AND record_version=${recordVersion}`
      return rows[0] ? { canonicalRecordId: rows[0].canonical_record_id, recordVersion: rows[0].record_version, checksum: rows[0].checksum, publicationState: rows[0].current_publication_state, commitId: rows[0].commit_id } : null
    },
    async readLatestCanonicalVersion(request): Promise<LatestCanonicalVersionResult> {
      const reasons: string[] = []
      if (!request.canonicalRecordId.trim()) reasons.push("CANONICAL_RECORD_ID_MISSING")
      if (!request.datasetId.trim()) reasons.push("DATASET_ID_MISSING")
      if (!request.businessIdentity.trim()) reasons.push("BUSINESS_IDENTITY_MISSING")
      if (!request.providerId.trim()) reasons.push("PROVIDER_ID_MISSING")
      if (reasons.length) return { status: "INVALID_REQUEST", reasons: Object.freeze(reasons) }
      try {
        const rows = await client.sql<LatestVersionRow[]>`SELECT rv.canonical_record_id,rv.record_version,rv.checksum,rv.current_publication_state,rv.commit_id,rv.business_identity,rv.dataset_id,e.provider_id,rv.registry_snapshot_id,rv.provider_snapshot_id,rv.provider_certification_snapshot_id,rv.policy_version_id,rv.schema_version,rv.normalization_version,rv.created_at,
          EXISTS (SELECT 1 FROM repository.supersessions s WHERE s.canonical_record_id=rv.canonical_record_id AND s.predecessor_version=rv.record_version) AS is_superseded
          FROM repository.record_versions rv JOIN repository.envelopes e ON e.envelope_id=rv.envelope_id
          WHERE rv.canonical_record_id=${request.canonicalRecordId}
          ORDER BY rv.record_version DESC LIMIT 1`
        const row = rows[0]
        if (!row) return { status: "NOT_FOUND" }
        if (row.dataset_id !== request.datasetId || row.business_identity !== request.businessIdentity || row.provider_id !== request.providerId) return { status: "CONFLICT", reason: "IDENTITY_DIMENSIONS_MISMATCH" }
        return { status: "FOUND", record: Object.freeze({ canonicalRecordId: row.canonical_record_id, recordVersion: row.record_version, checksum: row.checksum, publicationState: row.current_publication_state, commitId: row.commit_id, datasetId: row.dataset_id, businessIdentity: row.business_identity, providerId: row.provider_id, supersessionState: row.is_superseded ? "SUPERSEDED" : "ACTIVE", registrySnapshotId: row.registry_snapshot_id, providerSnapshotId: row.provider_snapshot_id, providerCertificationSnapshotId: row.provider_certification_snapshot_id, policyVersionId: row.policy_version_id, schemaVersion: row.schema_version, normalizationVersion: row.normalization_version, createdAt: row.created_at.toISOString() }) }
      } catch (cause) {
        return { status: "TARGET_UNAVAILABLE", reason: cause instanceof Error && cause.name ? `POSTGRES_TARGET_UNAVAILABLE:${cause.name}` : "POSTGRES_TARGET_UNAVAILABLE" }
      }
    },
    async appendPublicationDecision(command: PublicationCommand): Promise<PublicationResult> {
      const current = await this.readCanonicalRecordVersion(command.canonicalRecordId, command.recordVersion)
      if (!current || !isLegalPublicationTransition({ from: current.publicationState, to: command.nextState })) return { status: "REJECTED", reason: "ILLEGAL_PUBLICATION_TRANSITION" }
      const decisionId = id("dec", [current.commitId, command.recordVersion, current.publicationState, command.nextState, command.decidedAt])
      const outboxId = id("out", [decisionId, "PUBLICATION_STATE_CHANGED"])
      const supersession = command.nextState === "PUBLISHED" ? await client.sql<{ readonly predecessor_version: number }[]>`SELECT predecessor_version FROM repository.supersessions WHERE canonical_record_id=${command.canonicalRecordId} AND successor_version=${command.recordVersion}` : []
      const predecessorDecisionId = supersession[0] ? id("dec", [current.commitId, supersession[0].predecessor_version, "SUPERSEDED", command.decidedAt]) : null
      try {
        await client.sql`SELECT repository.append_publication_decision(${decisionId},${current.commitId},${command.canonicalRecordId},${command.recordVersion},${command.nextState}::repository.publication_state,${command.policyVersionId},${command.decidedAt},${client.sql.array([...command.reasonCodes])},${outboxId},${predecessorDecisionId})`
        return { status: "SUCCESS", state: command.nextState, decisionId }
      } catch (cause) {
        return retryCode(cause) ? { status: "RETRYABLE_FAILURE", reason: retryCode(cause) ?? "RETRYABLE" } : { status: "REJECTED", reason: "PUBLICATION_TRANSITION_REJECTED" }
      }
    },
    async readLineageEdges(nodeId): Promise<readonly LineageEdge[]> {
      const rows = await client.sql<Array<{ readonly edge_id: string; readonly source_node_type: LineageEdge["source"]["nodeType"]; readonly source_node_id: string; readonly source_node_version: string; readonly destination_node_type: LineageEdge["destination"]["nodeType"]; readonly destination_node_id: string; readonly destination_node_version: string; readonly relationship_type: LineageEdge["relationship"]; readonly commit_id: string; readonly created_at: Date; readonly digest: string | null }>>`
        SELECT edge_id,source_node_type,source_node_id,source_node_version,destination_node_type,destination_node_id,destination_node_version,relationship_type,commit_id,created_at,digest FROM repository.lineage_edges WHERE source_node_id=${nodeId} OR destination_node_id=${nodeId} ORDER BY created_at,edge_id`
      return Object.freeze(rows.map((row) => ({ edgeId: row.edge_id, source: { nodeType: row.source_node_type, nodeId: row.source_node_id, nodeVersion: row.source_node_version }, destination: { nodeType: row.destination_node_type, nodeId: row.destination_node_id, nodeVersion: row.destination_node_version }, relationship: row.relationship_type, commitId: row.commit_id, createdAt: row.created_at.toISOString(), digest: row.digest })))
    },
    async verifyLineageAcyclic(): Promise<boolean> {
      const rows = await client.sql<{ readonly cycle_found: boolean }[]>`
        WITH RECURSIVE walk AS (
          SELECT source_node_type,source_node_id,source_node_version,destination_node_type,destination_node_id,destination_node_version,
            ARRAY[source_node_type||':'||source_node_id||':'||source_node_version]::text[] AS path,false AS cycle
          FROM repository.lineage_edges
          UNION ALL
          SELECT walk.source_node_type,walk.source_node_id,walk.source_node_version,edge.destination_node_type,edge.destination_node_id,edge.destination_node_version,
            walk.path || (edge.source_node_type||':'||edge.source_node_id||':'||edge.source_node_version),
            (edge.destination_node_type||':'||edge.destination_node_id||':'||edge.destination_node_version) = ANY(walk.path)
          FROM walk JOIN repository.lineage_edges edge
            ON edge.source_node_type=walk.destination_node_type AND edge.source_node_id=walk.destination_node_id AND edge.source_node_version=walk.destination_node_version
          WHERE NOT walk.cycle
        ) SELECT EXISTS(SELECT 1 FROM walk WHERE cycle) AS cycle_found`
      return rows[0]?.cycle_found === false
    },
    async readOutboxEvents(limit = 100): Promise<readonly OutboxRead[]> {
      const bounded = Math.min(Math.max(Math.trunc(limit), 1), 500)
      const rows = await client.sql<Array<{ readonly event_id: string; readonly commit_id: string; readonly event_type: OutboxRead["eventType"]; readonly canonical_record_id: string; readonly record_version: number; readonly publication_decision_id: string | null; readonly created_at: Date }>>`
        SELECT event_id,commit_id,event_type,canonical_record_id,record_version,publication_decision_id,created_at FROM control.outbox ORDER BY created_at,event_id LIMIT ${bounded}`
      return Object.freeze(rows.map((row) => ({ eventId: row.event_id, commitId: row.commit_id, eventType: row.event_type, canonicalRecordId: row.canonical_record_id, recordVersion: row.record_version, publicationDecisionId: row.publication_decision_id, createdAt: row.created_at.toISOString() })))
    },
    async readQuarantineConflicts(canonicalRecordId): Promise<readonly QuarantineConflictRead[]> {
      const rows = await client.sql<Array<{ readonly conflict_id: string; readonly quarantine_id: string; readonly canonical_record_id: string; readonly record_version: number; readonly existing_checksum: string; readonly candidate_checksum: string; readonly detected_at: Date }>>`
        SELECT conflict_id,quarantine_id,canonical_record_id,record_version,existing_checksum,candidate_checksum,detected_at FROM quarantine.conflicts WHERE canonical_record_id=${canonicalRecordId} ORDER BY detected_at,conflict_id`
      return Object.freeze(rows.map((row) => ({ conflictId: row.conflict_id, quarantineId: row.quarantine_id, canonicalRecordId: row.canonical_record_id, recordVersion: row.record_version, existingChecksum: row.existing_checksum, candidateChecksum: row.candidate_checksum, detectedAt: row.detected_at.toISOString() })))
    },
    async reconcileCommit(commitId): Promise<ReconciliationResult> {
      const envelope = await client.sql<EnvelopeRow[]>`SELECT fact_table FROM repository.envelopes WHERE commit_id=${commitId}`
      const [commit, version, decision, lineage, outbox] = await Promise.all([
        client.sql<CountRow[]>`SELECT count(*)::int AS count FROM control.canonical_commits WHERE commit_id=${commitId}`,
        client.sql<CountRow[]>`SELECT count(*)::int AS count FROM repository.record_versions WHERE commit_id=${commitId}`,
        client.sql<CountRow[]>`SELECT count(*)::int AS count FROM repository.publication_decisions WHERE commit_id=${commitId} AND sequence_number=1 AND next_state='PENDING'`,
        client.sql<CountRow[]>`SELECT count(*)::int AS count FROM repository.lineage_edges WHERE commit_id=${commitId}`,
        client.sql<CountRow[]>`SELECT count(*)::int AS count FROM control.outbox WHERE commit_id=${commitId} AND event_type='CANONICAL_RECORD_COMMITTED'`,
      ])
      const counts = { fact: envelope[0] ? await countFact(client.sql, envelope[0].fact_table, commitId) : 0, envelope: envelope.length, version: version[0]?.count ?? 0, initialDecision: decision[0]?.count ?? 0, lineage: lineage[0]?.count ?? 0, commitOutbox: outbox[0]?.count ?? 0 }
      const reasons: string[] = []
      if ((commit[0]?.count ?? 0) !== 1) reasons.push("COMMIT_COUNT_MISMATCH")
      for (const [key, value] of Object.entries(counts)) if (key !== "lineage" && value !== 1) reasons.push(`${key.toUpperCase()}_COUNT_MISMATCH`)
      if (counts.lineage < 1) reasons.push("LINEAGE_MISSING")
      return { consistent: reasons.length === 0, counts, reasons: Object.freeze(reasons) }
    },
  })
}
