import { NextResponse } from "next/server"

import {
  acceptLinkCandidate,
  rejectLinkCandidate,
} from "@/core/historical-intelligence/acceptedEventLinkerService"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { candidateId?: string; action?: "accept" | "reject" }
    if (!body.candidateId || !body.action) {
      return NextResponse.json({ ok: false, error: "candidateId and action are required" }, { status: 400 })
    }

    const data = body.action === "accept" ? acceptLinkCandidate(body.candidateId) : rejectLinkCandidate(body.candidateId)
    if (!data) {
      return NextResponse.json({ ok: false, error: "Link candidate not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, mode: "accepted-event-link-decision", data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Accepted event link decision failed" },
      { status: 400 },
    )
  }
}
