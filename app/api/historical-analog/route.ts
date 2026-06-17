import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function POST() {
  return NextResponse.json({
    ok: false,
    source: "cryptohftdata-compatible-replay-window",
    updatedAt: new Date().toISOString(),
    snapshotStored: false,
    matches: [],
    unavailableReason: "NO VERIFIED ANALOG: CryptoHFTData-backed analog search is not available from this legacy endpoint.",
  })
}
