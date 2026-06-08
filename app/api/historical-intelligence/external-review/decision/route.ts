import { NextResponse } from "next/server"

import {
  acceptReviewItem,
  ignoreReviewItem,
  rejectReviewItem,
} from "@/core/historical-intelligence/externalEventReviewQueueService"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string
      action?: "accept" | "reject" | "ignore"
      note?: string
    }

    if (!body.id || !body.action) {
      return NextResponse.json({ ok: false, error: "id and action are required" }, { status: 400 })
    }

    const data =
      body.action === "accept"
        ? await acceptReviewItem(body.id, body.note)
        : body.action === "reject"
          ? rejectReviewItem(body.id, body.note)
          : ignoreReviewItem(body.id, body.note)

    if (!data) {
      return NextResponse.json({ ok: false, error: "Review item not found" }, { status: 404 })
    }

    return NextResponse.json({ ok: true, mode: "external-review-decision", data })
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "External review decision failed" },
      { status: 400 },
    )
  }
}
