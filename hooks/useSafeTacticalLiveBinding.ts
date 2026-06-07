"use client"

import { useEffect, useRef } from "react"

import { useTacticalSnapshotStore } from "@/stores/useTacticalSnapshotStore"
import {
  readLiquidationState,
  readMarketTradeFlowState,
  readMarketState,
  readOrderbookState,
  readSectorRotationState,
  readTickerState,
  readTradeFlowState,
} from "@/lib/tactical/storeAccessRegistry"
import {
  FALLBACK_TACTICAL_SNAPSHOT,
  clamp,
  finite,
  roundScore,
  type StableTacticalInputSnapshot,
  type TacticalFreshness,
} from "@/lib/tactical/stableTacticalInput"


function deriveSnapshot(): StableTacticalInputSnapshot {
  const tickerState = readTickerState()
  const marketState = readMarketState()
  const orderbookState = readOrderbookState() ?? marketState
  const flowState = readMarketTradeFlowState() ?? readTradeFlowState()
  const liquidationState = readLiquidationState()
  const rotationState = readSectorRotationState()

  const ticker =
    tickerState?.selectedTicker ??
    tickerState?.activeTicker ??
    tickerState?.tickers?.BTCUSDT ??
    (Array.isArray(tickerState?.tickers) ? tickerState.tickers.find((item: any) => item?.symbol === "BTCUSDT") : undefined) ??
    marketState?.tickers?.BTCUSDT ??
    marketState?.ticker ??
    undefined

  const priceChange24h = finite(ticker?.change24h ?? ticker?.priceChangePercent ?? ticker?.P, 0)
  const quoteVolume = finite(ticker?.volume24h ?? ticker?.quoteVolume ?? ticker?.q, 0)

  const flow =
    flowState?.current ??
    flowState?.state ??
    flowState?.flow ??
    flowState?.bySymbol?.BTCUSDT ??
    flowState?.symbols?.BTCUSDT ??
    undefined

  const buyVolume = finite(flow?.buyVolume, 0)
  const sellVolume = finite(flow?.sellVolume, 0)
  const totalFlow = Math.max(1, buyVolume + sellVolume)
  const flowBalance = ((buyVolume - sellVolume) / totalFlow) * 50 + 50
  const cvd = finite(flow?.cvd, 0)

  const ob =
    orderbookState?.orderbook ??
    orderbookState?.state ??
    orderbookState?.bySymbol?.BTCUSDT ??
    orderbookState?.books?.BTCUSDT ??
    undefined

  const bidDepth = Array.isArray(ob?.bids)
    ? ob.bids.slice(0, 10).reduce((sum: number, level: any) => sum + Number(level?.[1] ?? level?.qty ?? 0), 0)
    : finite(ob?.bidDepth, 0)
  const askDepth = Array.isArray(ob?.asks)
    ? ob.asks.slice(0, 10).reduce((sum: number, level: any) => sum + Number(level?.[1] ?? level?.qty ?? 0), 0)
    : finite(ob?.askDepth, 0)
  const depthTotal = Math.max(1, bidDepth + askDepth)
  const orderbookImbalance = ((bidDepth - askDepth) / depthTotal) * 100

  const bestBid = Array.isArray(ob?.bids) ? Number(ob.bids?.[0]?.[0] ?? ob.bids?.[0]?.price ?? 0) : finite(ob?.bestBid, 0)
  const bestAsk = Array.isArray(ob?.asks) ? Number(ob.asks?.[0]?.[0] ?? ob.asks?.[0]?.price ?? 0) : finite(ob?.bestAsk, 0)
  const mid = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0
  const spreadBps = mid > 0 ? ((bestAsk - bestBid) / mid) * 10000 : 8

  const liquidationPressure = finite(
    liquidationState?.pressure ??
      liquidationState?.sweepPressure ??
      liquidationState?.riskScore,
    35,
  )

  const rotationScore = finite(
    rotationState?.rotationScore ??
      rotationState?.score ??
      rotationState?.marketScore,
    55,
  )

  const hasTicker = Boolean(ticker)
  const hasFlow = buyVolume > 0 || sellVolume > 0 || cvd !== 0
  const hasOrderbook = bidDepth > 0 || askDepth > 0
  const hasLiquidation = Boolean(liquidationState)
  const hasRotation = Boolean(rotationState)

  const freshness: TacticalFreshness = {
    ticker: hasTicker,
    flow: hasFlow,
    orderbook: hasOrderbook,
    liquidation: hasLiquidation,
    rotation: hasRotation,
    macro: false,
  }

  const liveCount = Object.values(freshness).filter(Boolean).length
  const dataQuality = liveCount >= 4 ? "LIVE" : liveCount >= 2 ? "PARTIAL" : "FALLBACK"

  if (dataQuality === "FALLBACK") {
    return {
      ...FALLBACK_TACTICAL_SNAPSHOT,
      updatedAt: Date.now(),
    }
  }

  const volatilityScore = clamp(42 + Math.abs(priceChange24h) * 5 + Math.min(20, quoteVolume / 1_000_000_000))
  const executionScore = clamp(68 - spreadBps * 1.7 + Math.abs(orderbookImbalance) * 0.04)
  const liquidityScore = clamp(66 - spreadBps * 1.45 + Math.min(12, depthTotal / 1000))
  const trendScore = clamp(50 + priceChange24h * 4 + orderbookImbalance * 0.06)
  const momentumScore = clamp(50 + priceChange24h * 5 + (flowBalance - 50) * 0.35)
  const macroRiskScore = 46

  return {
    input: {
      trendScore: roundScore(trendScore),
      momentumScore: roundScore(momentumScore),
      executionScore: roundScore(executionScore),
      liquidityScore: roundScore(liquidityScore),
      volatilityScore: roundScore(volatilityScore),
      flowScore: roundScore(flowBalance),
      rotationScore: roundScore(rotationScore),
      liquidationPressure: roundScore(liquidationPressure),
      fundingPressure: 38,
      macroRiskScore,
    },
    macroInput: {
      dxyChange: 0.08,
      us10yChange: 0.04,
      nasdaqChange: 0.42,
      btcDominanceChange: -0.18,
      stablecoinLiquidityScore: roundScore(liquidityScore),
      cryptoBetaScore: roundScore(50 + priceChange24h * 4),
    },
    opportunityCandidates: undefined,
    flowInput: {
      buyVolume,
      sellVolume,
      cvd,
      orderbookImbalance,
      spreadBps,
      volatilityScore: roundScore(volatilityScore),
    },
    dataQuality,
    freshness,
    updatedAt: Date.now(),
  }
}

export default function useSafeTacticalLiveBinding() {
  const setSnapshot = useTacticalSnapshotStore((state) => state.setSnapshot)
  const mountedRef = useRef(false)

  useEffect(() => {
    mountedRef.current = true

    function tick() {
      if (!mountedRef.current) return
      setSnapshot(deriveSnapshot())
    }

    tick()
    const timer = window.setInterval(tick, 1000)

    return () => {
      mountedRef.current = false
      window.clearInterval(timer)
    }
  }, [setSnapshot])
}
