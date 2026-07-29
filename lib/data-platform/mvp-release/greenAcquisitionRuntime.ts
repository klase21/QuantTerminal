import { readFile, readdir } from "node:fs/promises"
import { resolve } from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import {
  MvpServingPostgresClient,
  PostgresMvpInactiveServingReadPort,
  publishInactiveCandidateToSeparateTarget,
  type InactiveServingCandidatePlan,
} from "@/lib/data-platform/mvp-serving"
import {
  ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1,
  MVP_GREEN_ACQUISITION_BUNDLE_PATHS,
  assertMvpGreenAcquisitionManifestBinding,
  classifyMvpGreenAcquisitionDerivedState,
  executeMvpGreenAtomicDerivedStateAcquisition,
  loadMvpGreenAcquisitionBundle,
  parseMvpGreenAcquisitionManifest,
  type LoadedMvpGreenAcquisitionBundle,
  type MvpGreenAcquisitionCatalogSnapshot,
  type MvpGreenAcquisitionManifest,
} from "./greenAcquisition"
import { discoverMvpGreenServingMigrationPlan } from "./greenMigrationExecution"

export const MVP_GREEN_ACQUISITION_TARGET = Object.freeze({
  projectId: "soft-cell-16396854",
  branchId: "br-muddy-unit-ao3o6iid",
  endpointId: "ep-wandering-salad-aocwtmax",
  databaseName: "mvp_release_20260721_9c177d6309",
  databaseOwner: "mvp_green_sql_owner_9c177d6309",
  approvedParentLsn: "0/2CFC128",
  targetId: "neon:soft-cell-16396854/br-muddy-unit-ao3o6iid/mvp_release_20260721_9c177d6309",
} as const)

export const MVP_GREEN_ACQUISITION_MIGRATIONS = Object.freeze([
  Object.freeze({ id: "001", filename: "001_mvp_serving_schema.sql", checksum: "b28b489343695c5fbf3759280beaf3bb8d20c26f0c6604bbfa4daaef647b5cfb" }),
  Object.freeze({ id: "002", filename: "002_reader_role_hardening.sql", checksum: "7d366525720f07e7ef7aa4cc8628e4cbd465f0707556768a168d22b43a33fb4d" }),
  Object.freeze({ id: "003", filename: "003_inactive_candidate_membership.sql", checksum: "50f3e25597aff94178d38b262611e5590d933174646716815b90e28f19fd7ddb" }),
  Object.freeze({ id: "004", filename: "004_inactive_serving_staging_bindings.sql", checksum: "5ddfb5029fbc6248b2edbb3ac20fe135dd6e264666c88d51c06988d181bcbc50" }),
  Object.freeze({ id: "005", filename: "005_guarded_serving_cutover_control.sql", checksum: "c870daa1125dedffecab78a77c84459b6335e9f015905715f74b404fa269677b" }),
] as const)
export const MVP_GREEN_ACQUISITION_MIGRATION_PLAN_CHECKSUM = "df1c8e05dcfea91ddb74301da331bf534e38e3f7e2afc45f4331565b71b16373" as const
export const MVP_GREEN_ACQUISITION_APPLICATION_COMMIT = "a4590b21dd8929df679f9eb2aa823d6c019a0b31" as const
export const MVP_GREEN_ACQUISITION_APPLICATION_CHECKSUM = "894b0cea24a869817d2cdbb3ca94c3b240c18ae5d0ec128353893a4dfcf9587a" as const

export interface ExecuteMvpGreenAcquisitionInput {
  readonly acquisitionManifestPath: string
  readonly acquisitionManifestChecksum: string
  readonly bundleDirectory: string
  readonly bundleAggregateChecksum: string
  readonly candidateIdentity: string
  readonly greenBranchId: string
  readonly approvedParentLsn: string
  readonly writerConnectionString: string | undefined
  readonly readerConnectionString: string | undefined
}

export interface ExecuteMvpGreenAcquisitionResult {
  readonly command: "acquire-green-candidate"
  readonly result: "CREATED" | "RECONCILED"
  readonly state: "COMPLETE"
  readonly candidateIdentity: string
  readonly candidateChecksum: string
  readonly acquisitionStateContract: typeof ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1
  readonly automaticRetries: 0
  readonly mutationCalls: 0 | 1
}

