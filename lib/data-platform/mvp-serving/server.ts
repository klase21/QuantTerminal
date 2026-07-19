import "server-only"

import { MvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections"
import type { ReplaySequenceModel } from "@/lib/replay-sequence"
import { createMvpServingReaderClientFromEnvironment } from "./client"
import { PostgresMvpInactiveServingReadPort } from "./inactiveStaging"
import { permitsCertifiedSnapshotFallback, resolveMvpServingMode } from "./mode"
import { createMvpServingPreviewProjectionSource, mvpServingPreviewReadAuthorizationId, resolveMvpServingPreviewCandidate, verifyMvpServingPreviewCandidate } from "./preview"
import { resolveMvpServingRuntimeSelectionPolicy, verifyRuntimeSelectionPolicyInTransaction, verifySelectedServingCorpus, type MvpServingRuntimeSelectionPolicyName } from "./runtimeSelection"
import { PostgresMvpServingReadPort, createServingProjectionSource } from "./store"
import { createCertifiedSnapshotProjectionSource, readCertifiedReplaySnapshot, readCertifiedSnapshotBundle } from "./snapshot"

export interface MvpServingRequestContext {
  readonly mode: "SERVING_POSTGRES" | "CERTIFIED_SNAPSHOT" | "LOCAL_TRUTH"
  readonly corpusId: string
  readonly checksum: string
  readonly exposure: "CONSUMER_VISIBLE" | "INTERNAL_ONLY"
  readonly governedThrough: string
  readonly selection: "ACTIVE_EXPOSURE" | "PREVIEW_INACTIVE_CANDIDATE"
  readonly runtimeSelectionPolicy: MvpServingRuntimeSelectionPolicyName | "PREVIEW_EXPLICIT_CANDIDATE"
  readonly transactionReadOnly: true
  readonly previewIntegrity?: Readonly<Record<string, unknown>>
}

export async function withServingPostgresFacade<T>(work: (facade: MvpConsumerProjectionFacade, context: MvpServingRequestContext, port: PostgresMvpServingReadPort) => Promise<T>): Promise<T> {
  const client = createMvpServingReaderClientFromEnvironment()
  try {
    await client.verify()
    return await client.readOnlyTransaction(async (sql) => {
      const preview = resolveMvpServingPreviewCandidate()
      if (preview) {
        const target = await sql.unsafe<Array<{ branch_id: string | null }>>("SELECT current_setting('neon.branch_id',true) branch_id")
        if (target[0]?.branch_id !== "br-royal-block-aop70mzq") throw new Error("SERVING_PREVIEW_TARGET_MISMATCH")
        const selection = await new PostgresMvpInactiveServingReadPort(client, sql).selectCandidate(preview.candidateId, preview.retry ? { approvalId: preview.retry.approvalId, candidateChecksum: preview.candidateChecksum, targetFingerprint: preview.targetId, at: new Date().toISOString(), binding: preview.retry.binding } : undefined)
        verifyMvpServingPreviewCandidate(selection.review, preview)
        verifyExpectedCorpus(selection.review.candidateId, selection.review.servingChecksum)
        const port = new PostgresMvpServingReadPort(client, sql, selection.review.candidateId)
        const facade = new MvpConsumerProjectionFacade(createMvpServingPreviewProjectionSource(selection.review), { id: selection.review.candidateId, checksum: selection.review.servingChecksum }, { id: mvpServingPreviewReadAuthorizationId(preview) })
        return work(facade, Object.freeze({ mode: "SERVING_POSTGRES", corpusId: selection.review.candidateId, checksum: selection.review.servingChecksum, exposure: "INTERNAL_ONLY", governedThrough: selection.review.commonWatermarkValue, selection: "PREVIEW_INACTIVE_CANDIDATE", runtimeSelectionPolicy: "PREVIEW_EXPLICIT_CANDIDATE", transactionReadOnly: true, previewIntegrity: Object.freeze({ counts: selection.review.counts, memberSetChecksum: selection.review.memberSetChecksum, commonWatermarkId: selection.review.commonWatermarkId, commonWatermarkChecksum: selection.review.commonWatermarkChecksum, exposureCount: selection.review.exposureCount, retryLineageVerified: Boolean(preview.retry) }) }), port)
      }
      const runtimePolicy = resolveMvpServingRuntimeSelectionPolicy()
      await verifyRuntimeSelectionPolicyInTransaction(sql, runtimePolicy, new Date().toISOString())
      const selectionPort = new PostgresMvpServingReadPort(client, sql), corpus = await selectionPort.activeCorpus()
      if (!corpus) throw new Error("SERVING_CORPUS_UNAVAILABLE")
      verifySelectedServingCorpus(runtimePolicy, { id: corpus.corpusId, checksum: corpus.servingChecksum })
      const port = new PostgresMvpServingReadPort(client, sql, corpus.corpusId)
      const facade = new MvpConsumerProjectionFacade(createServingProjectionSource(port, corpus), { id: corpus.corpusId, checksum: corpus.servingChecksum })
      return work(facade, Object.freeze({ mode: "SERVING_POSTGRES", corpusId: corpus.corpusId, checksum: corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: corpus.governedThrough, selection: "ACTIVE_EXPOSURE", runtimeSelectionPolicy: runtimePolicy.mode, transactionReadOnly: true }), port)
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/SERVING_|CERTIFIED_SNAPSHOT_|REPLAY_SNAPSHOT_|ROLLBACK|WITHHELD|UNAUTHORIZED/.test(message)) throw error
    throw new Error("SERVING_CORPUS_UNAVAILABLE")
  } finally { await client.shutdown() }
}

export async function withCertifiedSnapshotFacade<T>(work: (facade: MvpConsumerProjectionFacade, context: MvpServingRequestContext) => Promise<T>): Promise<T> {
  const bundle = readCertifiedSnapshotBundle()
  return work(new MvpConsumerProjectionFacade(createCertifiedSnapshotProjectionSource(bundle), { id: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum }), Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough, selection: "ACTIVE_EXPOSURE", runtimeSelectionPolicy: "ACTIVE_ONLY", transactionReadOnly: true }))
}

