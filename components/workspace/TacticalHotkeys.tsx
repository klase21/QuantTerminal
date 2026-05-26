"use client"

import { useEffect } from "react"
import { useTacticalWorkspaceStore } from "@/stores/useTacticalWorkspaceStore"

export default function TacticalHotkeys() {
  const {
    hotkeysEnabled,
    setFlowAdvanced,
    setPreset,
    setFocusTarget,
  } = useTacticalWorkspaceStore()

  useEffect(() => {
    if (!hotkeysEnabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable
      ) {
        return
      }

      if (event.key === "a" || event.key === "A") {
        setFlowAdvanced(true)
      }

      if (event.key === "b" || event.key === "B") {
        setFlowAdvanced(false)
      }

      if (event.key === "1") setPreset("SCALP")
      if (event.key === "2") setPreset("SWING")
      if (event.key === "3") setPreset("RISK_OFF")
      if (event.key === "4") setPreset("AI_ROTATION")

      if (event.key === "0") setFocusTarget("NONE")
      if (event.key.toLowerCase() === "r") setFocusTarget("RWA")
      if (event.key.toLowerCase() === "i") setFocusTarget("AI")
      if (event.key.toLowerCase() === "m") setFocusTarget("MEME")
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [hotkeysEnabled, setFlowAdvanced, setPreset, setFocusTarget])

  return null
}
