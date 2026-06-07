import { useLiquidationStore } from "@/stores/useLiquidationStore"
import { useMarketStore } from "@/stores/useMarketStore"
import useOrderbookStore from "@/stores/useOrderbookStore"
import { useRotationStore } from "@/stores/useRotationStore"
import { useTickerStore } from "@/stores/useTickerStore"

export type OptionalStoreAccessor = () => any | undefined

function safeRead(accessor: OptionalStoreAccessor) {
  try {
    return accessor()
  } catch {
    return undefined
  }
}

export function readTickerState() {
  return safeRead(() => useTickerStore.getState())
}

export function readOrderbookState() {
  return safeRead(() => useOrderbookStore.getState())
}

export function readMarketState() {
  return safeRead(() => useMarketStore.getState())
}

export function readMarketTradeFlowState() {
  // No global market-trade-flow Zustand store exists in this bundle.
  // Flow is currently produced by useMarketTradeFlowSocket local hook state.
  // This intentionally returns undefined so webpack never resolves a missing store module.
  return undefined
}

export function readTradeFlowState() {
  // No global trade-flow Zustand store exists in this bundle.
  return undefined
}

export function readLiquidationState() {
  return safeRead(() => useLiquidationStore.getState())
}

export function readSectorRotationState() {
  return safeRead(() => {
    const state = useRotationStore.getState()
    const scored = Array.isArray(state?.scoredSectors) ? state.scoredSectors : []
    const averageScore = scored.length
      ? scored.reduce((sum: number, item: any) => {
          const value = Number(item?.score ?? item?.rotationScore ?? item?.momentumScore ?? 0)
          return sum + (Number.isFinite(value) ? value : 0)
        }, 0) / scored.length
      : undefined

    return {
      ...state,
      rotationScore: averageScore,
      score: averageScore,
      marketScore: averageScore,
    }
  })
}