function exactFileSet(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && new Set(actual).size === expected.length && [...actual].sort().join("\n") === [...expected].sort().join("\n")
}

function identityFromUrl(connectionString: string | undefined): { readonly role: string; readonly database: string; readonly hostname: string } {
  if (!connectionString) throw new Error("MVP_GREEN_ACQUISITION_CONNECTION_REQUIRED")
  let url: URL
  try { url = new URL(connectionString) } catch { throw new Error("MVP_GREEN_ACQUISITION_CONNECTION_INVALID") }
  const hostname = url.hostname.toLowerCase()
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""))
  const role = decodeURIComponent(url.username)
  if (
    !["postgres:", "postgresql:"].includes(url.protocol)
    || !url.password
    || !role
    || database !== MVP_GREEN_ACQUISITION_TARGET.databaseName
    || !hostname.includes(MVP_GREEN_ACQUISITION_TARGET.endpointId)
    || hostname.includes("pooler")
  ) throw new Error("MVP_GREEN_ACQUISITION_DIRECT_TARGET_MISMATCH")
  return Object.freeze({ role, database, hostname })
}

export async function loadCertifiedMvpGreenAcquisitionInput(input: Pick<ExecuteMvpGreenAcquisitionInput, "acquisitionManifestPath" | "acquisitionManifestChecksum" | "bundleDirectory" | "bundleAggregateChecksum" | "candidateIdentity" | "greenBranchId" | "approvedParentLsn">): Promise<{ readonly manifest: MvpGreenAcquisitionManifest; readonly bundle: LoadedMvpGreenAcquisitionBundle }> {
  const manifestBytes = await readFile(resolve(input.acquisitionManifestPath))
  const manifest = parseMvpGreenAcquisitionManifest(JSON.parse(manifestBytes.toString("utf8")))
  if (manifest.manifestChecksum !== input.acquisitionManifestChecksum) throw new Error("MVP_GREEN_ACQUISITION_MANIFEST_CHECKSUM_FLAG_MISMATCH")
  const names = (await readdir(resolve(input.bundleDirectory), { withFileTypes: true }))
  if (!exactFileSet(names.filter((entry) => entry.isFile()).map((entry) => entry.name), MVP_GREEN_ACQUISITION_BUNDLE_PATHS) || names.some((entry) => !entry.isFile())) throw new Error("MVP_GREEN_ACQUISITION_BUNDLE_FILE_SET_INVALID")
  const files = await Promise.all(MVP_GREEN_ACQUISITION_BUNDLE_PATHS.map(async (path) => Object.freeze({ path, content: await readFile(resolve(input.bundleDirectory, path)) })))
  const bundle = loadMvpGreenAcquisitionBundle(files)
  assertMvpGreenAcquisitionManifestBinding(manifest, bundle)
  const migrationPlan = await discoverMvpGreenServingMigrationPlan()
  if (
    input.bundleAggregateChecksum !== bundle.aggregateChecksum
    || input.candidateIdentity !== bundle.candidate.candidateId
    || input.greenBranchId !== MVP_GREEN_ACQUISITION_TARGET.branchId
    || input.approvedParentLsn !== MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn
    || manifest.targetApplicationCommit !== MVP_GREEN_ACQUISITION_APPLICATION_COMMIT
    || manifest.targetApplicationChecksum !== MVP_GREEN_ACQUISITION_APPLICATION_CHECKSUM
    || manifest.targetProjectId !== MVP_GREEN_ACQUISITION_TARGET.projectId
    || manifest.targetBranchId !== MVP_GREEN_ACQUISITION_TARGET.branchId
    || manifest.targetEndpointId !== MVP_GREEN_ACQUISITION_TARGET.endpointId
    || manifest.targetDatabaseName !== MVP_GREEN_ACQUISITION_TARGET.databaseName
    || manifest.targetDatabaseOwner !== MVP_GREEN_ACQUISITION_TARGET.databaseOwner
    || manifest.approvedParentLsn !== MVP_GREEN_ACQUISITION_TARGET.approvedParentLsn
    || manifest.migrationPlanChecksum !== MVP_GREEN_ACQUISITION_MIGRATION_PLAN_CHECKSUM
    || migrationPlan.planChecksum !== MVP_GREEN_ACQUISITION_MIGRATION_PLAN_CHECKSUM
    || migrationPlan.migrations.length !== MVP_GREEN_ACQUISITION_MIGRATIONS.length
    || migrationPlan.migrations.some((migration, index) => {
      const expected = MVP_GREEN_ACQUISITION_MIGRATIONS[index]
      return !expected || migration.migrationId !== expected.id || migration.filename !== expected.filename || migration.checksum !== expected.checksum
    })
  ) throw new Error("MVP_GREEN_ACQUISITION_RELEASE_BINDING_MISMATCH")
  return Object.freeze({ manifest, bundle })
}

