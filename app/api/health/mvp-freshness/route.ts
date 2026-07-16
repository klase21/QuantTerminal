import { NextResponse } from "next/server"

import { ACTIVE_MVP_SERVING_BASELINE, DEFAULT_MVP_REFRESH_POLICY, classifyFreshness, planNextMvpRefresh } from "@/lib/data-platform/mvp-refresh"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const plan = planNextMvpRefresh()
  const eligibleThrough = plan?.window.requestedEnd ?? ACTIVE_MVP_SERVING_BASELINE.governedThrough
  const freshness = classifyFreshness({ activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough, eligibleThrough, watermarks: [], candidateActive: false })
  return NextResponse.json({
    activeCorpusId: ACTIVE_MVP_SERVING_BASELINE.corpusId,
    activeGovernedThrough: ACTIVE_MVP_SERVING_BASELINE.governedThrough,
    lastEligibleClosedWindow: plan ? { start: plan.window.requestedStart, end: plan.window.requestedEnd } : null,
    activeFreshnessState: freshness.state,
    activeFreshnessReason: freshness.reasonCodes,
    candidateCorpusId: null,
    candidateGovernedThrough: null,
    candidateFreshnessState: "UNAVAILABLE",
    refreshRunId: null,
    refreshRunState: "BLOCKED",
    mandatorySourceWatermarks: [],
    supplementalSourceWatermarks: [],
    lastSuccessfulRefreshTime: null,
    nextEligibleRefreshWindow: plan?.window ?? null,
    releaseReadiness: "INELIGIBLE",
    blockerReasonCodes: ["FUNDING_REFRESH_PATH_UNAVAILABLE"],
    policyVersion: DEFAULT_MVP_REFRESH_POLICY.policyVersion,
  }, { status: 200, headers: { "Cache-Control": "no-store" } })
}
