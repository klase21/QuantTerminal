import { NextResponse } from "next/server"

import { HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION } from "@/core/historical-intelligence/analog-v2/historicalAnalogCache"
import {
  createEvidenceValidity,
  historicalAnalogEvidenceValidity,
} from "@/core/evidence-validity"
import { historicalAnalogContradiction } from "@/core/contradiction"
import { readHistoricalAnalogCacheV2 } from "@/lib/historical-intelligence/analog-v2/readHistoricalAnalogCache"
import type { HistoricalInterval } from "@/types/historical"

export const dynamic = "force-dynamic"
export const revalidate = 0

function validInterval(value: string): value is HistoricalInterval {
  return value === "1h" || value === "4h" || value === "1d"
}

async function read(request: Request) {
  const { searchParams } = new URL(request.url)
  const symbol = (searchParams.get("symbol") ?? "BTCUSDT").trim().toUpperCase()
  const intervalValue = searchParams.get("interval") ?? "1h"
  if (!validInterval(intervalValue)) {
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      reason: "Unsupported interval.",
    }, { status: 400 })
  }

  const result = await readHistoricalAnalogCacheV2({ symbol, interval: intervalValue })
  if (!result.ok) {
    const reason = "reason" in result ? result.reason : "Historical Analog V2 cache unavailable."
    const validity = createEvidenceValidity({
      observedAt: null,
      generatedAt: result.manifest?.generatedAt ?? new Date(0).toISOString(),
      expiresAt: result.manifest?.expiresAt,
      coverageStatus: "UNAVAILABLE",
      reason,
    })
    return NextResponse.json({
      ok: false,
      status: "unavailable",
      symbol,
      interval: intervalValue,
      reason,
      validity,
      diagnostics: {
        cacheStatus: result.state,
        generatedAt: result.manifest?.generatedAt ?? null,
        source: result.manifest?.source.id ?? null,
        schemaVersion: result.manifest?.schemaVersion ?? HISTORICAL_ANALOG_CACHE_SCHEMA_VERSION,
        analogCount: 0,
        validity,
      },
    })
  }

  const validity = historicalAnalogEvidenceValidity({
    payload: result.data,
    generatedAt: result.manifest.generatedAt,
    expiresAt: result.manifest.expiresAt,
  })
  const contradiction = historicalAnalogContradiction({
    payload: result.data,
    generatedAt: result.manifest.generatedAt,
  })
  return NextResponse.json({
    ok: true,
    status: result.data.cases.length ? "available" : "unavailable",
    ...result.data,
    validity,
    contradiction,
    diagnostics: {
      cacheStatus: "ready",
      generatedAt: result.manifest.generatedAt,
      source: result.manifest.source.id,
      schemaVersion: result.manifest.schemaVersion,
      analogCount: result.data.cases.length,
      validity,
    },
  })
}

export const GET = read
export const POST = read
