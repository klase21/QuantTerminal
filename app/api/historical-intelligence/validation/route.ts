import { NextResponse } from "next/server"

import { validateAcceptedEvents } from "@/core/historical-intelligence/validation/historicalValidationEngine"

export async function GET() {
  try {
    const data = await validateAcceptedEvents()
    return NextResponse.json({
      ok: true,
      mode: "historical-validation",
      data,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        mode: "historical-validation",
        error: error instanceof Error ? error.message : "Historical validation failed",
      },
      { status: 500 },
    )
  }
}

