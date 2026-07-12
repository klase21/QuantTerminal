import { applyApprovedMigrations, applyIsolatedRoleBlueprint, createCanonicalPersistenceAdapter, createIsolatedPostgresClient, requireIsolatedTarget, resetIsolatedSchemas, type CanonicalPersistenceAdapter, type IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import { certificationSnapshot, policyVersion, providerSnapshot, registrySnapshot } from "./fixtures"

export interface IsolatedHarness { readonly client: IsolatedPostgresClient; readonly adapter: CanonicalPersistenceAdapter; reset(): Promise<void>; migrate(): Promise<void>; seedGovernance(): Promise<void>; shutdown(): Promise<void> }

export function isolatedUrl(): string | null { return process.env.D2_ISOLATED_POSTGRES_URL?.trim() || null }

export async function createHarness(options: { readonly failurePoint?: Parameters<typeof createCanonicalPersistenceAdapter>[1] extends infer T ? T extends { failurePoint?: infer P } ? P : never : never } = {}): Promise<IsolatedHarness> {
  const url = isolatedUrl()
  if (!url) throw new Error("D2_ISOLATED_POSTGRES_URL is not configured")
  requireIsolatedTarget(url)
  const client = createIsolatedPostgresClient({ connectionString: url, roleIntent: "MIGRATION_OWNER", maxConnections: 4, connectTimeoutSeconds: 10, idleTimeoutSeconds: 30, applicationName: "quantterminal-d2-isolated-tests" })
  const adapter = createCanonicalPersistenceAdapter(client, { ...(options.failurePoint ? { failurePoint: options.failurePoint, allowFailureInjection: true } : {}), maxRetries: 0 })
  return {
    client, adapter,
    async reset() { await resetIsolatedSchemas(client, { explicitOptIn: "RESET_D2_ISOLATED_DATABASE", auditIdentity: "d2-isolated-suite" }) },
    async migrate() { const results = await applyApprovedMigrations(client, "d2-isolated-suite"); if (results.some((result) => result.status === "FAILED")) throw new Error(`Migration failed: ${JSON.stringify(results)}`); await applyIsolatedRoleBlueprint(client) },
    async seedGovernance() { await adapter.registerRegistrySnapshot(registrySnapshot); await adapter.registerProviderSnapshot(providerSnapshot); await adapter.registerProviderSnapshot(certificationSnapshot); await adapter.registerPolicyVersion(policyVersion) },
    async shutdown() { await client.shutdown() },
  }
}
