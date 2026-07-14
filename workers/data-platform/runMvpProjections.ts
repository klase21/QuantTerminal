import { readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { createMvpMarketAssessment, readMvpEvidenceWindows } from "@/lib/data-platform/consistency"
import { ConsistencyMigrationRunner, ConsistencyPostgresRuntime, D2DependencyBootstrapRunner, MvpProjectionReadPort, MvpProjectionStore, seedMvpProjectionDefinitions, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"
import { generateMvpProjectionCorpus, MVP_PROJECTION_DEFINITIONS, verifyMvpProjection, type MvpProjectionEvidenceInput, type MvpProjectionKind } from "@/lib/data-platform/evidence-platform"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"

const CORPUS_MANIFEST_PATH = path.join(process.cwd(), "docs", "project", "mvp-recent-market-corpus-manifest.json")
const OUTPUT_PATH = path.join(process.cwd(), "docs", "project", "mvp-projection-corpus.json")
const FEATURE_INVENTORY_PATH = path.join(process.cwd(), "docs", "project", "mvp-page-feature-inventory.json")
const FEATURE_MATRIX_PATH = path.join(process.cwd(), "docs", "project", "mvp-page-data-matrix.json")
const READINESS_PATH = path.join(process.cwd(), "docs", "project", "mvp-page-projection-readiness.json")
type Command = "generate" | "recompute" | "status" | "inspect" | "verify"
interface CorpusManifest { readonly corpusId: string; readonly corpusChecksum: string }
interface FeatureInventory { readonly pages: readonly { readonly page: string; readonly features: readonly { readonly featureId: string; readonly section: string }[] }[] }
interface FeatureMatrix { readonly requirements: readonly { readonly featureId: string; readonly projection: MvpProjectionKind }[] }

async function writeReadiness(projectionCorpusId: string, projectionCorpusChecksum: string): Promise<void> {
  const inventory = JSON.parse(await readFile(FEATURE_INVENTORY_PATH, "utf8")) as FeatureInventory
  const matrix = JSON.parse(await readFile(FEATURE_MATRIX_PATH, "utf8")) as FeatureMatrix
  const requirements = new Map(matrix.requirements.map((value) => [value.featureId, value.projection]))
  const sourceBlocked = new Set(["RPL_LIQUIDATION"])
  const limited = new Set(["DASH_LIQUIDATION", "RPL_ORDERBOOK", "RPL_ANNOTATIONS", "RES_HISTORICAL", "MKT_LIVE_STRUCTURE", "MKT_ROTATION"])
  const notInScope = new Set(["DASH_SUSPENSE", "TRD_LOCAL"])
  const features = inventory.pages.flatMap((page) => page.features.map((feature) => {
    const projectionKind = requirements.get(feature.featureId)
    if (!projectionKind || !MVP_PROJECTION_DEFINITIONS.some((definition) => definition.projectionKind === projectionKind)) throw new Error(`MVP_PROJECTION_FEATURE_BINDING_INVALID:${feature.featureId}`)
    const readiness = sourceBlocked.has(feature.featureId) ? "SOURCE_BLOCKED" : notInScope.has(feature.featureId) ? "NOT_IN_MVP_SCOPE" : limited.has(feature.featureId) ? "PROJECTION_READY_WITH_LIMITATION" : "PROJECTION_READY"
    return { featureId: feature.featureId, page: page.page, feature: feature.section, projectionKind, readiness, limitationCodes: readiness === "SOURCE_BLOCKED" ? ["COMPLETE_LIQUIDATION_EVENT_HISTORY_BLOCKED"] : readiness === "PROJECTION_READY_WITH_LIMITATION" ? ["OPTIONAL_ENRICHMENT_UNAVAILABLE_OR_BOUNDED"] : readiness === "NOT_IN_MVP_SCOPE" ? ["PAGE_CUTOVER_OR_LOCAL_UI_STATE"] : [] }
  }))
  if (features.length !== 52 || new Set(features.map((value) => value.featureId)).size !== 52) throw new Error("MVP_PROJECTION_FEATURE_CARDINALITY_INVALID")
  const basis = { schemaVersion: "mvp-page-projection-readiness-basis/v1", projectionCorpusId, projectionCorpusChecksum, featureCount: features.length, features }
  const checksum = canonicalChecksum(basis)
  await writeFile(READINESS_PATH, `${JSON.stringify({ schemaVersion: "mvp-page-projection-readiness/v1", readinessChecksum: checksum, readinessEnum: ["PROJECTION_READY", "PROJECTION_READY_WITH_LIMITATION", "NOT_YET_PROJECTED", "SOURCE_BLOCKED", "NOT_IN_MVP_SCOPE"], basis }, null, 2)}\n`, "utf8")
}

function environment(): D4Environment { return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL } }
function runtime(roleIntent: "MIGRATION_OWNER" | "PROJECTION_BUILDER" | "READ_ONLY", name: string) {
  const env = environment()
  if (!env.D4_ISOLATED_POSTGRES_URL) throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED")
  return new ConsistencyPostgresRuntime({ connectionString: env.D4_ISOLATED_POSTGRES_URL, roleIntent, maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, statementTimeoutMs: 30_000, applicationName: name, environment: env })
}

async function applyAndSeed(): Promise<readonly string[]> {
  const owner = runtime("MIGRATION_OWNER", "mvp-projection-migration")
  await owner.connect()
  try {
    const dependencies = await new D2DependencyBootstrapRunner(owner).apply("mvp-3-d2-dependency-check")
    if (dependencies.some((item) => item.status === "FAILED")) throw new Error("MVP_PROJECTION_D2_DEPENDENCY_FAILED")
    const migrations = await new ConsistencyMigrationRunner(owner).apply("mvp-3-projection-runtime")
    if (migrations.some((item) => item.status === "FAILED")) throw new Error("MVP_PROJECTION_MIGRATION_FAILED")
    await seedMvpProjectionDefinitions(owner, MVP_PROJECTION_DEFINITIONS)
    return Object.freeze([...dependencies.map((item) => `D2-${item.sequence}:${item.status}`), ...migrations.map((item) => `D4-${item.migrationId}:${item.status}`)])
  } finally { await owner.shutdown() }
}

async function evidenceInputs(corpus: CorpusManifest, d4: ConsistencyPostgresRuntime): Promise<{ readonly inputs: readonly MvpProjectionEvidenceInput[]; readonly shutdown: () => Promise<void> }> {
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-projection-d2" }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp-projection-d3" } })
  try {
    const windows = await readMvpEvidenceWindows({ d2: clients.d2, objectRoot: process.env.D3_BACKFILL_OBJECT_ROOT! })
    const [stored, results, facts, coverage, prices] = await Promise.all([
      d4.sql.unsafe<Array<{ subject_id: string; event_time_start: Date; assessment_checksum: string; packet_version_id: string; packet_id: string; packet_checksum: string }>>("SELECT a.subject_id,a.event_time_start,a.assessment_checksum,a.packet_version_id,i.packet_id,v.packet_checksum FROM evidence.mvp_market_assessments a JOIN evidence.core_packet_versions v USING(packet_version_id) JOIN evidence.core_packet_identities i USING(packet_id) ORDER BY a.subject_id,a.event_time_start"),
      d4.sql.unsafe<Array<{ packet_version_id: string; result_id: string; result_checksum: string }>>("SELECT DISTINCT r.packet_version_id,r.result_id,i.result_checksum FROM evidence.core_packet_result_references r JOIN consistency.immutable_results i USING(result_id) ORDER BY r.packet_version_id,r.result_id"),
      d4.sql.unsafe<Array<{ packet_version_id: string; canonical_record_id: string; record_version: number; input_checksum: string; dataset_id: string; provider_id: string; publication_state: "PENDING" }>>("SELECT DISTINCT packet_version_id,canonical_record_id,record_version,input_checksum,dataset_id,provider_id,publication_state FROM evidence.core_packet_fact_references ORDER BY packet_version_id,dataset_id,canonical_record_id,record_version"),
      clients.d3.sql.unsafe<Array<{ decision_id: string; dataset_id: string; bounded_dimensions: Record<string, unknown>; eligibility_result: string }>>("SELECT decision_id,dataset_id,bounded_dimensions,eligibility_result FROM coverage.watermark_eligibility_decisions WHERE eligibility_result='ELIGIBLE' ORDER BY decision_id"),
      clients.d2.sql.unsafe<Array<{ symbol: string; utc_day: string; close: string }>>("SELECT symbol,to_char(open_time AT TIME ZONE 'UTC','YYYY-MM-DD') utc_day,close::text close FROM canonical.ohlcv WHERE open_time >= '2026-06-28T00:00:00Z' AND open_time < '2026-07-12T00:00:00Z' AND extract(hour from open_time AT TIME ZONE 'UTC')=23 AND extract(minute from open_time AT TIME ZONE 'UTC')=55 ORDER BY symbol,open_time"),
    ])
    const byWindow = new Map(stored.map((row) => [`${row.subject_id}:${new Date(row.event_time_start).toISOString()}`, row]))
    const inputs = windows.map((window): MvpProjectionEvidenceInput => {
      const assessment = createMvpMarketAssessment({ corpusId: corpus.corpusId, corpusChecksum: corpus.corpusChecksum, measurement: window.measurement })
      const persisted = byWindow.get(`${assessment.instrument}:${assessment.eventTimeStart}`)
      if (!persisted || persisted.assessment_checksum !== assessment.assessmentChecksum) throw new Error(`MVP_PROJECTION_EVIDENCE_BINDING_MISMATCH:${assessment.instrument}:${assessment.eventTimeStart}`)
      const date = assessment.eventTimeStart.slice(0, 10)
      const coverageDecisionIds = coverage.filter((row) => { const dimensions = JSON.stringify(row.bounded_dimensions); return dimensions.includes(assessment.instrument) && dimensions.includes(date) }).map((row) => row.decision_id)
      if (!coverageDecisionIds.length) throw new Error(`MVP_PROJECTION_COVERAGE_DEPENDENCY_MISSING:${assessment.instrument}:${date}`)
      const factReferences = facts.filter((row) => row.packet_version_id === persisted.packet_version_id)
      if (factReferences.some((row) => row.publication_state !== "PENDING")) throw new Error("MVP_PROJECTION_SOURCE_PUBLICATION_NOT_PENDING")
      const latestPrice = prices.find((row) => row.symbol === assessment.instrument && row.utc_day === date)?.close
      if (!latestPrice) throw new Error(`MVP_PROJECTION_LATEST_PRICE_MISSING:${assessment.instrument}:${date}`)
      return Object.freeze({ assessment, packetId: persisted.packet_id, packetVersionId: persisted.packet_version_id, packetChecksum: persisted.packet_checksum, resultReferences: Object.freeze(results.filter((row) => row.packet_version_id === persisted.packet_version_id).map((row) => Object.freeze({ resultId: row.result_id, checksum: row.result_checksum }))), factReferences: Object.freeze(factReferences.map((row) => Object.freeze({ id: row.canonical_record_id, version: String(row.record_version), checksum: row.input_checksum, datasetId: row.dataset_id, providerId: row.provider_id, publicationState: row.publication_state }))), coverageDecisionIds: Object.freeze(coverageDecisionIds), latestPrice })
    })
    if (inputs.length !== 84 || inputs.some((input) => input.resultReferences.length !== 5 || !input.factReferences.length)) throw new Error("MVP_PROJECTION_INPUT_CARDINALITY_INVALID")
    return { inputs: Object.freeze(inputs), shutdown: clients.shutdown }
  } catch (error) { await clients.shutdown(); throw error }
}

