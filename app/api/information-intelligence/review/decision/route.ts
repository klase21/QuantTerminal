import { NextResponse } from "next/server"

import {
  acceptInformationReviewItem,
  ignoreInformationReviewItem,
  rejectInformationReviewItem,
} from "@/core/information-intelligence/informationReviewQueueService"
import type { InformationReviewSuggestedAction } from "@/core/information-intelligence/informationReviewQueueTypes"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string
      action?: "accept" | "reject" | "ignore"
      suggestedAction?: InformationReviewSuggestedAction
      note?: string
    }

    if (!body.id || !body.action) {
      return NextResponse.json({ ok: false, error: "id and action are required" }, { status: 400 })
    }

    const item =
      body.action === "accept"
        ? acceptInformationReviewItem(body.id, body.suggestedAction, body.note)
        : body.action === "reject"
          ? rejectInformationReviewItem(body.id, body.note)
          : ignoreInformationReviewItem(body.id, body.note)

    if (!item) {
      return NextResponse.json({ ok: false, error: "Information review item not found" }, { status: 404 })
    }

    return NextResponse.json({
      ok: true,
      mode: "information-review-decision",
      data: item,
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Failed to update information review item",
      },
      { status: 500 },
    )
  }
}

