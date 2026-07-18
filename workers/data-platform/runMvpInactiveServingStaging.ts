import { readFileSync } from "node:fs"
import postgres from "postgres"
import {
  MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION,
  MvpServingMigrationRunner,
  MvpServingPostgresClient,
  PostgresMvpInactiveServingReadPort,
  createServingEvidenceSummary,
  mapServingProjectionPayload,
  mapServingReplayPayload,
  prepareInactiveServingCandidate,
  stageInactiveServingCandidate,
  type InactiveServingCandidateInput,
  type ServingCorpusMember,
} from "@/lib/data-platform/mvp-serving"

type Command = "migrate" | "stage" | "review"
type Meta = Readonly<Record<string, string>>
const REQUIRED_SYMBOLS = Object.freeze(["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT", "DOGEUSDT"])
const SOURCE_DATABASES = Object.freeze([
  "quantterminal_mvp8e_d4_7f0a69d8e1",
  "quantterminal_mvp8e_serving_7f0a69d8e1",
  "quantterminal_mvp8h_replay_3d1de9c8h1",
  "quantterminal_mvp8e_refresh_7f0a69d8e1",
])

function loadMeta(): Meta {
  const metaPath = process.env.MVP8I_META_PATH
  if (!metaPath) throw new Error("MVP8I_META_PATH_REQUIRED")
  const values: Record<string, string> = {}
  for (const raw of readFileSync(metaPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const line = raw.trim()
    if (!line) continue
    const at = line.indexOf("=")
    if (at < 1) throw new Error("MVP8I_META_LINE_MALFORMED")
    const key = line.slice(0, at).trim(), value = line.slice(at + 1).trim()
    if (!value || Object.hasOwn(values, key)) throw new Error(`MVP8I_META_BINDING_INVALID:${key}`)
    values[key] = value
  }
  return Object.freeze(values)
}

function requireMeta(meta: Meta, keys: readonly string[]): void {
  const missing = keys.filter((key) => !meta[key])
  if (missing.length) throw new Error(`MVP8I_META_REQUIRED:${missing.join(",")}`)
}

function readonlySource(url: string, name: string) {
  return postgres(url, { max: 1, prepare: false, connect_timeout: 10, idle_timeout: 30, connection: { application_name: name, default_transaction_read_only: true, statement_timeout: 30_000 } })
}

function targetClient(meta: Meta, key: "TARGET_MIGRATION_URL" | "TARGET_PUBLISHER_URL" | "TARGET_READER_URL", intent: "MIGRATION_OWNER" | "PUBLISHER" | "READER") {
  const url = meta[key]!, role = decodeURIComponent(new URL(url).username)
  return new MvpServingPostgresClient(url, intent, targetEnvironment(meta), "LOCAL_ISOLATED", { database: meta.TARGET_DATABASE!, role })
}

function targetEnvironment(meta: Meta): Readonly<Record<string, string | undefined>> {
  return {
    D4_ISOLATED_POSTGRES_URL: meta.D4_SOURCE_URL,
    MVP_REFRESH_ISOLATED_POSTGRES_URL: meta.REFRESH_SOURCE_URL,
    DATABASE_URL: meta.FAILED_SERVING_SOURCE_URL,
  }
}

function validateTargetBindings(meta: Meta): void {
  requireMeta(meta, ["TARGET_DATABASE", "TARGET_MIGRATION_URL", "TARGET_PUBLISHER_URL", "TARGET_READER_URL"])
  const targetUrls = [meta.TARGET_MIGRATION_URL!, meta.TARGET_PUBLISHER_URL!, meta.TARGET_READER_URL!]
  for (const raw of targetUrls) if (decodeURIComponent(new URL(raw).pathname.replace(/^\//, "")) !== meta.TARGET_DATABASE) throw new Error("MVP8I_TARGET_DATABASE_BINDING_MISMATCH")
  const publisherRole = decodeURIComponent(new URL(meta.TARGET_PUBLISHER_URL!).username), readerRole = decodeURIComponent(new URL(meta.TARGET_READER_URL!).username)
  if (!publisherRole || !readerRole || publisherRole === readerRole || meta.TARGET_PUBLISHER_URL === meta.TARGET_READER_URL) throw new Error("MVP8I_SEPARATE_READER_ROLE_REQUIRED")
  for (const sourceKey of ["D4_SOURCE_URL", "FAILED_SERVING_SOURCE_URL", "REPLAY_SOURCE_URL", "REFRESH_SOURCE_URL"] as const) if (meta[sourceKey] && targetUrls.includes(meta[sourceKey]!)) throw new Error(`MVP8I_TARGET_SOURCE_ALIAS_REJECTED:${sourceKey}`)
}

async function assertReadOnly(sources: readonly ReturnType<typeof readonlySource>[]): Promise<void> {
  const states = await Promise.all(sources.map((sql) => sql.unsafe<Array<{ value: string; database: string }>>("SELECT current_setting('transaction_read_only') value,current_database() database")))
  if (states.some((rows, index) => rows[0]?.value !== "on" || rows[0]?.database !== SOURCE_DATABASES[index])) throw new Error("MVP8I_SOURCE_SESSION_IDENTITY_INVALID")
}

function mapSourceMember(row: Record<string, unknown>): ServingCorpusMember {
  const metadata = row.metadata
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("MVP8I_SOURCE_MEMBER_METADATA_MALFORMED")
  return Object.freeze({ memberKind: String(row.member_kind) as ServingCorpusMember["memberKind"], memberId: String(row.member_id), memberChecksum: String(row.member_checksum), canonicalSortKey: String(row.canonical_sort_key), inheritedSourceCorpusId: row.inherited_source_corpus_id ? String(row.inherited_source_corpus_id) : null, schemaVersion: String(row.schema_version), metadata: Object.freeze(metadata as Record<string, unknown>) })
}

function parseEventPayload(value: unknown): Record<string, unknown> {
  let current = value
  if (typeof current === "string") { try { current = JSON.parse(current) } catch { throw new Error("MVP8I_COMMON_WATERMARK_PAYLOAD_MALFORMED") } }
  if (!current || typeof current !== "object" || Array.isArray(current)) throw new Error("MVP8I_COMMON_WATERMARK_PAYLOAD_MALFORMED")
  return current as Record<string, unknown>
}

async function loadStageInput(meta: Meta): Promise<{ readonly input: InactiveServingCandidateInput; readonly close: () => Promise<unknown> }> {
  requireMeta(meta, ["D4_SOURCE_URL", "FAILED_SERVING_SOURCE_URL", "REPLAY_SOURCE_URL", "REFRESH_SOURCE_URL", "FAILED_CANDIDATE_CROSSCHECK_ID", "REPLAY_SOURCE_CORPUS_ID", "COMMON_WATERMARK_ID"])
  validateTargetBindings(meta)
  const d4 = readonlySource(meta.D4_SOURCE_URL!, "mvp8i-d4-source-read"), failed = readonlySource(meta.FAILED_SERVING_SOURCE_URL!, "mvp8i-failed-serving-read"), replay = readonlySource(meta.REPLAY_SOURCE_URL!, "mvp8i-durable-replay-read"), refresh = readonlySource(meta.REFRESH_SOURCE_URL!, "mvp8i-refresh-read")
  const sources = [d4, failed, replay, refresh] as const
  const close = () => Promise.allSettled(sources.map((sql) => sql.end({ timeout: 5 })))
  try {
    await assertReadOnly(sources)
    const [sourceCorpusRows, sourceManifestRows, sourceMemberRows, sourceExposureRows] = await Promise.all([
      failed.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_corpus WHERE corpus_id=$1", [meta.FAILED_CANDIDATE_CROSSCHECK_ID]),
      failed.unsafe<Record<string, unknown>[]>("SELECT manifest_id,manifest_checksum FROM serving.serving_candidate_manifest WHERE corpus_id=$1", [meta.FAILED_CANDIDATE_CROSSCHECK_ID]),
      failed.unsafe<Record<string, unknown>[]>("SELECT member_kind,member_id,member_checksum,canonical_sort_key,inherited_source_corpus_id,schema_version,metadata FROM serving.serving_corpus_member WHERE corpus_id=$1 ORDER BY canonical_sort_key", [meta.FAILED_CANDIDATE_CROSSCHECK_ID]),
      failed.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_exposure"),
    ])
    const sourceCorpus = sourceCorpusRows[0], sourceMembers = sourceMemberRows.map(mapSourceMember)
    if (!sourceCorpus || String(sourceCorpus.lifecycle) !== "WITHHELD" || String(sourceCorpus.exposure) !== "INTERNAL_ONLY" || Number(sourceCorpus.projection_count) !== 62 || Number(sourceCorpus.evidence_summary_count) !== 6 || Number(sourceCorpus.replay_snapshot_count) !== 6 || !sourceManifestRows[0] || sourceMembers.length !== 74 || sourceExposureRows[0]?.count !== 0) throw new Error("MVP8I_FAILED_CANDIDATE_SOURCE_INVALID")
    const byKind = (kind: ServingCorpusMember["memberKind"]) => sourceMembers.filter((value) => value.memberKind === kind)
    const projectionMembers = byKind("PROJECTION"), evidenceMembers = byKind("EVIDENCE_SUMMARY"), replayMembers = byKind("REPLAY_SNAPSHOT")
    if (projectionMembers.length !== 62 || evidenceMembers.length !== 6 || replayMembers.length !== 6 || sourceMembers.some((value) => !["PROJECTION", "EVIDENCE_SUMMARY", "REPLAY_SNAPSHOT"].includes(value.memberKind))) throw new Error("MVP8I_FAILED_CANDIDATE_MEMBERSHIP_INVALID")

    const watermarkRows = await refresh.unsafe<Array<{ event_id: string; checksum: string; payload: unknown }>>("SELECT event_id,checksum,payload FROM refresh_control.refresh_event WHERE event_id=$1 AND entity_kind='mvp8e_common_watermark'", [meta.COMMON_WATERMARK_ID])
    if (watermarkRows.length !== 1 || !/^[0-9a-f]{64}$/.test(watermarkRows[0]!.checksum)) throw new Error("MVP8I_COMMON_WATERMARK_SOURCE_INVALID")
    const watermark = watermarkRows[0]!, payload = parseEventPayload(watermark.payload), through = String(payload.through ?? "")
    if (new Date(through).toISOString() !== through) throw new Error("MVP8I_COMMON_WATERMARK_PAYLOAD_MALFORMED")

    const projectionRows = await d4.unsafe<Record<string, unknown>[]>("SELECT p.*,p.structured_payload payload,p.lifecycle_state lifecycle,p.consumer_exposure_state exposure,p.created_at source_created_at,COALESCE((SELECT jsonb_agg(jsonb_build_object('dependencyType',d.dependency_type,'dependencyId',d.dependency_id,'dependencyVersion',NULLIF(d.dependency_version,''),'dependencyChecksum',d.dependency_checksum) ORDER BY d.dependency_type,d.dependency_id,d.dependency_version) FROM projection.mvp_projection_dependencies d WHERE d.projection_version_id=p.projection_version_id),'[]'::jsonb) dependencies FROM projection.mvp_projection_versions p WHERE p.event_time_end=$1 AND p.lifecycle_state='GENERATED' AND p.consumer_exposure_state='READY_FOR_CUTOVER' ORDER BY p.projection_version_id", [through])
    const projections = Object.freeze(projectionRows.map(mapServingProjectionPayload)), expectedProjection = new Map(projectionMembers.map((value) => [value.memberId, value.memberChecksum]))
    if (projections.length !== 62 || projections.some((value) => expectedProjection.get(value.projectionVersionId) !== value.projectionChecksum)) throw new Error("MVP8I_D4_PROJECTION_SOURCE_MISMATCH")

    const research = projections.filter((value) => value.projectionKind === "ResearchEvidenceProjection"), expectedEvidence = new Map(evidenceMembers.map((value) => [value.memberId, value.memberChecksum]))
    if (research.length !== 6) throw new Error("MVP8I_D4_EVIDENCE_SOURCE_COUNT_INVALID")
    for (const value of research) {
      const packetVersionId = String(value.structuredPayload.packetVersionId ?? ""), dependency = value.dependencies.find((item) => item.dependencyType === "EVIDENCE_PACKET" && item.dependencyVersion === packetVersionId)
      if (!packetVersionId || !dependency || dependency.dependencyChecksum !== expectedEvidence.get(packetVersionId)) throw new Error(`MVP8I_D4_EVIDENCE_SOURCE_MISMATCH:${value.subjectId}`)
    }
    const evidenceSummaries = Object.freeze(research.map(createServingEvidenceSummary))

    const replayCorpusRows = await replay.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_corpus WHERE corpus_id=$1", [meta.REPLAY_SOURCE_CORPUS_ID])
    const replayCorpus = replayCorpusRows[0]
    if (!replayCorpus || String(replayCorpus.corpus_version) !== "mvp-durable-replay-source/1.0.0" || String(replayCorpus.lifecycle) !== "WITHHELD" || String(replayCorpus.exposure) !== "INTERNAL_ONLY" || Number(replayCorpus.replay_snapshot_count) !== 6) throw new Error("MVP8I_DURABLE_REPLAY_CORPUS_INVALID")
    const replayRows = await replay.unsafe<Record<string, unknown>[]>("SELECT * FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1 ORDER BY instrument", [meta.REPLAY_SOURCE_CORPUS_ID])
    const replaySnapshots = Object.freeze(replayRows.map(mapServingReplayPayload)), expectedReplay = new Map(replayMembers.map((value) => [value.memberId.replace(/^mvp8e-replay:/, ""), value.memberChecksum]))
    if (replaySnapshots.length !== 6 || replaySnapshots.map((value) => value.instrument).sort().join(",") !== [...REQUIRED_SYMBOLS].sort().join(",") || replaySnapshots.some((value) => expectedReplay.get(value.sourceProjectionVersionId) !== value.modelChecksum)) throw new Error("MVP8I_DURABLE_REPLAY_SOURCE_MISMATCH")

    const eventReplayChecksums = payload.replayChecksums
    const expectedModelChecksums = replaySnapshots.map((value) => value.modelChecksum)
    if (new Date(through).toISOString() !== through || !Array.isArray(eventReplayChecksums) || eventReplayChecksums.length !== 6 || new Set(eventReplayChecksums).size !== 6 || [...eventReplayChecksums].sort().join(",") !== [...expectedModelChecksums].sort().join(",")) throw new Error("MVP8I_COMMON_WATERMARK_PAYLOAD_MISMATCH")

    const input = Object.freeze({ schemaVersion: MVP_INACTIVE_SERVING_STAGE_SCHEMA_VERSION, replaySourceCorpusId: meta.REPLAY_SOURCE_CORPUS_ID!, replaySourceCorpusChecksum: String(replayCorpus.serving_checksum), commonWatermarkId: watermark.event_id, commonWatermarkValue: through, commonWatermarkChecksum: watermark.checksum, projections, evidenceSummaries, replaySnapshots })
    prepareInactiveServingCandidate(input)
    return Object.freeze({ input, close })
  } catch (error) {
    await close()
    throw error
  }
}

async function migrate(meta: Meta) {
  validateTargetBindings(meta)
  const client = targetClient(meta, "TARGET_MIGRATION_URL", "MIGRATION_OWNER")
  try {
    await client.verify()
    const migrations = await new MvpServingMigrationRunner(client).apply("mvp8i-inactive-serving-staging")
    if (migrations.some((value) => value.status === "FAILED")) throw new Error(`MVP8I_MIGRATION_FAILED:${JSON.stringify(migrations)}`)
    return Object.freeze({ status: "MIGRATED", migrations })
  } finally { await client.shutdown() }
}

async function stage(meta: Meta) {
  const loaded = await loadStageInput(meta)
  let client: MvpServingPostgresClient | null = null
  try {
    client = targetClient(meta, "TARGET_PUBLISHER_URL", "PUBLISHER")
    await client.verify()
    const outcome = await stageInactiveServingCandidate(client, loaded.input)
    return Object.freeze({ status: outcome.status, candidateId: outcome.review.candidateId, servingChecksum: outcome.review.servingChecksum, manifestChecksum: outcome.review.manifestChecksum, memberSetChecksum: outcome.review.memberSetChecksum, counts: outcome.review.counts, lifecycle: outcome.review.lifecycle, exposure: outcome.review.exposure, exposureCount: outcome.review.exposureCount })
  } finally { await Promise.allSettled([loaded.close(), ...(client ? [client.shutdown()] : [])]) }
}

async function review(meta: Meta) {
  validateTargetBindings(meta)
  requireMeta(meta, ["CANDIDATE_ID"])
  const client = targetClient(meta, "TARGET_READER_URL", "READER")
  try {
    await client.verify()
    const selection = await new PostgresMvpInactiveServingReadPort(client).selectCandidate(meta.CANDIDATE_ID!)
    const [dashboard, scanner, trades, replays] = await Promise.all([
      selection.dashboard(),
      selection.scanner(),
      Promise.all(REQUIRED_SYMBOLS.map((symbol) => selection.tradeDecisionContext(symbol))),
      Promise.all(REQUIRED_SYMBOLS.map((symbol) => selection.replay(symbol))),
    ])
    if (trades.length !== 6 || replays.length !== 6) throw new Error("MVP8I_INTERNAL_FACADE_READBACK_INCOMPLETE")
    return Object.freeze({ status: "REVIEWED", candidateId: selection.review.candidateId, manifestChecksum: selection.review.manifestChecksum, memberSetChecksum: selection.review.memberSetChecksum, counts: selection.review.counts, lifecycle: selection.review.lifecycle, exposure: selection.review.exposure, exposureCount: selection.review.exposureCount, smoke: Object.freeze({ dashboardProjectionCount: dashboard.projections.length, scannerProjectionCount: scanner.projections.length, trades: trades.map((value, index) => [REQUIRED_SYMBOLS[index], value.projections.length]), replay: replays.map((value) => [value.snapshot.instrument, value.projections.length, value.snapshot.replaySnapshotId]) }) })
  } finally { await client.shutdown() }
}

async function main() {
  const meta = loadMeta(), command = process.argv[2] as Command
  if (command === "migrate") return process.stdout.write(JSON.stringify(await migrate(meta), null, 2))
  if (command === "stage") return process.stdout.write(JSON.stringify(await stage(meta), null, 2))
  if (command === "review") return process.stdout.write(JSON.stringify(await review(meta), null, 2))
  throw new Error("Usage: runMvpInactiveServingStaging.ts <migrate|stage|review>")
}

void main().catch((error: unknown) => { process.stderr.write(error instanceof Error ? error.message : "MVP8I_INACTIVE_SERVING_STAGING_FAILED"); process.exitCode = 1 })
