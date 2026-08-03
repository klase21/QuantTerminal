import { createDurableCanonicalPostgresClientFromEnvironment, type DurableCanonicalClientOptions, type IsolatedPostgresClient } from "@/lib/data-platform/persistence/postgres"
import { createDurableD3PostgresClientFromEnvironment, type D3PostgresClient, type DurableD3ClientOptions } from "@/lib/data-platform/population/postgres"

import { requireIntegratedBackfillTarget, type IntegratedBackfillTargetInspection } from "./integratedTargetSafety"

export interface IntegratedBackfillClientOptions {
  readonly d2: Omit<DurableCanonicalClientOptions, "targetPurpose">
  readonly d3: Omit<DurableD3ClientOptions, "targetPurpose">
  readonly repositoryRoot: string
}

export interface IntegratedBackfillClients {
  readonly d2: IsolatedPostgresClient
  readonly d3: D3PostgresClient
  readonly target: IntegratedBackfillTargetInspection
  shutdown(): Promise<void>
}

export async function createIntegratedBackfillClientsFromEnvironment(
  options: IntegratedBackfillClientOptions,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<IntegratedBackfillClients> {
  const target = await requireIntegratedBackfillTarget({
    d2Url: environment.D2_CANONICAL_POSTGRES_URL,
    d3Url: environment.D3_POPULATION_POSTGRES_URL,
    objectRoot: environment.D3_BACKFILL_OBJECT_ROOT,
    repositoryRoot: options.repositoryRoot,
    environment,
  })
  const d2 = createDurableCanonicalPostgresClientFromEnvironment({ ...options.d2, targetPurpose: "INTEGRATED_BACKFILL" }, environment)
  try {
    const d3 = createDurableD3PostgresClientFromEnvironment({ ...options.d3, targetPurpose: "INTEGRATED_BACKFILL" }, environment)
    return Object.freeze({
      d2,
      d3,
      target,
      async shutdown() { await Promise.all([d2.shutdown(), d3.shutdown()]) },
    })
  } catch (cause) {
    await d2.shutdown()
    throw cause
  }
}
