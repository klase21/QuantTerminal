import { createDurableCanonicalPostgresClient, type DurableCanonicalPostgresConfig, type IsolatedPostgresClient } from "./client"
import { requireDurableCanonicalTarget, type DurableCanonicalTargetPurpose } from "./durableTargetSafety"

export type DurableCanonicalClientOptions = Omit<DurableCanonicalPostgresConfig, "connectionString"> & { readonly targetPurpose?: DurableCanonicalTargetPurpose }

export function createDurableCanonicalPostgresClientFromEnvironment(
  options: DurableCanonicalClientOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): IsolatedPostgresClient {
  const connectionString = environment.D2_CANONICAL_POSTGRES_URL
  const { targetPurpose = "D2_DEDICATED", ...clientOptions } = options
  requireDurableCanonicalTarget(connectionString, targetPurpose)
  return createDurableCanonicalPostgresClient({ ...clientOptions, connectionString: connectionString! }, targetPurpose)
}
