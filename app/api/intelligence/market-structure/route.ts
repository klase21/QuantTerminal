import { NextResponse } from "next/server"

import { aggregateDerivativesBySector, buildDerivativesAssetSnapshots, pickDerivativeSymbols, type BinanceOpenInterestPayload, type BinancePremiumIndexPayload } from "@/core/derivatives/deriveDerivativesIntelligence"
import { deriveParticipationIntelligence } from "@/core/participation/deriveParticipationIntelligence"
import { deriveNarrativePropagation } from "@/core/narrative-propagation/deriveNarrativePropagation"
import { buildHistoricalMemory } from "@/core/historical-intelligence/buildHistoricalMemory"
import { buildMarketStructureIntelligence } from "@/core/market-structure/buildMarketStructureIntelligence"
import type { MarketStructureIntelligenceResponse, SourceHealth } from "@/core/market-structure/marketStructureTypes"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"

export const dynamic = "force-dynamic"
export const revalidate = 0

const FETCH_TIMEOUT_MS = 8500
const BINANCE_FAPI_BASE = "https://fapi.binance.com"
const ROTATION_URL = "/api/market/sector-rotation"
const MAX_FUTURES_SYMBOLS = 42

function absoluteUrl(request: Request, path: string) {
  const url = new URL(request.url)
  return `${url.protocol}//${url.host}${path}`
}

async function fetchJson<T>(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept: "application/json",
        "user-agent": "QuantTerminal/1.0",
      },
    })
    if (!response.ok) throw new Error(`${url} returned ${response.status}`)
    return response.json() as Promise<T>
  } finally {
    clearTimeout(timer)
  }
}

async function timed<T>(name: SourceHealth["name"], task: () => Promise<T>): Promise<{ data: T | null; health: SourceHealth }> {
  const started = Date.now()
  try {
    const data = await task()
    const records = Array.isArray(data) ? data.length : undefined
    return { data, health: { name, status: records === 0 ? "partial" : "connected", latencyMs: Date.now() - started, records } }
  } catch (error) {
    return { data: null, health: { name, status: "error", latencyMs: Date.now() - started, message: error instanceof Error ? error.message : String(error) } }
  }
}

async function fetchFuturesOpenInterest(symbols: string[]) {
  const settled = await Promise.allSettled(symbols.map((symbol) =>
    fetchJson<BinanceOpenInterestPayload>(`${BINANCE_FAPI_BASE}/fapi/v1/openInterest?symbol=${symbol}`)
  ))
  return settled
    .filter((item): item is PromiseFulfilledResult<BinanceOpenInterestPayload> => item.status === "fulfilled")
    .map((item) => item.value)
}

async function fetchFunding(symbols: string[]) {
  const settled = await Promise.allSettled(symbols.map((symbol) =>
    fetchJson<BinancePremiumIndexPayload>(`${BINANCE_FAPI_BASE}/fapi/v1/premiumIndex?symbol=${symbol}`)
  ))
  return settled
    .filter((item): item is PromiseFulfilledResult<BinancePremiumIndexPayload> => item.status === "fulfilled")
    .map((item) => item.value)
}

export async function GET(request: Request) {
  const notes: string[] = []
  const symbols = pickDerivativeSymbols(4).slice(0, MAX_FUTURES_SYMBOLS)

  try {
    const [rotationResult, oiResult, fundingResult] = await Promise.all([
      timed<RealMarketRotationResponse>("snapshot-memory", () => fetchJson<RealMarketRotationResponse>(absoluteUrl(request, ROTATION_URL))),
      timed<BinanceOpenInterestPayload[]>("binance-futures", () => fetchFuturesOpenInterest(symbols)),
      timed<BinancePremiumIndexPayload[]>("binance-funding", () => fetchFunding(symbols)),
    ])

    if (rotationResult.health.status === "error") notes.push(`Rotation seed unavailable: ${rotationResult.health.message}`)
    if (oiResult.health.status === "error") notes.push(`Open interest unavailable: ${oiResult.health.message}`)
    if (fundingResult.health.status === "error") notes.push(`Funding unavailable: ${fundingResult.health.message}`)

    const derivativesAssets = buildDerivativesAssetSnapshots(oiResult.data ?? [], fundingResult.data ?? [])
    const derivatives = aggregateDerivativesBySector(derivativesAssets)
    const participation = deriveParticipationIntelligence(rotationResult.data)
    const narratives = deriveNarrativePropagation(participation, derivatives)
    const historical = buildHistoricalMemory(participation, narratives)
    const sectors = buildMarketStructureIntelligence({
      rotation: rotationResult.data,
      derivatives,
      participation,
      narratives,
      historical,
    })

    const failed = [rotationResult.health, oiResult.health, fundingResult.health].filter((item) => item.status === "error").length
    const response: MarketStructureIntelligenceResponse = {
      ok: true,
      source: "phase-27-30-market-structure",
      updatedAt: new Date().toISOString(),
      mode: failed ? "partial" : "real-time-derived",
      sectors,
      topSector: sectors[0],
      sources: [rotationResult.health, oiResult.health, fundingResult.health],
      endpoints: {
        sectorRotation: ROTATION_URL,
        binanceOpenInterest: `${BINANCE_FAPI_BASE}/fapi/v1/openInterest?symbol=BTCUSDT`,
        binanceFunding: `${BINANCE_FAPI_BASE}/fapi/v1/premiumIndex?symbol=BTCUSDT`,
      },
      notes,
    }

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        source: "phase-27-30-market-structure",
        updatedAt: new Date().toISOString(),
        mode: "error",
        sectors: [],
        sources: [],
        endpoints: {
          sectorRotation: ROTATION_URL,
          binanceOpenInterest: `${BINANCE_FAPI_BASE}/fapi/v1/openInterest`,
          binanceFunding: `${BINANCE_FAPI_BASE}/fapi/v1/premiumIndex`,
        },
        notes: [error instanceof Error ? error.message : "Unknown market structure error"],
      } satisfies MarketStructureIntelligenceResponse,
      { status: 500 }
    )
  }
}
