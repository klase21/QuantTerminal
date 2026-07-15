import { MvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections"
import { bootstrapManagedServingRoles, createServingProjectionSource, MvpServingMigrationRunner, PostgresMvpServingReadPort } from "@/lib/data-platform/mvp-serving"

async function main() {
  const roles = await bootstrapManagedServingRoles()
  try {
    const migrations = await new MvpServingMigrationRunner(roles.migrationOwner).apply("mvp-7b-neon-reverification")
    if (migrations.length !== 2 || migrations.some((value) => value.status !== "SKIPPED")) throw new Error(`MVP_SERVING_NEON_MIGRATION_REAPPLICATION_FAILED:${JSON.stringify(migrations)}`)
    const port = new PostgresMvpServingReadPort(roles.reader), corpus = await port.activeCorpus()
    if (!corpus) throw new Error("SERVING_CORPUS_UNAVAILABLE")
    const facade = new MvpConsumerProjectionFacade(createServingProjectionSource(port, corpus), { id: corpus.corpusId, checksum: corpus.servingChecksum }), primary = await port.demoProfile("PRIMARY"), backup = await port.demoProfile("BACKUP")
    if (!primary || !backup) throw new Error("SERVING_DEMO_PROFILE_MISSING")
    const views = {
      dashboard: await facade.read({ view: "dashboard" }),
      markets: await facade.read({ view: "markets" }),
      scanner: await facade.read({ view: "scanner" }),
      trade: await facade.read({ view: "trade", instrument: "BTCUSDT" }),
      research: await facade.read({ view: "research", instrument: primary.instrument as "BTCUSDT", start: primary.eventTimeStart, end: primary.eventTimeEnd, projectionVersionId: primary.researchIdentity }),
      replay: await facade.read({ view: "replay", instrument: primary.instrument as "BTCUSDT", start: primary.eventTimeStart, end: primary.eventTimeEnd, projectionVersionId: primary.replayIdentity }),
    }
    const primaryReplay = await port.replaySnapshot({ sourceProjectionVersionId: primary.replayIdentity }), backupReplay = await port.replaySnapshot({ sourceProjectionVersionId: backup.replayIdentity }), evidence = await port.evidenceSummary(primary.evidenceIdentity), health = await port.health()
    if (!primaryReplay || !backupReplay || !evidence || health.status !== "HEALTHY" || Object.values(views).some((value) => value.status !== "AVAILABLE")) throw new Error("MVP_SERVING_NEON_RUNTIME_REVERIFICATION_FAILED")
    console.log(JSON.stringify({ status: "PASS", migrations, corpusId: corpus.corpusId, servingChecksum: corpus.servingChecksum, views: Object.fromEntries(Object.entries(views).map(([key, value]) => [key, { status: value.status, projectionCount: value.projections.length }])), profiles: { primary: true, backup: true }, replay: { primaryChecksum: primaryReplay.modelChecksum, backupChecksum: backupReplay.modelChecksum }, evidenceSummary: { present: true, checksum: evidence.summaryChecksum }, health }, null, 2))
  } finally { await Promise.allSettled([roles.migrationOwner.shutdown(), roles.publisher.shutdown(), roles.reader.shutdown()]) }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_SERVING_NEON_REVERIFICATION_FAILED"); process.exitCode = 1 })
