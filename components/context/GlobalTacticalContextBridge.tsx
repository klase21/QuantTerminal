"use client"

import { useEffect } from "react"
import { useGlobalTacticalContextStore } from "@/stores/useGlobalTacticalContextStore"
import { useFocusRoutingStore } from "@/stores/useFocusRoutingStore"
import { useMarketModeStore } from "@/stores/useMarketModeStore"
import { useMarketStore } from "@/stores/useMarketStore"
import { normalizeTacticalSymbol } from "@/core/tactical/tacticalRoute"
import { useTacticalWorkspaceStore } from "@/stores/useTacticalWorkspaceStore"

export default function GlobalTacticalContextBridge() {
  const {
    primarySymbol,
    marketMode,
    executionStyle,
    attentionMode,
  } = useGlobalTacticalContextStore()

  const setActiveSymbol = useFocusRoutingStore((state) => state.setActiveSymbol)
  const setMarketMode = useMarketModeStore((state) => state.setMarketMode)
  const setWorkspacePreset = useTacticalWorkspaceStore((state) => state.setPreset)
  const setWorkspaceAttention = useTacticalWorkspaceStore((state) => state.setAttentionMode)
  const setSelectedSymbol = useMarketStore((state: any) => state.setSelectedSymbol)

  useEffect(() => {
    const normalizedSymbol = normalizeTacticalSymbol(primarySymbol)
    setActiveSymbol(normalizedSymbol)
    setSelectedSymbol?.(normalizedSymbol)
  }, [primarySymbol, setActiveSymbol, setSelectedSymbol])

  useEffect(() => {
    setMarketMode(marketMode)
  }, [marketMode, setMarketMode])

  useEffect(() => {
    setWorkspacePreset(executionStyle)
  }, [executionStyle, setWorkspacePreset])

  useEffect(() => {
    setWorkspaceAttention(attentionMode)
  }, [attentionMode, setWorkspaceAttention])

  return null
}
