import { NextResponse } from "next/server"

import { getMacroSnapshot } from "@/lib/data-sources/marketMacroClient"
import {
  createSourceDegraded,
  createSourceUnavailable,
  normalizeSourceMetadata,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const payload = await getMacroSnapshot()
  const retrievedAt = new Date(payload.updatedAt).toISOString()
  const freshness = evaluateFreshness({
    sourceId: "macro",
    lastUpdatedAt: null,
    retrievedAt,
  })
  const sourceResult = payload.items.length
    ? createSourceDegraded("macro", payload, "PARTIAL_DATA", undefined, {
        freshnessStatus: freshness.status,
        qualityLevel: "LOW",
        retrievedAt,
        cacheStatus: "BYPASS",
      })
    : createSourceUnavailable("macro", "SOURCE_UNAVAILABLE")
  const sourceMetadata = sourceResult.status === "UNAVAILABLE"
    ? normalizeSourceMetadata("macro", {
        freshnessStatus: sourceResult.metadata.freshnessStatus,
        qualityLevel: sourceResult.metadata.qualityLevel,
        sourceStatus: sourceResult.metadata.sourceStatus,
        retrievedAt,
        unavailableReason: sourceResult.metadata.unavailableReason,
        cacheStatus: sourceResult.metadata.cacheStatus,
      })
    : sourceResult.metadata

  return NextResponse.json({
    ...payload,
    _source: sourceMetadata,
  }, {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  })
}
