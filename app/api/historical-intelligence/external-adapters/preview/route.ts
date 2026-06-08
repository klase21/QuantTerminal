import { NextResponse } from "next/server"

import {
  listExternalEventAdapters,
  previewExternalEventAdapter,
} from "@/core/historical-intelligence/externalEventAdapterRegistry"
import type { ExternalEventSourceType } from "@/core/historical-intelligence/externalEventAdapterTypes"

const SOURCE_TYPES = new Set<ExternalEventSourceType>([
  "polymarket",
  "kalshi",
  "etf_flow",
  "macro_calendar",
  "token_unlock",
  "exchange_listing",
  "regulatory",
])

function sourceTypeFrom(value: string | null): ExternalEventSourceType | null {
  if (!value) return "polymarket"
  return SOURCE_TYPES.has(value as ExternalEventSourceType) ? (value as ExternalEventSourceType) : null
}

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourceType = sourceTypeFrom(searchParams.get("sourceType"))

  if (!sourceType) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported external event source type",
        availableAdapters: listExternalEventAdapters(),
        warnings: ["Requested sourceType is not registered for mock preview."],
      },
      { status: 400 },
    )
  }

  const data = await previewExternalEventAdapter(sourceType, {
    keyword: searchParams.get("keyword") ?? undefined,
    asset: searchParams.get("asset") ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "External event adapter is not available",
        availableAdapters: listExternalEventAdapters(),
        warnings: ["Source type is recognized but no mock adapter is registered yet."],
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "external-adapter-preview",
    data,
  })
}