async function execute(command: "generate" | "recompute") {
  const corpus = JSON.parse(await readFile(CORPUS_MANIFEST_PATH, "utf8")) as CorpusManifest
  const migrations = await applyAndSeed()
  const reader = runtime("READ_ONLY", "mvp-projection-evidence-reader"), builder = runtime("PROJECTION_BUILDER", "mvp-projection-builder")
  await reader.connect(); await builder.connect()
  let source: Awaited<ReturnType<typeof evidenceInputs>> | null = null
  try {
    source = await evidenceInputs(corpus, reader)
    const projections = generateMvpProjectionCorpus(source.inputs)
    if (projections.length !== 868 || projections.some((value) => !verifyMvpProjection(value))) throw new Error(`MVP_PROJECTION_CORPUS_INVALID:${projections.length}`)
    const store = new MvpProjectionStore(builder), statuses: string[] = []
    for (let index = 0; index < projections.length; index += 1) {
      const outcome = await store.write(projections[index]!)
      if (outcome.status === "CONFLICT") throw new Error(`MVP_PROJECTION_CONFLICT:${projections[index]!.projectionVersionId}`)
      statuses.push(outcome.status)
      if ((index + 1) % 50 === 0 || index + 1 === projections.length) console.log(`[${index + 1}/${projections.length}] ${projections[index]!.projectionKind} ${outcome.status}`)
    }
    const counts = Object.fromEntries(MVP_PROJECTION_DEFINITIONS.map((definition) => [definition.projectionKind, projections.filter((value) => value.projectionKind === definition.projectionKind).length]))
    const basis = { schemaVersion: "mvp-projection-corpus-basis/v1", sourceCorpusId: corpus.corpusId, sourceCorpusChecksum: corpus.corpusChecksum, evidenceAssessmentCount: source.inputs.length, projectionDefinitions: MVP_PROJECTION_DEFINITIONS, projectionCounts: counts, totalProjectionCount: projections.length, certificationSlice: projections.filter((value) => value.eventTimeStart === "2026-07-11T00:00:00.000Z").map((value) => ({ projectionVersionId: value.projectionVersionId, projectionKind: value.projectionKind, subjectId: value.subjectId, checksum: value.projectionChecksum })), dependencyDigest: canonicalChecksum(projections.map((value) => ({ id: value.projectionVersionId, dependencies: value.dependencyDigest }))) }
    const projectionCorpusChecksum = canonicalChecksum(basis)
    const output = { schemaVersion: "mvp-projection-corpus/v1", projectionCorpusId: `mvp-projection-corpus:${projectionCorpusChecksum}`, projectionCorpusChecksum, basis, recomputation: { command, allDuplicate: statuses.every((status) => status === "DUPLICATE") }, publicationBoundary: { d2SourcePublication: "PENDING", d4Evidence: "INTERNALLY_PERSISTED", projectionLifecycle: "GENERATED", consumerExposure: "READY_FOR_CUTOVER", pageApiConsumer: "UNCHANGED" }, migrations }
    if (command === "generate") {
      await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8")
      await writeReadiness(output.projectionCorpusId, output.projectionCorpusChecksum)
    }
    else {
      const stored = JSON.parse(await readFile(OUTPUT_PATH, "utf8")) as { projectionCorpusChecksum: string }
      if (stored.projectionCorpusChecksum !== projectionCorpusChecksum || !output.recomputation.allDuplicate) throw new Error("MVP_PROJECTION_RECOMPUTE_MISMATCH")
    }
    console.log(JSON.stringify(output, null, 2))
  } finally { if (source) await source.shutdown(); await builder.shutdown(); await reader.shutdown() }
}

