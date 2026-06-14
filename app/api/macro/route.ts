import { NextResponse } from "next/server"

import { getMacroSnapshot } from "@/lib/data-sources/marketMacroClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const payload = await getMacroSnapshot()

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
