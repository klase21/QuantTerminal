import { NextResponse } from "next/server"

import { MVP_CONSUMER_INSTRUMENTS, MvpConsumerFacadeError, type MvpConsumerInstrument, type MvpConsumerView } from "@/lib/data-platform/consumer-projections"
import { withMvpConsumerProjectionFacade } from "@/lib/data-platform/consumer-projections/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const VIEWS = new Set<MvpConsumerView>(["dashboard", "markets", "scanner", "trade", "replay", "research"])
const MAX_WINDOW_MS = 24 * 60 * 60 * 1000

function iso(value: string | null): string | undefined {
  if (!value) return undefined
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) throw new MvpConsumerFacadeError("INVALID_QUERY", "Invalid UTC timestamp.")
  return new Date(parsed).toISOString()
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const view = url.searchParams.get("view") as MvpConsumerView | null
    if (!view || !VIEWS.has(view)) throw new MvpConsumerFacadeError("INVALID_QUERY", "A supported view is required.")
    const rawInstrument = url.searchParams.get("instrument")?.toUpperCase()
    const instrument = rawInstrument && MVP_CONSUMER_INSTRUMENTS.includes(rawInstrument as MvpConsumerInstrument) ? rawInstrument as MvpConsumerInstrument : undefined
    if (rawInstrument && !instrument) throw new MvpConsumerFacadeError("INVALID_QUERY", "Unsupported instrument.")
    const start = iso(url.searchParams.get("start")), end = iso(url.searchParams.get("end"))
    if ((start && !end) || (!start && end) || start && end && (Date.parse(end) <= Date.parse(start) || Date.parse(end) - Date.parse(start) > MAX_WINDOW_MS)) throw new MvpConsumerFacadeError("INVALID_QUERY", "The requested range must be a positive UTC window no longer than 24 hours.")
    const result = await withMvpConsumerProjectionFacade((facade) => facade.read({ view, instrument, start, end, candidateId: url.searchParams.get("candidate") ?? undefined, projectionVersionId: url.searchParams.get("projection") ?? undefined }))
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=300", "X-Projection-Exposure": "CONSUMER_VISIBLE" } })
  } catch (error) {
    if (error instanceof MvpConsumerFacadeError) {
      const status = error.reasonCode === "INVALID_QUERY" ? 400 : error.reasonCode === "ROLLBACK_ACTIVE" ? 409 : error.reasonCode === "PROJECTION_MISSING" ? 404 : 403
      return NextResponse.json({ status: error.reasonCode, reason: error.message }, { status, headers: { "Cache-Control": "no-store" } })
    }
    console.error("MVP_PROJECTION_READ_ERROR", error instanceof Error ? error.message : "UNKNOWN")
    return NextResponse.json({ status: "READ_ERROR", reason: "The governed Projection read failed." }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
