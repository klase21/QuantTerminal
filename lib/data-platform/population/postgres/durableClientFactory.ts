import { createDurableD3PostgresClient, type D3PostgresClient, type DurableD3PostgresConfig } from "./client"
import { requireDurableD3Target, type DurableD3TargetPurpose } from "./safety"

export type DurableD3ClientOptions = Omit<DurableD3PostgresConfig, "connectionString"> & { readonly targetPurpose?: DurableD3TargetPurpose }

export function createDurableD3PostgresClientFromEnvironment(
  options: DurableD3ClientOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): D3PostgresClient {
  const connectionString = environment.D3_POPULATION_POSTGRES_URL
  const { targetPurpose = "D3_DEDICATED", ...clientOptions } = options
  requireDurableD3Target(connectionString, targetPurpose)
  return createDurableD3PostgresClient({ ...clientOptions, connectionString: connectionString! }, targetPurpose)
}
