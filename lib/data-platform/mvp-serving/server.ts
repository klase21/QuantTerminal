import "server-only"

import { MvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"
import { createMvpServingClientFromEnvironment } from "./client"
import { permitsCertifiedSnapshotFallback, resolveMvpServingMode } from "./mode"
import { PostgresMvpServingReadPort, createServingProjectionSource } from "./store"
import { createCertifiedSnapshotProjectionSource, readCertifiedReplaySnapshot, readCertifiedSnapshotBundle } from "./snapshot"

export interface MvpServingRequestContext {
  readonly mode: "SERVING_POSTGRES" | "CERTIFIED_SNAPSHOT" | "LOCAL_TRUTH"
  readonly corpusId: string
  readonly checksum: string
  readonly exposure: "CONSUMER_VISIBLE"
  readonly governedThrough: string
}

export async function withServingPostgresFacade<T>(work: (facade: MvpConsumerProjectionFacade, context: MvpServingRequestContext, port: PostgresMvpServingReadPort) => Promise<T>): Promise<T> {
  const client = createMvpServingClientFromEnvironment("READER")
  try {
    await client.verify()
    const port = new PostgresMvpServingReadPort(client), corpus = await port.activeCorpus()
    if (!corpus) throw new Error("SERVING_CORPUS_UNAVAILABLE")
    verifyExpectedCorpus(corpus.corpusId, corpus.servingChecksum)
    const facade = new MvpConsumerProjectionFacade(createServingProjectionSource(port, corpus), { id: corpus.corpusId, checksum: corpus.servingChecksum })
    return await work(facade, Object.freeze({ mode: "SERVING_POSTGRES", corpusId: corpus.corpusId, checksum: corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: corpus.governedThrough }), port)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/SERVING_|CERTIFIED_SNAPSHOT_|REPLAY_SNAPSHOT_|ROLLBACK|WITHHELD|UNAUTHORIZED/.test(message)) throw error
    throw new Error("SERVING_CORPUS_UNAVAILABLE")
  } finally { await client.shutdown() }
}

export async function withCertifiedSnapshotFacade<T>(work: (facade: MvpConsumerProjectionFacade, context: MvpServingRequestContext) => Promise<T>): Promise<T> {
  const bundle = readCertifiedSnapshotBundle()
  return work(new MvpConsumerProjectionFacade(createCertifiedSnapshotProjectionSource(bundle), { id: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum }), Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough }))
}

export async function readServingReplayModel(input: { readonly sourceProjectionVersionId: string; readonly instrument: string; readonly start: string; readonly end: string }): Promise<{ readonly model: ReplaySequenceModel; readonly context: MvpServingRequestContext }> {
  const mode = resolveMvpServingMode()
  if (mode === "certified_snapshot") {
    const snapshot = readCertifiedReplaySnapshot(input)
    if (!snapshot) throw new Error("REPLAY_SNAPSHOT_MISSING")
    const bundle = readCertifiedSnapshotBundle()
    return Object.freeze({ model: snapshot.payload, context: Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough }) })
  }
  if (mode !== "serving_postgres") throw new Error("LOCAL_TRUTH_REPLAY_MODE")
  try {
    return await withServingPostgresFacade(async (_facade, context, port) => {
      const snapshot = await port.replaySnapshot(input)
      if (!snapshot) throw new Error("REPLAY_SNAPSHOT_MISSING")
      return Object.freeze({ model: snapshot.payload, context })
    })
  } catch (error) {
    if (!permitsCertifiedSnapshotFallback() || isGovernanceFailure(error)) throw error
    const snapshot = readCertifiedReplaySnapshot(input)
    if (!snapshot) throw new Error("REPLAY_SNAPSHOT_MISSING")
    const bundle = readCertifiedSnapshotBundle()
    return Object.freeze({ model: snapshot.payload, context: Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough }) })
  }
}

export function servingHeaders(context: MvpServingRequestContext): Record<string, string> { return { "X-MVP-Serving-Corpus": context.corpusId, "X-MVP-Serving-Checksum": context.checksum, "X-MVP-Data-Mode": context.mode, "X-Projection-Exposure": context.exposure } }

function verifyExpectedCorpus(corpusId: string, checksum: string): void {
  if (process.env.MVP_SERVING_EXPECTED_CORPUS_ID && process.env.MVP_SERVING_EXPECTED_CORPUS_ID !== corpusId) throw new Error("SERVING_CORPUS_UNAVAILABLE")
  if (process.env.MVP_SERVING_EXPECTED_CHECKSUM && process.env.MVP_SERVING_EXPECTED_CHECKSUM !== checksum) throw new Error("SERVING_CORPUS_CHECKSUM_MISMATCH")
}

function isGovernanceFailure(error: unknown): boolean { const message = error instanceof Error ? error.message : String(error); return /CHECKSUM_MISMATCH|INVALID|WITHHELD|ROLLBACK|UNAUTHORIZED/.test(message) }
