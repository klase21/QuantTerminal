import { NextResponse } from "next/server"

import {
  createSourceDegraded,
  createSourceSuccess,
  createSourceUnavailable,
  normalizeSourceMetadata,
} from "@/lib/data-governance/envelope"
import { evaluateFreshness } from "@/lib/data-governance/freshnessPolicy"
import type { SourceUnavailableReason } from "@/lib/data-governance/unavailable"

export const dynamic = "force-dynamic"
export const revalidate = 0

const BINANCE_FAPI = "https://fapi.binance.com"
const REQUEST_TIMEOUT_MS = 5500

type OpenInterestPayload = {
  symbol?: string
  openInterest?: string
  time?: number
}

type PremiumIndexPayload = {
  symbol?: string
  markPrice?: string
  indexPrice?: string
  lastFundingRate?: string
  nextFundingTime?: number
  time?: number
}

function normalizeSymbol(value: string | null) {
  const cleaned = value?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "")
  if (!cleaned) return null
  return cleaned.endsWith("USDT") ? cleaned : `${cleaned}USDT`
}

function num(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function sourceTimestamp(value: unknown) {
  const timestamp = num(value)
  return timestamp !== null && timestamp > 0
    ? new Date(timestamp).toISOString()
    : null
}

function unavailableMetadata(retrievedAt: string, reason: SourceUnavailableReason) {
  const unavailable = createSourceUnavailable("binance-live", reason)
  return normalizeSourceMetadata("binance-live", {
    freshnessStatus: unavailable.metadata.freshnessStatus,
    qualityLevel: unavailable.metadata.qualityLevel,
    sourceStatus: unavailable.metadata.sourceStatus,
    retrievedAt,
    unavailableReason: unavailable.metadata.unavailableReason,
    cacheStatus: unavailable.metadata.cacheStatus,
  })
}

function safeMessage(error: unknown) {
  if (!(error instanceof Error)) return "Binance Futures symbol context unavailable."
  if (/\b(403|451)\b/i.test(error.message)) return "Exchange response blocked."
  if (/abort|timeout/i.test(error.message)) return "Exchange request timed out."
  if (/\b404\b/i.test(error.message)) return "Selected symbol was not found on Binance Futures."
  return error.message || "Binance Futures symbol context unavailable."
}

async function fetchJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    signal,
    headers: { accept: "application/json" },
  })
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

export async function GET(req: Request) {
  const retrievedAt = new Date().toISOString()
  const symbol = normalizeSymbol(new URL(req.url).searchParams.get("symbol"))
  if (!symbol) {
    return NextResponse.json({
      ok: false,
      symbol: null,
      reason: "Missing or invalid symbol.",
      _source: unavailableMetadata(retrievedAt, "INVALID_RESPONSE"),
    }, { status: 200 })
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const [openInterest, premium] = await Promise.all([
      fetchJson<OpenInterestPayload>(`${BINANCE_FAPI}/fapi/v1/openInterest?symbol=${encodeURIComponent(symbol)}`, controller.signal),
      fetchJson<PremiumIndexPayload>(`${BINANCE_FAPI}/fapi/v1/premiumIndex?symbol=${encodeURIComponent(symbol)}`, controller.signal),
    ])

    const openInterestValue = num(openInterest.openInterest)
    const markPrice = num(premium.markPrice) ?? num(premium.indexPrice)
    const fundingRate = num(premium.lastFundingRate)

    if (openInterestValue === null && fundingRate === null && markPrice === null) {
      return NextResponse.json({
        ok: false,
        symbol,
        reason: "Binance Futures returned no funding or open interest values for selected symbol.",
        source: "binance-direct",
        _source: unavailableMetadata(retrievedAt, "EMPTY_RESPONSE"),
      }, { status: 200 })
    }

    const openInterestObservedAt = openInterestValue !== null
      ? sourceTimestamp(openInterest.time)
      : null
    const premiumObservedAt = fundingRate !== null || markPrice !== null
      ? sourceTimestamp(premium.time)
      : null
    const requiredTimestamps = [
      ...(openInterestValue !== null ? [openInterestObservedAt] : []),
      ...(fundingRate !== null || markPrice !== null ? [premiumObservedAt] : []),
    ]
    const lastUpdatedAt = requiredTimestamps.length && requiredTimestamps.every((value) => value !== null)
      ? (requiredTimestamps as string[]).reduce((oldest, value) => Date.parse(value) < Date.parse(oldest) ? value : oldest)
      : null
    const freshness = evaluateFreshness({
      sourceId: "binance-live",
      lastUpdatedAt,
      retrievedAt,
    })
    const responsePayload = {
      ok: true,
      symbol,
      openInterest: openInterestValue,
      openInterestTime: openInterest.time ?? null,
      fundingRate,
      markPrice,
      indexPrice: num(premium.indexPrice),
      oiNotional: openInterestValue !== null && markPrice !== null ? openInterestValue * markPrice : null,
      nextFundingTime: premium.nextFundingTime ?? null,
      source: "binance-direct",
    }
    const sourceResult = freshness.status === "UNAVAILABLE"
      ? createSourceDegraded("binance-live", responsePayload, "PARTIAL_DATA", undefined, {
          freshnessStatus: freshness.status,
          qualityLevel: "MEDIUM",
          lastUpdatedAt,
          retrievedAt,
          cacheStatus: "BYPASS",
        })
      : freshness.status === "STALE" || freshness.status === "EXPIRED"
        ? createSourceDegraded("binance-live", responsePayload, "STALE_DATA", undefined, {
            freshnessStatus: freshness.status,
            qualityLevel: "MEDIUM",
            lastUpdatedAt,
            retrievedAt,
            cacheStatus: "BYPASS",
          })
        : createSourceSuccess("binance-live", responsePayload, {
            freshnessStatus: freshness.status,
            qualityLevel: "HIGH",
            lastUpdatedAt,
            retrievedAt,
            cacheStatus: "BYPASS",
          })

    return NextResponse.json({
      ...responsePayload,
      _source: sourceResult.metadata,
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({
      ok: false,
      symbol,
      reason: safeMessage(error),
      source: "binance-direct",
      _source: unavailableMetadata(retrievedAt, "SOURCE_UNAVAILABLE"),
    }, { status: 200 })
  } finally {
    clearTimeout(timeout)
  }
}