function normalizedMember(row: Record<string, unknown>) {
  return Object.freeze({
    memberKind: row.member_kind,
    memberId: row.member_id,
    memberChecksum: row.member_checksum,
    canonicalSortKey: row.canonical_sort_key,
    inheritedSourceCorpusId: row.inherited_source_corpus_id,
    schemaVersion: row.schema_version,
    metadata: row.metadata,
  })
}

async function catalogSnapshot(reader: MvpServingPostgresClient, bundle: LoadedMvpGreenAcquisitionBundle): Promise<MvpGreenAcquisitionCatalogSnapshot> {
  const plan = bundle.candidate
  return reader.readOnlyTransaction(async (sql) => {
    const [identityRows, ledger, corpus, projections, evidence, replay, members, manifests, controls] = await Promise.all([
      sql.unsafe<Array<{ database_name: string; branch_id: string | null; owner: string; version: number; read_only: string }>>("SELECT current_database() database_name,current_setting('neon.branch_id',true) branch_id,pg_get_userbyid(d.datdba) owner,current_setting('server_version_num')::int version,current_setting('transaction_read_only') read_only FROM pg_database d WHERE d.datname=current_database()"),
      sql.unsafe<Array<{ migration_id: string; migration_filename: string; migration_checksum: string }>>("SELECT migration_id,migration_filename,migration_checksum FROM serving_control.migration_ledger ORDER BY migration_id"),
      sql.unsafe<Record<string, unknown>[]>("SELECT corpus_id,serving_checksum,lifecycle,exposure FROM serving.serving_corpus WHERE corpus_id=$1 OR corpus_id=$2 ORDER BY corpus_id", [plan.candidateId, plan.genesisCorpusId]),
      sql.unsafe<Record<string, unknown>[]>("SELECT serving_corpus_id,projection_version_id,projection_checksum FROM serving.serving_projection WHERE serving_corpus_id=$1 OR projection_version_id=ANY($2::text[]) ORDER BY projection_version_id", [plan.candidateId, plan.projections.map((value) => value.projectionVersionId)]),
      sql.unsafe<Record<string, unknown>[]>("SELECT serving_corpus_id,evidence_summary_id,summary_checksum FROM serving.serving_evidence_summary WHERE serving_corpus_id=$1 OR evidence_summary_id=ANY($2::text[]) ORDER BY evidence_summary_id", [plan.candidateId, plan.evidenceSummaries.map((value) => value.evidenceSummaryId)]),
      sql.unsafe<Record<string, unknown>[]>("SELECT serving_corpus_id,replay_snapshot_id,snapshot_checksum,model_checksum FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1 OR replay_snapshot_id=ANY($2::text[]) ORDER BY replay_snapshot_id", [plan.candidateId, plan.replaySnapshots.map((value) => value.replaySnapshotId)]),
      sql.unsafe<Record<string, unknown>[]>("SELECT member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata FROM serving.serving_corpus_member WHERE corpus_id=$1 ORDER BY canonical_sort_key,member_kind,member_id", [plan.candidateId]),
      sql.unsafe<Record<string, unknown>[]>("SELECT manifest_id,corpus_id,manifest_checksum,lifecycle,exposure_eligibility,manifest,common_watermark_id,common_watermark_value,common_watermark_checksum,member_set_checksum FROM serving.serving_candidate_manifest WHERE corpus_id=$1 OR manifest_id=$2", [plan.candidateId, plan.manifestId]),
      sql.unsafe<Array<{ demo_profile_count: number; release_inventory_count: number; exposure_count: number; publication_event_count: number; cutover_count: number }>>("SELECT (SELECT count(*)::int FROM serving.serving_demo_profile WHERE serving_corpus_id=$1) demo_profile_count,(SELECT count(*)::int FROM serving.serving_release_inventory WHERE serving_corpus_id=$1) release_inventory_count,(SELECT count(*)::int FROM serving.serving_exposure WHERE corpus_id=$1) exposure_count,(SELECT count(*)::int FROM serving.serving_publication_event WHERE corpus_id=$1) publication_event_count,((SELECT count(*) FROM serving_control.cutover_approval)+(SELECT count(*) FROM serving_control.cutover_authorization)+(SELECT count(*) FROM serving_control.cutover_event)+(SELECT count(*) FROM serving_control.cutover_authorization_consumption))::int cutover_count", [plan.candidateId]),
    ])
    const identity = identityRows[0]
    if (!identity || identity.database_name !== MVP_GREEN_ACQUISITION_TARGET.databaseName || identity.branch_id !== MVP_GREEN_ACQUISITION_TARGET.branchId || identity.owner !== MVP_GREEN_ACQUISITION_TARGET.databaseOwner || identity.version < 160000 || identity.version >= 170000 || identity.read_only !== "on") throw new Error("MVP_GREEN_ACQUISITION_LIVE_TARGET_MISMATCH")
    if (ledger.length !== MVP_GREEN_ACQUISITION_MIGRATIONS.length || ledger.some((row, index) => {
      const expected = MVP_GREEN_ACQUISITION_MIGRATIONS[index]
      return !expected || row.migration_id !== expected.id || row.migration_filename !== expected.filename || row.migration_checksum !== expected.checksum
    })) throw new Error("MVP_GREEN_ACQUISITION_MIGRATION_LEDGER_MISMATCH")

    const candidateCorpus = corpus.find((row) => row.corpus_id === plan.candidateId)
    const genesisCorpus = corpus.find((row) => row.corpus_id === plan.genesisCorpusId)
    const manifestRow = manifests.find((row) => row.corpus_id === plan.candidateId)
    const expectedProjection = new Map(plan.projections.map((value) => [value.projectionVersionId, value.projectionChecksum]))
    const expectedEvidence = new Map(plan.evidenceSummaries.map((value) => [value.evidenceSummaryId, value.summaryChecksum]))
    const expectedReplay = new Map(plan.replaySnapshots.map((value) => [value.replaySnapshotId, [value.snapshotChecksum, value.modelChecksum] as const]))
    const immutableConflict = Boolean(
      candidateCorpus && (candidateCorpus.serving_checksum !== plan.servingChecksum || candidateCorpus.lifecycle !== "WITHHELD" || candidateCorpus.exposure !== "INTERNAL_ONLY")
      || genesisCorpus && (genesisCorpus.serving_checksum !== plan.genesisChecksum || genesisCorpus.lifecycle !== "WITHHELD" || genesisCorpus.exposure !== "INTERNAL_ONLY")
      || projections.some((row) => row.serving_corpus_id !== plan.candidateId || expectedProjection.get(String(row.projection_version_id)) !== row.projection_checksum)
      || evidence.some((row) => row.serving_corpus_id !== plan.candidateId || expectedEvidence.get(String(row.evidence_summary_id)) !== row.summary_checksum)
      || replay.some((row) => {
        const expected = expectedReplay.get(String(row.replay_snapshot_id))
        return row.serving_corpus_id !== plan.candidateId || !expected || expected[0] !== row.snapshot_checksum || expected[1] !== row.model_checksum
      })
      || members.length > 0 && canonicalChecksum(members.map(normalizedMember)) !== canonicalChecksum(plan.members)
      || manifests.some((row) => row.corpus_id !== plan.candidateId || row.manifest_id !== plan.manifestId || row.manifest_checksum !== plan.manifestChecksum)
    )
    const control = controls[0] ?? { demo_profile_count: -1, release_inventory_count: -1, exposure_count: -1, publication_event_count: -1, cutover_count: -1 }
    return Object.freeze({
      runtimeBindingExact: true,
      immutableConflict,
      corpusCount: corpus.length,
      candidateCorpusCount: candidateCorpus ? 1 : 0,
      projectionCount: projections.filter((row) => row.serving_corpus_id === plan.candidateId).length,
      evidenceSummaryCount: evidence.filter((row) => row.serving_corpus_id === plan.candidateId).length,
      replaySnapshotCount: replay.filter((row) => row.serving_corpus_id === plan.candidateId).length,
      demoProfileCount: control.demo_profile_count,
      corpusMemberCount: members.length,
      candidateManifestCount: manifests.filter((row) => row.corpus_id === plan.candidateId).length,
      releaseInventoryCount: control.release_inventory_count,
      exposureCount: control.exposure_count,
      publicationEventCount: control.publication_event_count,
      cutoverCount: control.cutover_count,
      candidate: candidateCorpus && manifestRow ? Object.freeze({
        candidateId: String(candidateCorpus.corpus_id),
        servingChecksum: String(candidateCorpus.serving_checksum),
        memberSetChecksum: String(manifestRow.member_set_checksum),
        manifestChecksum: String(manifestRow.manifest_checksum),
        commonWatermarkId: String(manifestRow.common_watermark_id),
        commonWatermarkValue: new Date(String(manifestRow.common_watermark_value)).toISOString(),
        commonWatermarkChecksum: String(manifestRow.common_watermark_checksum),
        lifecycle: String(candidateCorpus.lifecycle),
        exposure: String(candidateCorpus.exposure),
        exposureEligibility: String(manifestRow.exposure_eligibility),
      }) : null,
    })
  })
}

