import { NextResponse } from "next/server"

import {
  listExternalEventAdapters,
  previewLiveExternalEventAdapter,
} from "@/core/historical-intelligence/externalEventAdapterRegistry"

function limitFrom(value: string | null) {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const sourceType = searchParams.get("sourceType") ?? "polymarket"

  if (sourceType !== "polymarket") {
    return NextResponse.json(
      {
        ok: false,
        error: "Live preview currently supports Polymarket only",
        mode: "external-adapter-live-preview",
        availableAdapters: listExternalEventAdapters(),
        warnings: ["No live request was made."],
      },
      { status: 400 },
    )
  }

  const data = await previewLiveExternalEventAdapter("polymarket", {
    keyword: searchParams.get("keyword") ?? undefined,
    asset: searchParams.get("asset") ?? undefined,
    limit: limitFrom(searchParams.get("limit")),
  })

  if (!data) {
    return NextResponse.json(
      {
        ok: false,
        error: "Polymarket live adapter is not available",
        mode: "external-adapter-live-preview",
        warnings: ["No persistence write occurred."],
      },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    mode: "external-adapter-live-preview",
    data: {
      ...data,
      previewMode: "live",
      warnings: [
        ...data.warnings,
        "External market context only. Crowd expectation is not a trading signal.",
        "Preview only - send to Review Queue before writing.",
      ],
    },
  })
}
