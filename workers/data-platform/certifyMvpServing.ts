import postgres from "postgres"

import { createMvpServingClientFromEnvironment, discoverMvpServingMigrations, MvpServingMigrationRunner, PostgresMvpServingReadPort } from "@/lib/data-platform/mvp-serving"

async function denied(work: () => Promise<unknown>): Promise<boolean> { try { await work(); return false } catch { return true } }

async function truthDenied(role: "mvp_serving_reader" | "mvp_serving_publisher"): Promise<boolean> {
  const serving = process.env.MVP_SERVING_ISOLATED_POSTGRES_URL, truth = process.env.D4_ISOLATED_POSTGRES_URL
  if (!serving || !truth) throw new Error("SERVING_AND_D4_URLS_REQUIRED")
  const secret = decodeURIComponent(new URL(serving).password), target = new URL(truth)
  target.username = role; target.password = secret
  const sql = postgres(target.toString(), { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 5 })
  try { return await denied(() => sql.unsafe("SELECT count(*) FROM projection.mvp_projection_versions")) } finally { await sql.end({ timeout: 5 }).catch(() => undefined) }
}

async function main() {
  const publisherUrl = process.env.MVP_SERVING_ISOLATED_POSTGRES_URL
  if (!publisherUrl) throw new Error("MVP_SERVING_ISOLATED_POSTGRES_URL_REQUIRED")
  const publisher = createMvpServingClientFromEnvironment("MIGRATION_OWNER"); await publisher.verify()
  const checks: Array<[string, boolean]> = [], check = (name: string, pass: boolean) => checks.push([name, pass])
  try {
    const reapplied = await new MvpServingMigrationRunner(publisher).apply("mvp-7a-certification")
    check("migration reapplication skips", reapplied.length === 2 && reapplied.every((value) => value.status === "SKIPPED"))
    const artifacts = await discoverMvpServingMigrations()
    await publisher.sql.unsafe("UPDATE serving_control.migration_ledger SET migration_checksum=repeat('f',64) WHERE migration_id='001'")
    const drift = await new MvpServingMigrationRunner(publisher).apply("mvp-7a-certification")
    check("migration checksum mismatch fails closed", drift.length === 1 && drift[0]?.status === "FAILED")
    await publisher.sql.unsafe("UPDATE serving_control.migration_ledger SET migration_checksum=$1 WHERE migration_id='001'", [artifacts[0]!.checksum])
    check("publisher cannot read D4 truth", await truthDenied("mvp_serving_publisher"))
  } finally { await publisher.shutdown() }
  const readerUrl = new URL(publisherUrl); readerUrl.username = "mvp_serving_reader"
  process.env.MVP_SERVING_ISOLATED_POSTGRES_URL = readerUrl.toString()
  const reader = createMvpServingClientFromEnvironment("READER"); await reader.verify()
  try {
    const port = new PostgresMvpServingReadPort(reader), corpus = await port.activeCorpus(), health = await port.health(), inventory = await port.releaseInventory(), primary = await port.demoProfile("PRIMARY"), backup = await port.demoProfile("BACKUP")
    check("reader SELECT succeeds", Boolean(corpus && health.status === "HEALTHY"))
    check("all serving records readable", corpus?.projectionCount === 870 && corpus.evidenceSummaryCount === 84 && corpus.replaySnapshotCount === 84 && corpus.demoProfileCount === 2)
    check("release inventory excludes superseded conflict", inventory.length === 3 && inventory.filter((value) => value.dispositionReason === "EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT").length === 1)
    check("demo profiles readable", Boolean(primary && backup))
    check("reader INSERT denied", await denied(() => reader.sql.unsafe("INSERT INTO serving.serving_publication_event(publication_event_id,corpus_id,event_type,event_state,source_checksum,serving_checksum,record_counts,reason,created_at) SELECT 'probe',corpus_id,'VERIFIED','PROBE',source_corpus_checksum,serving_checksum,'{}'::jsonb,'PROBE',now() FROM serving.serving_corpus LIMIT 1")))
    check("reader UPDATE denied", await denied(() => reader.sql.unsafe("UPDATE serving.serving_corpus SET corpus_version=corpus_version")))
    check("reader DELETE denied", await denied(() => reader.sql.unsafe("DELETE FROM serving.serving_release_inventory")))
    check("reader DDL denied", await denied(() => reader.sql.unsafe("CREATE TABLE serving.reader_probe(id integer)")))
    check("reader cannot read D4 truth", await truthDenied("mvp_serving_reader"))
  } finally { await reader.shutdown(); process.env.MVP_SERVING_ISOLATED_POSTGRES_URL = publisherUrl }
  const failures = checks.filter(([, pass]) => !pass)
  console.log(JSON.stringify({ status: failures.length ? "FAIL" : "PASS", checks: checks.map(([name, pass]) => ({ name, pass })) }, null, 2))
  if (failures.length) process.exitCode = 1
}
void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_SERVING_CERTIFICATION_FAILED"); process.exitCode = 1 })