async function requireCompleteReadback(reader: MvpServingPostgresClient, bundle: LoadedMvpGreenAcquisitionBundle): Promise<void> {
  const selection = await new PostgresMvpInactiveServingReadPort(reader).selectCandidate(bundle.candidate.candidateId)
  if (
    selection.review.servingChecksum !== bundle.candidate.servingChecksum
    || selection.review.manifestChecksum !== bundle.candidate.manifestChecksum
    || selection.review.memberSetChecksum !== bundle.candidate.memberSetChecksum
  ) throw new Error("MVP_GREEN_ACQUISITION_COMPLETE_READBACK_MISMATCH")
}

export async function executeMvpGreenAcquisition(input: ExecuteMvpGreenAcquisitionInput): Promise<ExecuteMvpGreenAcquisitionResult> {
  const certified = await loadCertifiedMvpGreenAcquisitionInput(input)
  const writerIdentity = identityFromUrl(input.writerConnectionString), readerIdentity = identityFromUrl(input.readerConnectionString)
  if (writerIdentity.hostname !== readerIdentity.hostname || writerIdentity.role === readerIdentity.role) throw new Error("MVP_GREEN_ACQUISITION_ROLE_BINDING_INVALID")
  const writer = new MvpServingPostgresClient(input.writerConnectionString!, "PUBLISHER", process.env, "MANAGED_POSTGRES", { database: writerIdentity.database, role: writerIdentity.role })
  const reader = new MvpServingPostgresClient(input.readerConnectionString!, "READER", process.env, "MANAGED_POSTGRES", { database: readerIdentity.database, role: readerIdentity.role })
  try {
    await Promise.all([writer.verify(), reader.verify()])
    const result = await executeMvpGreenAtomicDerivedStateAcquisition({
      classify: async () => classifyMvpGreenAcquisitionDerivedState(await catalogSnapshot(reader, certified.bundle), certified.bundle),
      publish: async () => {
        const publication = await publishInactiveCandidateToSeparateTarget(writer, reader, certified.bundle.input, { targetId: MVP_GREEN_ACQUISITION_TARGET.targetId, expectedTargetId: MVP_GREEN_ACQUISITION_TARGET.targetId })
        return publication.status
      },
      verifyComplete: () => requireCompleteReadback(reader, certified.bundle),
    })
    return Object.freeze({ command: "acquire-green-candidate", result, state: "COMPLETE", candidateIdentity: certified.bundle.candidate.candidateId, candidateChecksum: certified.bundle.candidate.servingChecksum, acquisitionStateContract: ATOMIC_MANIFEST_LAST_DERIVED_STATE_V1, automaticRetries: 0, mutationCalls: result === "CREATED" ? 1 : 0 })
  } finally {
    await Promise.allSettled([writer.shutdown(), reader.shutdown()])
  }
}
