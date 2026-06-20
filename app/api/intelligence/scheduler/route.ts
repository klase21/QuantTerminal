import { NextResponse } from "next/server"

import { FileIntelligenceSchedulerStore } from "@/lib/intelligence-production"

export const dynamic = "force-dynamic"
export const revalidate = 0

const schedulerStore = new FileIntelligenceSchedulerStore()

export async function GET() {
  try {
    const [state, lastSkip] = await Promise.all([
      schedulerStore.readState(),
      schedulerStore.readLastSkip(),
    ])
    if (!state) {
      return NextResponse.json({
        ok: true,
        configured: false,
        status: "unconfigured",
        lastRun: null,
        nextRun: null,
        lastSkip,
      })
    }
    return NextResponse.json({
      ok: true,
      configured: true,
      jobId: state.jobId,
      enabled: state.enabled,
      schedule: state.schedule,
      status: state.status,
      lastRun: state.lastRun,
      nextRun: state.nextRun,
      updatedAt: state.updatedAt,
      lastSkip,
    })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "Intelligence scheduler status is unavailable.",
    }, { status: 503 })
  }
}
