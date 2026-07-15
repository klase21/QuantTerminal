import { NextResponse } from "next/server"

import { MVP_CONSUMER_INSTRUMENTS, MvpConsumerFacadeError, type ConsumerProjection, type MvpConsumerInstrument } from "@/lib/data-platform/consumer-projections"
import { withMvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections/server"
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
    const bundle = await withMvpConsumerProjectionFacade((facade) => facade.read({ view: "replay", instrument, start, end, projectionVersionId: url.searchParams.get("projection") ?? undefined }))
    const projection = bundle.projections.find((item): item is ConsumerProjection => item.projectionKind === "ReplayTimelineProjection")
    if (!projection) throw new MvpConsumerFacadeError("PROJECTION_MISSING", "No governed Replay Projection matches the bounded query.")
    const model = await readMvpReplaySequence(projection)
    return NextResponse.json(model, { headers: { "Cache-Control": "private, max-age=300, stale-while-revalidate=900", "X-Replay-Projection": projection.projectionVersionId, "X-Replay-Sample-Bound": "288-price,288-oi,3-funding,48-flow" } })
  } catch (error) {
    if (error instanceof MvpConsumerFacadeError) return NextResponse.json({ status: error.reasonCode, reason: error.message }, { status: error.reasonCode === "INVALID_QUERY" ? 400 : 404, headers: { "Cache-Control": "no-store" } })
    console.error("MVP_REPLAY_SEQUENCE_READ_ERROR", error instanceof Error ? error.message : "UNKNOWN")
    return NextResponse.json({ status: "READ_ERROR", reason: "The bounded Replay sequence could not be read." }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
