import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST() {
  return NextResponse.json({
    ok: false,
    source: "local-market-ohlcv-db",
    updatedAt: new Date().toISOString(),
    snapshotStored: false,
    matches: [],
    unavailableReason: "NO VERIFIED ANALOG",
  })
}
