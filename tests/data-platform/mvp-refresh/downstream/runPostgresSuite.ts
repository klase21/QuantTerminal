import { canonicalChecksum } from "@/lib/data-platform/contracts"
import { LocalInactiveCandidateAssemblyService, MvpServingMigrationRunner, createMvpServingClientFromEnvironment, type ServingCorpusMember } from "@/lib/data-platform/mvp-serving"

let failures = 0
const check = (name: string, condition: boolean) => { console.log(`${condition ? "PASS" : "FAIL"} ${name}`); if (!condition) failures += 1 }

async function main() {
  const owner = createMvpServingClientFromEnvironment("MIGRATION_OWNER")
  const client = createMvpServingClientFromEnvironment("PUBLISHER")
  try {
    await owner.verify(); await client.verify()
    const migrations = await new MvpServingMigrationRunner(owner).apply("mvp-8a2c-integration")
    check("serving migrations reapply idempotently", migrations.length === 3 && migrations.every((value) => value.status === "SKIPPED"))
    const schema = await client.sql.unsafe<Array<{ relations: number; indexes: number; immutable_triggers: number }>>("SELECT (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='serving' AND table_name=ANY(ARRAY['serving_corpus_member','serving_candidate_manifest'])) relations,(SELECT count(*)::int FROM pg_indexes WHERE schemaname='serving' AND indexname='serving_corpus_member_kind_idx') indexes,(SELECT count(*)::int FROM pg_trigger WHERE tgname=ANY(ARRAY['serving_corpus_member_immutable','serving_candidate_manifest_immutable']) AND NOT tgisinternal) immutable_triggers")
    check("candidate membership relations, index, and triggers exist", schema[0]?.relations === 2 && schema[0].indexes === 1 && schema[0].immutable_triggers === 2)

    const service = new LocalInactiveCandidateAssemblyService(client)
    const active = await service.activeBaseline()
    const exposureBefore = await client.sql.unsafe<Array<{ count: number; corpus_id: string }>>("SELECT count(*)::int count,max(corpus_id) corpus_id FROM serving.serving_exposure WHERE exposure_state='CONSUMER_VISIBLE'")
    const manifestMember: ServingCorpusMember = Object.freeze({ memberKind: "RELEASE_MANIFEST", memberId: "fixture:manifest", memberChecksum: canonicalChecksum({ fixture: "manifest" }), canonicalSortKey: "RELEASE_MANIFEST:fixture:manifest", inheritedSourceCorpusId: active.corpusId, schemaVersion: "fixture/1", metadata: Object.freeze({ certificationFixture: true }) })
    for (const point of ["HEADER", "MEMBERS", "MANIFEST"] as const) {
      const corpusId = `fixture:candidate:${point.toLowerCase()}:${canonicalChecksum({ point }).slice(0, 16)}`
      let rejected = false
      try {
        await service.assemble({ candidate: { corpusId, sourceCorpusId: active.corpusId, sourceCorpusChecksum: active.servingChecksum, governedThrough: "2026-07-16T00:00:00.000Z", schemaVersion: "mvp-serving/1.0.0", generatedAt: "2026-07-16T04:00:00.000Z", members: [...active.members, manifestMember], limitations: [] }, expectedActiveCorpusId: active.corpusId, expectedActiveChecksum: active.servingChecksum, injectFailureAfter: point })
      } catch (error) { rejected = error instanceof Error && error.message === `INJECTED_CANDIDATE_FAILURE_${point}`; if (!rejected) console.log(`SAFE_DIAGNOSTIC ${point} ${error instanceof Error ? error.message : "UNKNOWN"}`) }
      const retained = await client.sql.unsafe<Array<{ corpora: number; members: number; manifests: number }>>("SELECT (SELECT count(*)::int FROM serving.serving_corpus WHERE corpus_id=$1) corpora,(SELECT count(*)::int FROM serving.serving_corpus_member WHERE corpus_id=$1) members,(SELECT count(*)::int FROM serving.serving_candidate_manifest WHERE corpus_id=$1) manifests", [corpusId])
      check(`atomic rollback after ${point.toLowerCase()}`, rejected && retained[0]?.corpora === 0 && retained[0].members === 0 && retained[0].manifests === 0)
    }
    const exposureAfter = await client.sql.unsafe<Array<{ count: number; corpus_id: string }>>("SELECT count(*)::int count,max(corpus_id) corpus_id FROM serving.serving_exposure WHERE exposure_state='CONSUMER_VISIBLE'")
    check("candidate failures leave exposure unchanged", canonicalChecksum(exposureBefore[0]) === canonicalChecksum(exposureAfter[0]))

    let immutableRejected = false
    try {
      await client.transaction(async (sql) => {
        const corpusId = `fixture:immutable:${canonicalChecksum({ fixture: "immutable" }).slice(0, 16)}`
        const servingChecksum = canonicalChecksum({ fixture: "immutable-corpus" })
        await sql.unsafe("INSERT INTO serving.serving_corpus VALUES($1,'fixture',$2,$3,$4,'mvp-serving/1.0.0',$5,$6,'WITHHELD','INTERNAL_ONLY',0,0,0,0,0,0)", [corpusId,active.corpusId,active.servingChecksum,servingChecksum,"2026-07-16T04:00:00.000Z","2026-07-16T00:00:00.000Z"])
        await sql.unsafe("INSERT INTO serving.serving_corpus_member VALUES($1,'RELEASE_MANIFEST','fixture:immutable-member',$2,'RELEASE_MANIFEST:fixture:immutable-member',$3,'fixture/1','{}'::jsonb,$4)", [corpusId,canonicalChecksum({ fixture: "member" }),active.corpusId,"2026-07-16T04:00:00.000Z"])
        await sql.unsafe("UPDATE serving.serving_corpus_member SET schema_version='fixture/2' WHERE corpus_id=$1", [corpusId])
      })
    } catch (error) { immutableRejected = String((error as { message?: string }).message).includes("SERVING_RECORD_IMMUTABLE") }
    check("membership UPDATE is rejected and rolled back", immutableRejected)
    const fixtureRows = await client.sql.unsafe<Array<{ count: number }>>("SELECT count(*)::int count FROM serving.serving_corpus WHERE corpus_id LIKE 'fixture:%'")
    check("integration suite retains no fixture candidate", fixtureRows[0]?.count === 0)
    if (failures) process.exitCode = 1
  } finally { await client.shutdown(); await owner.shutdown() }
}

void main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1 })
