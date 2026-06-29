import { NextResponse } from "next/server"

import { getEtfFlows } from "@/lib/data-sources/etfFlowClient"
import {
  createSourceDegraded,
  createSourceSuccess,
  createSourceUnavailable,
  normalizeSourceMetadata,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET() {
  const payload = await getEtfFlows()
  const observationTimes = payload.flows
    .map((flow) => flow.sourceTimestamp)
    .filter((value) => Number.isFinite(Date.parse(value)))
  const lastUpdatedAt = observationTimes.length === payload.flows.length && observationTimes.length
    ? observationTimes.reduce((oldest, value) => Date.parse(value) < Date.parse(oldest) ? value : oldest)
    : null
  const freshness = evaluateFreshness({
    sourceId: "etf-flow",
    lastUpdatedAt,
    retrievedAt: payload.updatedAt,
  })

  const sourceResult = !payload.ok || !payload.flows.length
    ? createSourceUnavailable("etf-flow", payload.isStale ? "EXPIRED" : "EMPTY_RESPONSE")
    : freshness.status === "EXPIRED" || freshness.status === "UNAVAILABLE"
      ? createSourceUnavailable("etf-flow", freshness.status === "EXPIRED" ? "EXPIRED" : "INVALID_RESPONSE")
      : freshness.status === "STALE"
        ? createSourceDegraded("etf-flow", payload, "STALE_DATA", undefined, {
            freshnessStatus: freshness.status,
            qualityLevel: "LOW",
            lastUpdatedAt,
            retrievedAt: payload.updatedAt,
            cacheStatus: "BYPASS",
          })
        : payload.flows.length < 2
          ? createSourceDegraded("etf-flow", payload, "PARTIAL_DATA", undefined, {
              freshnessStatus: freshness.status,
              qualityLevel: "MEDIUM",
              lastUpdatedAt,
              retrievedAt: payload.updatedAt,
              cacheStatus: "BYPASS",
            })
          : createSourceSuccess("etf-flow", payload, {
              freshnessStatus: freshness.status,
              qualityLevel: "MEDIUM",
              lastUpdatedAt,
              retrievedAt: payload.updatedAt,
              cacheStatus: "BYPASS",
            })
  const sourceMetadata = sourceResult.status === "UNAVAILABLE"
    ? normalizeSourceMetadata("etf-flow", {
        freshnessStatus: sourceResult.metadata.freshnessStatus,
        qualityLevel: sourceResult.metadata.qualityLevel,
        sourceStatus: sourceResult.metadata.sourceStatus,
        retrievedAt: payload.updatedAt,
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
