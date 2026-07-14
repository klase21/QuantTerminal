import "server-only"

import corpus from "@/docs/project/mvp-projection-corpus.json"
import { ConsistencyPostgresRuntime, MvpProjectionReadPort, readLatestMvpProjectionExposure, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"
import { MvpConsumerProjectionFacade, type MvpConsumerProjectionSource } from "./facade"

function environment(): D4Environment { return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL } }

export async function withMvpConsumerProjectionFacade<T>(work: (facade: MvpConsumerProjectionFacade) => Promise<T>): Promise<T> {
  const env = environment()
  if (!env.D4_ISOLATED_POSTGRES_URL) throw new Error("MVP_CONSUMER_D4_URL_REQUIRED")
  const runtime = new ConsistencyPostgresRuntime({ connectionString: env.D4_ISOLATED_POSTGRES_URL, roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 5, idleTimeoutSeconds: 15, statementTimeoutMs: 10_000, applicationName: "mvp-consumer-facade", environment: env })
  await runtime.connect()
  try {
    const port = new MvpProjectionReadPort(runtime)
    const source: MvpConsumerProjectionSource = { latest: port.latest.bind(port), byVersion: port.byVersion.bind(port), list: port.list.bind(port), exposure: () => readLatestMvpProjectionExposure(runtime, corpus.projectionCorpusId) }
    return await work(new MvpConsumerProjectionFacade(source, { id: corpus.projectionCorpusId, checksum: corpus.projectionCorpusChecksum }))
  } finally { await runtime.shutdown() }
}
