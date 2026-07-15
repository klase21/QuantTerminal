import { stat } from "node:fs/promises"

import { createMvpServingClientFromEnvironment, MvpServingMigrationRunner, MvpServingStore, PostgresMvpServingReadPort, buildMvpServingPublication, writeCertifiedSnapshotBundle } from "@/lib/data-platform/mvp-serving"

type Command = "migrate" | "publish" | "verify" | "status" | "reset" | "checksum"

async function migrate() {
  const client=createMvpServingClientFromEnvironment("MIGRATION_OWNER");await client.verify()
  try { const result=await new MvpServingMigrationRunner(client).apply("mvp-7a-local-serving"); if(result.some((value)=>value.status==="FAILED"))throw new Error(`MVP_SERVING_MIGRATION_FAILED:${JSON.stringify(result)}`); return result } finally { await client.shutdown() }
}

async function publish() {
  await migrate()
  const publication=await buildMvpServingPublication((message)=>console.log(message))
  const client=createMvpServingClientFromEnvironment("PUBLISHER");await client.verify()
  try { const outcome=await new MvpServingStore(client).publish(publication),fallback=await writeCertifiedSnapshotBundle(publication);console.log(JSON.stringify({command:"publish",outcome,corpus:publication.corpus,counts:{projections:publication.projections.length,evidenceSummaries:publication.evidenceSummaries.length,replaySnapshots:publication.replaySnapshots.length,demoProfiles:publication.demoProfiles.length,releaseInventory:publication.releaseInventory.length},fallback},null,2)) } finally { await client.shutdown() }
}

async function inspect(command:"verify"|"status"|"checksum") {
  const url=process.env.MVP_SERVING_ISOLATED_POSTGRES_URL
  if(!url)throw new Error("MVP_SERVING_ISOLATED_POSTGRES_URL_REQUIRED")
  const role=new URL(url).username==="mvp_serving_reader"?"READER":"PUBLISHER",client=createMvpServingClientFromEnvironment(role);await client.verify()
  try {
    const port=new PostgresMvpServingReadPort(client),health=await port.health(),corpus=await port.activeCorpus(),inventory=await port.releaseInventory(),primary=await port.demoProfile("PRIMARY"),backup=await port.demoProfile("BACKUP")
    if(!corpus)throw new Error("SERVING_CORPUS_UNAVAILABLE")
    const [dbSize,relations,events]=await Promise.all([
      client.sql.unsafe<Array<{bytes:string}>>("SELECT pg_database_size(current_database())::bigint::text bytes"),
      client.sql.unsafe<Array<{table_name:string;heap_bytes:string;index_bytes:string;total_bytes:string}>>("SELECT c.relname table_name,pg_relation_size(c.oid)::bigint::text heap_bytes,pg_indexes_size(c.oid)::bigint::text index_bytes,pg_total_relation_size(c.oid)::bigint::text total_bytes FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('serving','serving_control') AND c.relkind IN ('r','p') ORDER BY c.relname"),
      client.sql.unsafe<Array<{event_type:string;count:number}>>("SELECT event_type,count(*)::int count FROM serving.serving_publication_event WHERE corpus_id=$1 GROUP BY event_type ORDER BY event_type",[corpus.corpusId]),
    ])
    const fallbackInfo=await stat((await import("@/lib/data-platform/mvp-serving")).FALLBACK_PATH).catch(()=>null)
    const result={command,health,corpus,inventory,profiles:{primary:Boolean(primary),backup:Boolean(backup)},publicationEvents:events,databaseBytes:Number(dbSize[0]?.bytes??0),relations,fallbackBytes:fallbackInfo?.size??null}
    if(command==="verify") {
      const excluded=inventory.filter((value)=>value.disposition==="EXCLUDED"&&value.dispositionReason==="EXCLUDED_SUPERSEDED_IMMUTABLE_CONFLICT")
      const snapshots=await client.sql.unsafe<Array<{total:number;price_min:number;price_max:number;oi_min:number;oi_max:number;funding_min:number;funding_max:number;flow_min:number;flow_max:number}>>("SELECT count(*)::int total,min(price_sample_count)::int price_min,max(price_sample_count)::int price_max,min(open_interest_sample_count)::int oi_min,max(open_interest_sample_count)::int oi_max,min(funding_sample_count)::int funding_min,max(funding_sample_count)::int funding_max,min(flow_bucket_count)::int flow_min,max(flow_bucket_count)::int flow_max FROM serving.serving_replay_sequence WHERE serving_corpus_id=$1",[corpus.corpusId])
      if(health.status!=="HEALTHY"||corpus.projectionCount!==870||corpus.evidenceSummaryCount!==84||corpus.replaySnapshotCount!==84||corpus.demoProfileCount!==2||inventory.length!==3||excluded.length!==1||!primary||!backup||snapshots[0]?.total!==84||snapshots[0]?.price_min!==288||snapshots[0]?.price_max!==288||snapshots[0]?.oi_min!==288||snapshots[0]?.oi_max!==288||snapshots[0]?.funding_min!==3||snapshots[0]?.funding_max!==3||snapshots[0]?.flow_min!==48||snapshots[0]?.flow_max!==48)throw new Error(`MVP_SERVING_VERIFY_FAILED:${JSON.stringify({health,corpus,inventory,snapshots})}`)
    }
    console.log(JSON.stringify(result,null,2))
  } finally { await client.shutdown() }
}

async function reset() {
  if(process.argv[3]!=="--confirm-isolated")throw new Error("MVP_SERVING_RESET_CONFIRMATION_REQUIRED")
  const client=createMvpServingClientFromEnvironment("MIGRATION_OWNER");await client.verify()
  try { await client.sql.unsafe("DROP SCHEMA IF EXISTS serving CASCADE");await client.sql.unsafe("DROP SCHEMA IF EXISTS serving_control CASCADE");console.log(JSON.stringify({command:"reset",status:"RESET",database:"quantterminal_mvp_serving_isolated"})) } finally { await client.shutdown() }
}

async function main(){const command=process.argv[2] as Command;if(command==="migrate"){console.log(JSON.stringify({command,result:await migrate()},null,2));return}if(command==="publish")return publish();if(command==="verify"||command==="status"||command==="checksum")return inspect(command);if(command==="reset")return reset();throw new Error("Usage: runMvpServing.ts <migrate|publish|verify|status|checksum|reset --confirm-isolated>")}
void main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:"MVP_SERVING_COMMAND_FAILED");process.exitCode=1})
