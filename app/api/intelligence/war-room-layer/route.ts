import { NextResponse } from "next/server"

import { buildWarRoomIntelligenceLayer } from "@/core/war-room-intelligence/buildWarRoomIntelligenceLayer"
import type { InstitutionalIntelligenceSurface } from "@/core/institutional-intelligence/institutionalTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const INSTITUTIONAL_LAYER_URL = "/api/intelligence/institutional-layer"
const FETCH_TIMEOUT_MS = 9000

function absoluteUrl(request: Request, path: string) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}

async function fetchJson<T>(url: string): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0 Phase46-48 War Room Intelligence Layer",
      },
    })
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

export async function GET(request: Request) {
  try {
    const institutionalLayer = await fetchJson<InstitutionalIntelligenceSurface>(absoluteUrl(request, INSTITUTIONAL_LAYER_URL))
    return NextResponse.json(buildWarRoomIntelligenceLayer(institutionalLayer))
  } catch (error) {
    const fallback = buildWarRoomIntelligenceLayer(null)
    return NextResponse.json({
      ...fallback,
      notes: [error instanceof Error ? error.message : "Unknown war room intelligence layer error"],
    })
  }
}
