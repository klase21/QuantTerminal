import { NextResponse } from "next/server"

import {
  VERIFIED_EVENT_CATEGORIES,
  type VerifiedEventCategory,
} from "@/core/event-catalog"
import { eventImpactReader } from "@/lib/event-impact/eventImpactReader"

export const dynamic = "force-dynamic"
export const revalidate = 0

const CATEGORY_SET = new Set<VerifiedEventCategory>(VERIFIED_EVENT_CATEGORIES)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const eventId = searchParams.get("eventId")?.trim()
  const categoryValue = searchParams.get("category")?.trim()
  const symbol = searchParams.get("symbol")?.trim()
  const exchange = searchParams.get("exchange")?.trim()

  if ((eventId && categoryValue) || (!eventId && !categoryValue)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Provide exactly one of eventId or category.",
    }, { status: 400 })
  }

  if (categoryValue && !CATEGORY_SET.has(categoryValue as VerifiedEventCategory)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Unsupported verified event category.",
    }, { status: 400 })
  }

  const options = { symbol, exchange }
  const result = eventId
    ? await eventImpactReader.getByEventId(eventId, options)
    : await eventImpactReader.getByCategory(categoryValue as VerifiedEventCategory, options)

  return NextResponse.json(result)
}
