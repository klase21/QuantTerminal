import { NextResponse } from "next/server"

import { getEtfFlows } from "@/lib/data-sources/etfFlowClient"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const payload = await getEtfFlows()

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
