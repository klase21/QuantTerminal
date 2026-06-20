import { NextResponse } from "next/server"

import {
  FileIntelligenceProductionRunReportStore,
  summarizeIntelligenceProductionRun,
} from "@/lib/intelligence-production"

export const dynamic = "force-dynamic"
export const revalidate = 0

const reportStore = new FileIntelligenceProductionRunReportStore()

function parsedLimit(value: string | null) {
  if (!value) return 10
  const limit = Number(value)
  return Number.isInteger(limit) ? Math.max(1, Math.min(100, limit)) : null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get("mode")?.trim().toLowerCase() ?? "latest"
  const runId = searchParams.get("runId")?.trim()

  try {
    if (runId) {
      const report = await reportStore.getRun(runId)
      return NextResponse.json({
        ok: Boolean(report),
        run: report ? summarizeIntelligenceProductionRun(report) : null,
        reason: report ? undefined : "Intelligence production run was not found.",
      }, { status: report ? 200 : 404 })
    }

    if (mode === "latest") {
      const [latest, latestSuccessful] = await Promise.all([
        reportStore.getLatestRun(),
        reportStore.getLatestSuccessfulRun(),
      ])
      return NextResponse.json({
        ok: true,
        latest: latest ? summarizeIntelligenceProductionRun(latest) : null,
        latestSuccessful: latestSuccessful
          ? summarizeIntelligenceProductionRun(latestSuccessful)
          : null,
      })
    }

    if (mode === "recent") {
      const limit = parsedLimit(searchParams.get("limit"))
      if (limit === null) {
        return NextResponse.json({
          ok: false,
          reason: "limit must be an integer between 1 and 100.",
        }, { status: 400 })
      }
      const reports = await reportStore.listRecentRuns(limit)
      return NextResponse.json({
        ok: true,
        runs: reports.map(summarizeIntelligenceProductionRun),
      })
    }

    return NextResponse.json({
      ok: false,
      reason: "mode must be latest or recent.",
    }, { status: 400 })
  } catch {
    return NextResponse.json({
      ok: false,
      reason: "Intelligence production run reports are unavailable.",
    }, { status: 503 })
  }
}