async function inspect(command: "status" | "inspect" | "verify") {
  const reader = runtime("READ_ONLY", `mvp-projection-${command}`); await reader.connect()
  try {
    const rows = await reader.sql.unsafe<Array<{ total: number; kinds: number; conflicts: number; visible: number; ready: number }>>("SELECT (SELECT count(*)::int FROM projection.mvp_projection_versions) total,(SELECT count(DISTINCT projection_kind)::int FROM projection.mvp_projection_versions) kinds,(SELECT count(*)::int FROM projection.mvp_projection_conflicts) conflicts,(SELECT count(*)::int FROM projection.mvp_projection_versions WHERE consumer_exposure_state='CONSUMER_VISIBLE') visible,(SELECT count(*)::int FROM projection.mvp_projection_versions WHERE consumer_exposure_state='READY_FOR_CUTOVER') ready")
    const counts = await reader.sql.unsafe<Array<{ projection_kind: MvpProjectionKind; count: number }>>("SELECT projection_kind,count(*)::int count FROM projection.mvp_projection_versions GROUP BY projection_kind ORDER BY projection_kind")
    const result = { command, ...rows[0], counts: Object.fromEntries(counts.map((row) => [row.projection_kind, row.count])), d2SourcePublication: "UNCHANGED_PENDING", pageApiConsumer: "UNCHANGED" }
    if (command === "inspect") {
      const port = new MvpProjectionReadPort(reader), latest = await port.latest("InstrumentMarketSummaryProjection", "BTCUSDT")
      console.log(JSON.stringify({ ...result, latest }, null, 2)); return
    }
    if (command === "verify") {
      if (result.total !== 868 || result.kinds !== 9 || result.conflicts !== 0 || result.visible !== 0 || result.ready !== 868) throw new Error(`MVP_PROJECTION_VERIFY_FAILED:${JSON.stringify(result)}`)
      const port = new MvpProjectionReadPort(reader)
      const [firstPage, secondPage] = await Promise.all([port.list({ limit: 100, offset: 0, exposure: "READY_FOR_CUTOVER" }), port.list({ limit: 100, offset: 100, exposure: "READY_FOR_CUTOVER" })])
      if (firstPage.length !== 100 || secondPage.length !== 100 || firstPage.some((value) => secondPage.some((other) => other.projectionVersionId === value.projectionVersionId))) throw new Error("MVP_PROJECTION_READ_PORT_PAGINATION_INVALID")
    }
    console.log(JSON.stringify(result, null, 2))
  } finally { await reader.shutdown() }
}

async function main() {
  const command = process.argv[2] as Command
  if (command === "generate" || command === "recompute") return execute(command)
  if (command === "status" || command === "inspect" || command === "verify") return inspect(command)
  throw new Error("Usage: runMvpProjections.ts <generate|recompute|status|inspect|verify>")
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_PROJECTION_FAILED"); process.exitCode = 1 })
