import { NextResponse } from "next/server"

import { resolveMvpServingMode } from "@/lib/data-platform/mvp-serving/mode"
import { readCertifiedSnapshotBundle } from "@/lib/data-platform/mvp-serving/snapshot"
import { withServingPostgresFacade } from "@/lib/data-platform/mvp-serving/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const mode = resolveMvpServingMode()
    if (mode === "local_truth") return NextResponse.json({ status: "UNHEALTHY", reason: "LOCAL_TRUTH_MODE_IS_NOT_ONLINE_SERVING", servingMode: "LOCAL_TRUTH" }, { status: 503, headers: { "Cache-Control": "no-store" } })
    if (mode === "certified_snapshot") {
      const bundle = readCertifiedSnapshotBundle(), primary = bundle.demoProfiles.some((value) => value.role === "PRIMARY"), backup = bundle.demoProfiles.some((value) => value.role === "BACKUP")
      const healthy = primary && backup && bundle.replaySnapshots.length === 2
      return NextResponse.json({ status: healthy ? "HEALTHY" : "UNHEALTHY", servingMode: "CERTIFIED_SNAPSHOT", databaseConnectivity: "NOT_APPLICABLE", activeCorpusId: bundle.corpus.corpusId, activeServingChecksum: bundle.corpus.servingChecksum, sourceCorpusId: bundle.corpus.sourceCorpusId, sourceCorpusChecksum: bundle.corpus.sourceCorpusChecksum, governedThrough: bundle.governedThrough, schemaVersion: bundle.corpus.schemaVersion, projectionCount: bundle.projections.length, evidenceSummaryCount: bundle.evidenceSummaries.length, replaySnapshotCount: bundle.replaySnapshots.length, releaseInventoryCount: bundle.corpus.releaseInventoryCount, primaryProfilePresent: primary, backupProfilePresent: backup, activeExposure: bundle.exposure.state, checksumVerified: true, readerRoleState: "NOT_APPLICABLE", fallbackAvailabilityState: "AVAILABLE", fallbackChecksumState: "VERIFIED" }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } })
    }
    return await withServingPostgresFacade(async (_facade, context, port) => {
      if (context.selection === "PREVIEW_INACTIVE_CANDIDATE") {
        const integrity = context.previewIntegrity as { readonly counts?: { readonly projections?: number; readonly evidenceSummaries?: number; readonly replaySnapshots?: number; readonly members?: number }; readonly exposureCount?: number; readonly retryLineageVerified?: boolean } | undefined
        const expectedExposureCount = integrity?.retryLineageVerified ? 1 : 0
        const healthy = context.transactionReadOnly && integrity?.counts?.projections === 62 && integrity.counts.evidenceSummaries === 6 && integrity.counts.replaySnapshots === 6 && integrity.counts.members === 74 && integrity.exposureCount === expectedExposureCount
        return NextResponse.json({ status: healthy ? "HEALTHY" : "UNHEALTHY", servingMode: context.mode, databaseConnectivity: "CONNECTED", activeCorpusId: context.corpusId, activeServingChecksum: context.checksum, governedThrough: context.governedThrough, projectionCount: integrity?.counts?.projections, evidenceSummaryCount: integrity?.counts?.evidenceSummaries, replaySnapshotCount: integrity?.counts?.replaySnapshots, manifestMemberCount: integrity?.counts?.members, activeExposure: context.exposure, candidateExposureCount: integrity?.exposureCount, checksumVerified: healthy, readerRoleState: "READ_ONLY_TRANSACTION_VERIFIED", selection: context.selection, runtimeSelectionPolicy: context.runtimeSelectionPolicy }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } })
      }
      const health = await port.health(), primary = await port.demoProfile("PRIMARY"), backup = await port.demoProfile("BACKUP"), primaryReplay = primary ? await port.replaySnapshot({ sourceProjectionVersionId: primary.replayIdentity }) : null, backupReplay = backup ? await port.replaySnapshot({ sourceProjectionVersionId: backup.replayIdentity }) : null, bundle = readCertifiedSnapshotBundle()
      const base = health as Record<string, unknown>, corpus = base.corpus as Record<string, unknown> | undefined, healthy = base.status === "HEALTHY" && Boolean(primary && backup && primaryReplay && backupReplay)
      return NextResponse.json({ status: healthy ? "HEALTHY" : "UNHEALTHY", servingMode: context.mode, databaseConnectivity: "CONNECTED", activeCorpusId: context.corpusId, activeServingChecksum: context.checksum, sourceCorpusId: corpus?.sourceCorpusId, sourceCorpusChecksum: corpus?.sourceCorpusChecksum, governedThrough: context.governedThrough, schemaVersion: corpus?.schemaVersion, projectionCount: corpus?.projectionCount, evidenceSummaryCount: corpus?.evidenceSummaryCount, replaySnapshotCount: corpus?.replaySnapshotCount, releaseInventoryCount: corpus?.releaseInventoryCount, primaryProfilePresent: Boolean(primary), backupProfilePresent: Boolean(backup), activeExposure: context.exposure, checksumVerified: base.checksumVerified === true, readerRoleState: "READ_ONLY_VERIFIED", runtimeSelectionPolicy: context.runtimeSelectionPolicy, fallbackAvailabilityState: "AVAILABLE", fallbackChecksumState: bundle.bundleChecksum ? "VERIFIED" : "INVALID" }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } })
    })
  } catch (error) {
    const reason = classifiedReason(error)
    return NextResponse.json({ status: "UNHEALTHY", reason, databaseConnectivity: "UNAVAILABLE" }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}

function classifiedReason(error: unknown): string { const value = error instanceof Error ? error.message : String(error); return ["SERVING_CORPUS_UNAVAILABLE","SERVING_CORPUS_CHECKSUM_MISMATCH","CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH","SERVING_DEMO_PROFILE_MISSING","REPLAY_SNAPSHOT_MISSING"].find((code) => value.includes(code)) ?? "SERVING_CORPUS_UNAVAILABLE" }
