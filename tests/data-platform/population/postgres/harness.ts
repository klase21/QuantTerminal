import { applyApprovedMigrations, applyIsolatedRoleBlueprint, createCanonicalPersistenceAdapter, createIsolatedPostgresClient, resetIsolatedSchemas } from "@/lib/data-platform/persistence/postgres"
import { applyD3Migrations, createD3PostgresClient, createPopulationPostgresAdapter, requireD3Target, resetD3Schemas } from "@/lib/data-platform/population/postgres"
import { certificationSnapshot, policyVersion, providerSnapshot, registrySnapshot } from "@/tests/data-platform/persistence/postgres/fixtures"

export function d3Url(){return process.env.D3_ISOLATED_POSTGRES_URL?.trim()||null}
export async function createD3Harness(){
  const url=d3Url(); if(!url) throw new Error("D3_ISOLATED_POSTGRES_URL is not configured"); requireD3Target(url,process.env.DATABASE_URL,process.env.D2_ISOLATED_POSTGRES_URL)
  const d2=createIsolatedPostgresClient({connectionString:url,roleIntent:"MIGRATION_OWNER",maxConnections:4,connectTimeoutSeconds:10,idleTimeoutSeconds:30,applicationName:"d3-d2-bootstrap"})
  const d3=createD3PostgresClient({connectionString:url,roleIntent:"MIGRATION_OWNER",maxConnections:6,applicationName:"d3-isolated-suite",applicationUrl:process.env.DATABASE_URL,d2Url:process.env.D2_ISOLATED_POSTGRES_URL})
  const d2Adapter=createCanonicalPersistenceAdapter(d2,{maxRetries:0}); const adapter=createPopulationPostgresAdapter(d3)
  return {d2,d3,d2Adapter,adapter,async resetAll(){await resetD3Schemas(d3,{explicitOptIn:"RESET_D3_ISOLATED_DATABASE",auditIdentity:"d3-suite"});await resetIsolatedSchemas(d2,{explicitOptIn:"RESET_D2_ISOLATED_DATABASE",auditIdentity:"d3-suite"})},async migrateAll(){const d2Results=await applyApprovedMigrations(d2,"d3-suite");if(d2Results.some(r=>r.status==="FAILED"))throw new Error("D2 bootstrap migration failed");await applyIsolatedRoleBlueprint(d2);const d3Results=await applyD3Migrations(d3,"d3-suite");if(d3Results.some(r=>r.status==="FAILED"))throw new Error(`D3 migration failed: ${JSON.stringify(d3Results)}`)},async seed(){await d2Adapter.registerRegistrySnapshot(registrySnapshot);await d2Adapter.registerProviderSnapshot(providerSnapshot);await d2Adapter.registerProviderSnapshot(certificationSnapshot);await d2Adapter.registerPolicyVersion(policyVersion)},async shutdown(){await d3.shutdown();await d2.shutdown()}}
}