export async function readServingReplayModel(input: { readonly sourceProjectionVersionId: string; readonly instrument: string; readonly start: string; readonly end: string }): Promise<{ readonly model: ReplaySequenceModel; readonly context: MvpServingRequestContext }> {
  const mode = resolveMvpServingMode()
  if (mode === "certified_snapshot") {
    const snapshot = readCertifiedReplaySnapshot(input)
    if (!snapshot) throw new Error("REPLAY_SNAPSHOT_MISSING")
    const bundle = readCertifiedSnapshotBundle()
    return Object.freeze({ model: snapshot.payload, context: Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough, selection: "ACTIVE_EXPOSURE", runtimeSelectionPolicy: "ACTIVE_ONLY", transactionReadOnly: true }) })
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
    return Object.freeze({ model: snapshot.payload, context: Object.freeze({ mode: "CERTIFIED_SNAPSHOT", corpusId: bundle.corpus.corpusId, checksum: bundle.corpus.servingChecksum, exposure: "CONSUMER_VISIBLE", governedThrough: bundle.governedThrough, selection: "ACTIVE_EXPOSURE", runtimeSelectionPolicy: "ACTIVE_ONLY", transactionReadOnly: true }) })
  }
}

export function servingHeaders(context: MvpServingRequestContext): Record<string, string> { return { "X-MVP-Serving-Corpus": context.corpusId, "X-MVP-Serving-Checksum": context.checksum, "X-MVP-Data-Mode": context.mode, "X-Projection-Exposure": context.exposure } }

function verifyExpectedCorpus(corpusId: string, checksum: string): void {
  if (process.env.MVP_SERVING_EXPECTED_CORPUS_ID && process.env.MVP_SERVING_EXPECTED_CORPUS_ID !== corpusId) throw new Error("SERVING_CORPUS_UNAVAILABLE")
  if (process.env.MVP_SERVING_EXPECTED_CHECKSUM && process.env.MVP_SERVING_EXPECTED_CHECKSUM !== checksum) throw new Error("SERVING_CORPUS_CHECKSUM_MISMATCH")
}

function isGovernanceFailure(error: unknown): boolean { const message = error instanceof Error ? error.message : String(error); return /CHECKSUM_MISMATCH|CORPUS_ID_MISMATCH|INVALID|WITHHELD|ROLLBACK|UNAUTHORIZED|SERVING_PREVIEW|SERVING_RUNTIME|SERVING_BRIDGE|SERVING_CANDIDATE_ONLY/.test(message) }
