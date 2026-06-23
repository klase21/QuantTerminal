import { NextResponse } from "next/server"

import { buildMarketDrivers } from "@/lib/market-driver/buildMarketDrivers"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get("symbol")?.trim().toUpperCase()
  if (!symbol || !/^[A-Z0-9]{3,20}$/.test(symbol)) {
    return NextResponse.json(
      { ok: false, reason: "A valid symbol is required." },
      { status: 400 },
    )
  }
  try {
    const summary = await buildMarketDrivers({ symbol })
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        reason: error instanceof Error
          ? error.message
          : "Market Driver evidence is unavailable.",
      },
      { status: 503 },
    )
  }
}
