import { NextResponse } from "next/server"

import { MVP_CONSUMER_INSTRUMENTS, MvpConsumerFacadeError, type ConsumerProjection, type MvpConsumerInstrument } from "@/lib/data-platform/consumer-projections"
import { withMvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections/server"
import { resolveMvpServingMode } from "@/lib/data-platform/mvp-serving/mode"
import { readServingReplayModel, servingHeaders } from "@/lib/data-platform/mvp-serving/server"
import { readMvpReplaySequence } from "@/lib/replay-sequence/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function iso(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) throw new MvpConsumerFacadeError("INVALID_QUERY", "A valid UTC timestamp is required.")
  return new Date(value).toISOString()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url), rawInstrument = url.searchParams.get("instrument")?.toUpperCase()
    if (!rawInstrument || !MVP_CONSUMER_INSTRUMENTS.includes(rawInstrument as MvpConsumerInstrument)) throw new MvpConsumerFacadeError("INVALID_QUERY", "A governed instrument is required.")
    const instrument = rawInstrument as MvpConsumerInstrument, start = iso(url.searchParams.get("start")), end = iso(url.searchParams.get("end"))
    if (Date.parse(end) - Date.parse(start) !== 86_400_000) throw new MvpConsumerFacadeError("INVALID_QUERY", "Replay sequence reads require one exact UTC day.")
    const { bundle, facadeContext } = await withMvpConsumerProjectionFacade(async (facade, context) => ({ bundle: await facade.read({ view: "replay", instrument, start, end, projectionVersionId: url.searchParams.get("projection") ?? undefined }), facadeContext: context }))
    const projection = bundle.projections.find((item): item is ConsumerProjection => item.projectionKind === "ReplayTimelineProjection")
    if (!projection) throw new MvpConsumerFacadeError("PROJECTION_MISSING", "No governed Replay Projection matches the bounded query.")
    const serving = resolveMvpServingMode() === "local_truth" ? { model: await readMvpReplaySequence(projection), context: facadeContext } : await readServingReplayModel({ sourceProjectionVersionId: projection.projectionVersionId, instrument, start, end })
    return NextResponse.json(serving.model, { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=900", ...servingHeaders(serving.context), "X-Replay-Projection": projection.projectionVersionId, "X-Replay-Sample-Bound": "288-price,288-oi,3-funding,48-flow" } })
  } catch (error) {
    if (error instanceof MvpConsumerFacadeError) { const reasonCode = error.reasonCode === "PROJECTION_MISSING" && resolveMvpServingMode() !== "local_truth" ? "SERVING_PROJECTION_MISSING" : error.reasonCode; return NextResponse.json({ status: reasonCode, reason: error.message }, { status: error.reasonCode === "INVALID_QUERY" ? 400 : 404, headers: { "Cache-Control": "no-store" } }) }
    console.error("MVP_REPLAY_SEQUENCE_READ_ERROR", error instanceof Error ? error.message : "UNKNOWN")
    const message = error instanceof Error ? error.message : String(error), reasonCode = ["REPLAY_SNAPSHOT_MISSING", "REPLAY_SNAPSHOT_CHECKSUM_MISMATCH", "SERVING_CORPUS_UNAVAILABLE", "SERVING_CORPUS_CHECKSUM_MISMATCH", "CERTIFIED_SNAPSHOT_CHECKSUM_MISMATCH"].find((code) => message.includes(code)) ?? "READ_ERROR"
    return NextResponse.json({ status: reasonCode, reason: "The bounded serving Replay sequence could not be read." }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
