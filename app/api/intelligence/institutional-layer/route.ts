import { NextResponse } from "next/server"

import { buildInstitutionalIntelligenceLayer } from "@/core/institutional-intelligence/buildInstitutionalIntelligenceLayer"
import type { AIIntelligenceLayerSurface } from "@/core/ai-intelligence/aiIntelligenceTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const AI_LAYER_URL = "/api/intelligence/ai-layer"
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
        "user-agent": "QuantTerminal/1.0 Institutional Intelligence",
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
    const aiLayer = await fetchJson<AIIntelligenceLayerSurface>(absoluteUrl(request, AI_LAYER_URL))
    return NextResponse.json(buildInstitutionalIntelligenceLayer(aiLayer))
  } catch (error) {
    const fallback = buildInstitutionalIntelligenceLayer(null)
    return NextResponse.json({
      ...fallback,
      notes: [error instanceof Error ? error.message : "Unknown institutional intelligence layer error"],
    })
  }
}
