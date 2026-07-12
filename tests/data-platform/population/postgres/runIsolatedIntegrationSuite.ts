import { applyD3Migrations } from "@/lib/data-platform/population/postgres"
import { job, jobRequest, units, NOW } from "./fixtures"
import { createD3Harness, d3Url } from "./harness"

async function main(){
 if(!d3Url()){console.log("D3 ISOLATED POPULATION SUITE: BLOCKED");console.log("[BLOCKED] D3_ISOLATED_POSTGRES_URL is not configured.");process.exitCode=2;return}
 const h=await createD3Harness();const checks:Array<[string,boolean]>=[];const check=(n:string,p:boolean)=>checks.push([n,p])
 try{
  await h.resetAll();await h.migrateAll();await h.seed();const rerun=await applyD3Migrations(h.d3,"d3-rerun");check("migration rerun skips",rerun.every(x=>x.status==="SKIPPED"))
  const request=jobRequest();const created=await h.adapter.createJob(request);const duplicate=await h.adapter.createJob(request);check("job deduplication",created.status==="CREATED"&&duplicate.status==="DUPLICATE"&&created.jobId===duplicate.jobId)
  const rerunJob=await h.adapter.createJob(jobRequest("fixture-occurrence","manual-rerun-1"));check("intentional rerun distinct",rerunJob.status==="CREATED"&&rerunJob.jobId!==created.jobId)
  const run=await h.adapter.createRun(created.jobId,1,NOW);const expanded=units({...job(),jobId:created.jobId,request});const inserted=await h.adapter.expandUnits(expanded);const duplicateExpansion=await h.adapter.expandUnits(expanded);check("unit expansion idempotent",inserted===2&&duplicateExpansion===0)
  const claims=await Promise.all([h.adapter.claimUnit("worker-a",run.runId,NOW,"2026-07-12T00:10:00.000Z"),h.adapter.claimUnit("worker-b",run.runId,NOW,"2026-07-12T00:10:00.000Z")]);check("parallel workers claim different units",claims.filter(Boolean).length===2&&new Set(claims.map(x=>x?.unitId)).size===2)
  const first=claims[0]!;await h.adapter.heartbeat(first.unitId,first.leaseId,"worker-a",first.fencingToken,"2026-07-12T00:01:00.000Z","2026-07-12T00:11:00.000Z");let stale=false;try{await h.adapter.heartbeat(first.unitId,first.leaseId,"worker-a",first.fencingToken-1,"2026-07-12T00:02:00.000Z","2026-07-12T00:12:00.000Z")}catch{stale=true};check("stale heartbeat rejected",stale)
  check("resumable work excludes leased units",(await h.adapter.readResumableUnits(created.jobId)).length===0)
  const jobRecon=await h.adapter.reconcileJob(created.jobId);check("job reconciliation",jobRecon.consistent)
  const failures=checks.filter(([,p])=>!p);console.log(`D3 ISOLATED POPULATION SUITE: ${failures.length?"FAIL":"PASS"}`);for(const [n,p]of checks)console.log(`[${p?"PASS":"FAIL"}] ${n}`);if(failures.length)process.exitCode=1
 }finally{try{await h.resetAll()}finally{await h.shutdown()}}
}
void main().catch((error:unknown)=>{console.error(error);process.exitCode=1})
