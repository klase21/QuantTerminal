import { readFile } from "node:fs/promises"
import path from "node:path"

import { ConsistencyMigrationRunner, ConsistencyPostgresRuntime, createMvpProjectionExposureDecision, MvpProjectionExposureStore, readLatestMvpProjectionExposure, reconcileMvpProjectionExposureDecisions, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"

type Command = "cutover" | "rollback" | "status" | "verify"
interface Corpus { readonly projectionCorpusId: string; readonly projectionCorpusChecksum: string }
const CORPUS_PATH = path.join(process.cwd(), "docs", "project", "mvp-projection-corpus.json")
function environment(): D4Environment { return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL } }
function runtime(roleIntent: "MIGRATION_OWNER" | "PROJECTION_PUBLISHER" | "READ_ONLY", name: string) { const env = environment(); if (!env.D4_ISOLATED_POSTGRES_URL) throw new Error("D4_ISOLATED_POSTGRES_URL_REQUIRED"); return new ConsistencyPostgresRuntime({ connectionString: env.D4_ISOLATED_POSTGRES_URL, roleIntent, maxConnections: 1, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, statementTimeoutMs: 30_000, applicationName: name, environment: env }) }

async function applyMigration() { const owner = runtime("MIGRATION_OWNER", "mvp-cutover-migration"); await owner.connect(); try { const result = await new ConsistencyMigrationRunner(owner).apply("mvp-4-cutover"); if (result.some((item) => item.status === "FAILED")) throw new Error("MVP_CUTOVER_MIGRATION_FAILED") } finally { await owner.shutdown() } }

async function main() {
  const command = process.argv[2] as Command
  if (!(["cutover", "rollback", "status", "verify"] as const).includes(command)) throw new Error("Usage: runMvpProjectionCutover.ts <cutover|rollback|status|verify>")
  const corpus = JSON.parse(await readFile(CORPUS_PATH, "utf8")) as Corpus
  if (command === "cutover" || command === "rollback") await applyMigration()
  const role = command === "cutover" || command === "rollback" ? "PROJECTION_PUBLISHER" : "READ_ONLY"
  const db = runtime(role, `mvp-cutover-${command}`); await db.connect()
  try {
    const reconciliation = role === "PROJECTION_PUBLISHER" ? await reconcileMvpProjectionExposureDecisions(db) : null
    let latest = null
    let rawPreviousDecisionId: string | null = null
    try { latest = await readLatestMvpProjectionExposure(db, corpus.projectionCorpusId) }
    catch (error) {
      if (command === "status" || command === "verify") throw error
      const rows = await db.sql.unsafe<Array<{ decision_id: string }>>("SELECT decision_id FROM projection.mvp_consumer_exposure_decisions WHERE projection_corpus_id=$1 ORDER BY created_at DESC,decision_id DESC LIMIT 1", [corpus.projectionCorpusId])
      rawPreviousDecisionId = rows[0]?.decision_id ?? null
    }
    let writeStatus: string | null = null
    if (command === "cutover" || command === "rollback") {
      const action = command === "cutover" ? "CUTOVER" as const : "ROLLBACK" as const
      if (latest?.action !== action) {
        const decision = createMvpProjectionExposureDecision({ projectionCorpusId: corpus.projectionCorpusId, projectionCorpusChecksum: corpus.projectionCorpusChecksum, action, previousDecisionId: latest?.decisionId ?? rawPreviousDecisionId, reasonCode: action === "CUTOVER" ? "MVP4_BOUNDED_PAGE_CUTOVER_VERIFIED" : "MVP4_EXPLICIT_OPERATOR_ROLLBACK", actorId: "mvp-4-cutover-worker", createdAt: new Date().toISOString() })
        writeStatus = await new MvpProjectionExposureStore(db).write(decision)
        latest = await readLatestMvpProjectionExposure(db, corpus.projectionCorpusId)
      } else writeStatus = "ALREADY_CURRENT"
    }
    if (command === "verify" && (!latest || latest.projectionCorpusChecksum !== corpus.projectionCorpusChecksum || latest.effectiveExposure !== "CONSUMER_VISIBLE")) throw new Error("MVP_CUTOVER_VERIFY_FAILED")
    console.log(JSON.stringify({ command, writeStatus, reconciliation, decision: latest, d2SourcePublication: "UNCHANGED_PENDING", projectionPayloads: "UNCHANGED", pageApiConsumer: latest?.effectiveExposure === "CONSUMER_VISIBLE" ? "PROJECTION_BACKED" : "ROLLBACK_ONLY" }, null, 2))
  } finally { await db.shutdown() }
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_CUTOVER_FAILED"); process.exitCode = 1 })
