import { readFile } from "node:fs/promises"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { persistMvpEvidenceWindow, readMvpEvidenceWindows } from "@/lib/data-platform/consistency"
import { ConsistencyPostgresRuntime, MvpProjectionStore, loadMvpProjectionEvidenceInputs, persistBoundedMvpProjections, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"
import { createIntegratedBackfillClientsFromEnvironment } from "@/lib/data-platform/population/backfill"

let failures = 0
const check = (name: string, condition: boolean) => { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }
const environment = (): D4Environment => ({ D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL })
const runtime = (roleIntent: "CONSISTENCY_WORKER" | "EVIDENCE_ASSEMBLER" | "PROJECTION_BUILDER" | "READ_ONLY", applicationName: string) => new ConsistencyPostgresRuntime({ connectionString: environment().D4_ISOLATED_POSTGRES_URL!, roleIntent, maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, statementTimeoutMs: 30_000, applicationName, environment: environment() })

async function counts(reader: ConsistencyPostgresRuntime) {
  return (await reader.sql.unsafe<Array<{ results: number; packets: number; projections: number; replay: number }>>("SELECT (SELECT count(*)::int FROM consistency.immutable_results WHERE rule_set_id='MVP-MARKET-EVIDENCE') results,(SELECT count(*)::int FROM evidence.core_packet_identities WHERE topic='MVP_MARKET_STATE') packets,(SELECT count(*)::int FROM projection.mvp_projection_versions WHERE projection_kind=ANY($1)) projections,84::int replay", [["InstrumentMarketSummaryProjection","ResearchEvidenceProjection","SourceLineageSummaryProjection","ReplayTimelineProjection","EventAnnotationProjection","CoverageDataStatusProjection","ScannerCandidateProjection","DashboardMarketStateProjection","TradeDecisionContextProjection"]]))[0]!
}

async function main() {
  const corpus = JSON.parse(await readFile("docs/project/mvp-recent-market-corpus-manifest.json", "utf8")) as { corpusId: string; corpusChecksum: string }
  const objectRoot = process.env.D3_BACKFILL_OBJECT_ROOT
  if (!objectRoot) throw new Error("D3_BACKFILL_OBJECT_ROOT_REQUIRED")
  const clients = await createIntegratedBackfillClientsFromEnvironment({ repositoryRoot: process.cwd(), d2: { roleIntent: "READ_ONLY", maxConnections: 2, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "mvp-8a2c-d2" }, d3: { roleIntent: "READ_ONLY", maxConnections: 1, applicationName: "mvp-8a2c-d3" } })
  const worker = runtime("CONSISTENCY_WORKER", "mvp-8a2c-consistency"), assembler = runtime("EVIDENCE_ASSEMBLER", "mvp-8a2c-evidence"), reader = runtime("READ_ONLY", "mvp-8a2c-reader"), builder = runtime("PROJECTION_BUILDER", "mvp-8a2c-projection")
  await Promise.all([worker.connect(), assembler.connect(), reader.connect(), builder.connect()])
  try {
    const before = await counts(reader)
    check("certified baseline counts present", before.results === 420 && before.packets === 84 && before.projections === 868 && before.replay === 84)
    const start = "2026-07-11T00:00:00.000Z", end = "2026-07-12T00:00:00.000Z"
    const windows = await readMvpEvidenceWindows({ d2: clients.d2, objectRoot, eventTimeStart: start, eventTimeEnd: end, instruments: ["BTCUSDT"] })
    check("bounded loader returns only requested window", windows.length === 1 && windows[0]?.measurement.instrument === "BTCUSDT" && windows[0].measurement.eventTimeStart === start)
    const persisted = await persistMvpEvidenceWindow({ corpus, data: windows[0]!, worker, assembler })
    check("historical affected-window Evidence rerun is duplicate", persisted.status === "DUPLICATE" && persisted.packet !== null)
    const projectionInputs = await loadMvpProjectionEvidenceInputs({ corpus, d4: reader, d2: clients.d2, d3: clients.d3, objectRoot, eventTimeStart: start, eventTimeEnd: end, instruments: ["BTCUSDT"] })
    check("bounded Projection input loader returns one exact identity", projectionInputs.length === 1 && projectionInputs[0]?.assessment.instrument === "BTCUSDT")
    const projection = await persistBoundedMvpProjections({ evidence: projectionInputs[0]!, store: new MvpProjectionStore(builder), request: { instrument: "BTCUSDT", eventTimeStart: start, eventTimeEnd: end, evidenceIdentity: projectionInputs[0]!.packetVersionId, evidenceChecksum: projectionInputs[0]!.packetChecksum, requestedProjectionKinds: ["InstrumentMarketSummaryProjection"], modelVersion: "mvp-consumer-projection-generator/1.0.0", modelChecksum: canonicalChecksum({ model: "mvp-consumer-projection-generator/1.0.0" }), schemaVersion: "1.0.0" } })
    check("historical affected-window Projection rerun is duplicate", projection.status === "DUPLICATE" && projection.projections.length === 1)
    const after = await counts(reader)
    check("existing Result Evidence Projection and Replay counts unchanged", canonicalChecksum(before) === canonicalChecksum(after))
    if (failures) process.exitCode = 1
  } finally { await Promise.all([worker.shutdown(), assembler.shutdown(), reader.shutdown(), builder.shutdown()]); await clients.shutdown() }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
