import { NextResponse } from "next/server"

import { getPredictionMarkets } from "@/lib/data-sources/polymarketClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const payload = await getPredictionMarkets(searchParams.get("query") ?? undefined)

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
