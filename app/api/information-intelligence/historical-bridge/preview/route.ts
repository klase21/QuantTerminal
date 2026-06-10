import { NextResponse } from "next/server"

import { previewHistoricalCandidates } from "@/core/information-intelligence/informationHistoricalBridgeService"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const reviewItemId = searchParams.get("reviewItemId")

    if (!reviewItemId) {
      return NextResponse.json({ ok: false, error: "reviewItemId is required" }, { status: 400 })
    }

    const preview = previewHistoricalCandidates(reviewItemId)
    if (!preview) {
      return NextResponse.json({ ok: false, error: "Information review item not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      mode: "information-historical-bridge-preview",
      data: preview,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to preview historical candidates",
      },
      { status: 500 },
    )
  }
}

