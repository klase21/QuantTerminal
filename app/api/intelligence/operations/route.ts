import { NextResponse } from "next/server"

import { readIntelligenceOperationsSnapshot } from "@/lib/intelligence-production"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  try {
    return NextResponse.json({
      ok: true,
      ...(await readIntelligenceOperationsSnapshot()),
    })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "Intelligence operations data is unavailable.",
    }, { status: 503 })
  }
}
