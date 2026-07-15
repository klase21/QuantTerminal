import { readFile } from "node:fs/promises"
import path from "node:path"

import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { bootstrapManagedServingRoles, buildMvpServingPublication, MvpServingMigrationRunner, MvpServingStore, PostgresMvpServingReadPort } from "@/lib/data-platform/mvp-serving"

async function denied(work: () => Promise<unknown>): Promise<boolean> { try { await work(); return false } catch { return true } }

async function main() {
  if (process.argv[2] !== "publish-and-certify") throw new Error("Usage: runMvpServingNeon.ts publish-and-certify")
  const roles = await bootstrapManagedServingRoles()
  try {
    const migrations = await new MvpServingMigrationRunner(roles.migrationOwner).apply("mvp-7b-neon-serving")
    if (migrations.some((value) => value.status === "FAILED")) throw new Error(`MVP_SERVING_NEON_MIGRATION_FAILED:${JSON.stringify(migrations)}`)
    const publication = await buildMvpServingPublication((message) => console.log(message))
    const store = new MvpServingStore(roles.publisher), first = await store.publish(publication), duplicate = await store.publish(publication)
    if (duplicate !== "DUPLICATE") throw new Error("MVP_SERVING_NEON_DUPLICATE_CERTIFICATION_FAILED")
    const port = new PostgresMvpServingReadPort(roles.reader), health = await port.health(), corpus = await port.activeCorpus(), exposure = await port.activeExposure(), inventory = await port.releaseInventory(), primary = await port.demoProfile("PRIMARY"), backup = await port.demoProfile("BACKUP")
    if (!corpus || health.status !== "HEALTHY" || !exposure || !primary || !backup) throw new Error("MVP_SERVING_NEON_HEALTH_FAILED")
    const [databaseSize, relations, snapshots, events, roleAttributes] = await Promise.all([
      roles.reader.sql.unsafe<Array<{ bytes: string }>>("SELECT pg_database_size(current_database())::bigint::text bytes"),
      roles.reader.sql.unsafe<Array<{ table_name: string; heap_bytes: string; table_bytes: string; index_bytes: string; total_bytes: string }>>("SELECT c.relname table_name,pg_relation_size(c.oid)::bigint::text heap_bytes,pg_table_size(c.oid)::bigint::text table_bytes,pg_indexes_size(c.oid)::bigint::text index_bytes,pg_total_relation_size(c.oid)::bigint::text total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('serving','serving_control') AND c.relkind='r' ORDER BY c.relname"),
      roles.reader.sql.unsafe<Array<{ total: number; price_min: number; price_max: number; oi_min: number; oi_max: number; funding_min: number; funding_max: number; flow_min: number; flow_max: number; model_checksum_count: number }>>("SELECT count(*)::int total,min(price_sample_count)::int price_min,max(price_sample_count)::int price_max,min(open_interest_sample_count)::int oi_min,max(open_interest_sample_count)::int oi_max,min(funding_sample_count)::int funding_min,max(funding_sample_count)::int funding_max,min(flow_bucket_count)::int flow_min,max(flow_bucket_count)::int flow_max,count(DISTINCT model_checksum)::int model_checksum_count FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1", [corpus.corpusId]),
      roles.reader.sql.unsafe<Array<{ event_type: string; count: number }>>("SELECT event_type,count(*)::int count FROM serving.serving_publication_event WHERE corpus_id=$1 GROUP BY event_type ORDER BY event_type", [corpus.corpusId]),
      roles.reader.sql.unsafe<Array<{ role: string; can_create_db: boolean; can_create_role: boolean; is_superuser: boolean }>>("SELECT rolname role,rolcreatedb can_create_db,rolcreaterole can_create_role,rolsuper is_superuser FROM pg_roles WHERE rolname=current_user"),
    ])
    const snapshot = snapshots[0], excluded = inventory.filter((value) => value.dispositionReason === "EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT")
    if (corpus.projectionCount !== 870 || corpus.evidenceSummaryCount !== 84 || corpus.replaySnapshotCount !== 84 || corpus.demoProfileCount !== 2 || inventory.length !== 3 || excluded.length !== 1 || snapshot?.total !== 84 || snapshot.price_min !== 288 || snapshot.price_max !== 288 || snapshot.oi_min !== 288 || snapshot.oi_max !== 288 || snapshot.funding_min !== 3 || snapshot.funding_max !== 3 || snapshot.flow_min !== 48 || snapshot.flow_max !== 48 || snapshot.model_checksum_count !== 84) throw new Error("MVP_SERVING_NEON_COUNT_CERTIFICATION_FAILED")
    const mutationDenial = {
      insert: await denied(() => roles.reader.sql.unsafe("INSERT INTO serving.serving_release_inventory(inventory_id,source_projection_version_id,projection_kind,subject_id,source_checksum,checksum_valid,lifecycle,exposure,eligibility,disposition,disposition_reason,serving_corpus_id,created_at) VALUES('probe','probe','probe','probe',repeat('0',64),false,'INVALID','INTERNAL_ONLY','INELIGIBLE','EXCLUDED','PROBE',$1,now())", [corpus.corpusId])),
      update: await denied(() => roles.reader.sql.unsafe("UPDATE serving.serving_corpus SET corpus_version=corpus_version")),
      delete: await denied(() => roles.reader.sql.unsafe("DELETE FROM serving.serving_release_inventory")),
      ddl: await denied(() => roles.reader.sql.unsafe("CREATE TABLE serving.reader_probe(id integer)")),
    }
    if (Object.values(mutationDenial).some((value) => !value) || roleAttributes[0]?.can_create_db || roleAttributes[0]?.can_create_role || roleAttributes[0]?.is_superuser) throw new Error("MVP_SERVING_NEON_READER_ROLE_CERTIFICATION_FAILED")
    const fallbackPath = path.join(process.cwd(), "lib", "data-platform", "mvp-serving", "generated", "certifiedSnapshot.json"), fallbackText = await readFile(fallbackPath, "utf8"), fallback = JSON.parse(fallbackText) as { bundleChecksum: string }
    const { bundleChecksum, ...fallbackBasis } = JSON.parse(fallbackText) as Record<string, unknown>
    if (canonicalChecksum(fallbackBasis) !== bundleChecksum) throw new Error("MVP_SERVING_NEON_FALLBACK_CHECKSUM_FAILED")
    console.log(JSON.stringify({ command: "publish-and-certify", publication: { first, duplicate }, migrations, corpus, exposure, health, counts: { projections: corpus.projectionCount, evidenceSummaries: corpus.evidenceSummaryCount, replaySnapshots: corpus.replaySnapshotCount, demoProfiles: corpus.demoProfileCount, releaseInventory: corpus.releaseInventoryCount }, replayCertification: snapshot, releaseInventory: inventory, profiles: { primary: true, backup: true }, roles: { publisherVerified: true, readerVerified: true, readerAttributes: roleAttributes[0], mutationDenial }, capacity: { databaseBytes: Number(databaseSize[0]?.bytes ?? 0), relationBytes: relations }, fallback: { bytes: Buffer.byteLength(fallbackText), checksum: fallback.bundleChecksum, verified: true } }, null, 2))
  } finally { await Promise.allSettled([roles.migrationOwner.shutdown(), roles.publisher.shutdown(), roles.reader.shutdown()]) }
}

void main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "MVP_SERVING_NEON_PUBLICATION_FAILED"); process.exitCode = 1 })
