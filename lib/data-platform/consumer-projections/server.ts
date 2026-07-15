import "server-only"

import corpus from "@/docs/project/mvp-projection-corpus.json"
import { ConsistencyPostgresRuntime, MvpProjectionReadPort, readLatestMvpProjectionExposure, type D4Environment } from "@/lib/data-platform/consistency-evidence/postgres"
import { permitsCertifiedSnapshotFallback, resolveMvpServingMode } from "@/lib/data-platform/mvp-serving/mode"
import { withCertifiedSnapshotFacade, withServingPostgresFacade, type MvpServingRequestContext } from "@/lib/data-platform/mvp-serving/server"
import { MvpConsumerProjectionFacade, type MvpConsumerProjectionSource } from "./facade"

function environment(): D4Environment { return { D4_ISOLATED_POSTGRES_URL: process.env.D4_ISOLATED_POSTGRES_URL, D2_ISOLATED_POSTGRES_URL: process.env.D2_ISOLATED_POSTGRES_URL, D3_ISOLATED_POSTGRES_URL: process.env.D3_ISOLATED_POSTGRES_URL, DATABASE_URL: process.env.DATABASE_URL } }

export async function withMvpConsumerProjectionFacade<T>(work: (facade: MvpConsumerProjectionFacade, context: MvpServingRequestContext) => Promise<T>): Promise<T> {
  const mode = resolveMvpServingMode()
  if (mode === "certified_snapshot") return withCertifiedSnapshotFacade(work)
  if (mode === "serving_postgres") {
    try { return await withServingPostgresFacade((facade, context) => work(facade, context)) }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (!permitsCertifiedSnapshotFallback() || /CHECKSUM_MISMATCH|INVALID|WITHHELD|ROLLBACK|UNAUTHORIZED/.test(message)) throw error
      return withCertifiedSnapshotFacade(work)
    }
  }
  const env = environment()
  if (!env.D4_ISOLATED_POSTGRES_URL) throw new Error("MVP_CONSUMER_D4_URL_REQUIRED")
  const runtime = new ConsistencyPostgresRuntime({ connectionString: env.D4_ISOLATED_POSTGRES_URL, roleIntent: "READ_ONLY", maxConnections: 1, connectTimeoutSeconds: 5, idleTimeoutSeconds: 15, statementTimeoutMs: 10_000, applicationName: "mvp-consumer-facade", environment: env })
  await runtime.connect()
  try {
    const port = new MvpProjectionReadPort(runtime)
    const source: MvpConsumerProjectionSource = { latest: port.latest.bind(port), byVersion: port.byVersion.bind(port), list: port.list.bind(port), exposure: () => readLatestMvpProjectionExposure(runtime, corpus.projectionCorpusId) }
    return await work(new MvpConsumerProjectionFacade(source, { id: corpus.projectionCorpusId, checksum: corpus.projectionCorpusChecksum }), Object.freeze({ mode: "LOCAL_TRUTH", corpusId: corpus.projectionCorpusId, checksum: corpus.projectionCorpusChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: "2026-07-15T00:00:00.000Z" }))
  } finally { await runtime.shutdown() }
}
