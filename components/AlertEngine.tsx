"use client"

import { useEffect } from "react"
import useAlertSound from "@/hooks/useAlertSound"
import { useAlertStore } from "@/stores/useAlertStore"

interface Props {
  liquidationValue?: number
  absorptionStrength?: number
  whaleSize?: number
  breakout?: boolean
  volumeSpike?: boolean
}

export default function AlertEngine({
  liquidationValue,
  absorptionStrength,
  whaleSize,
  breakout,
  volumeSpike,
}: Props) {
  const { playSound } = useAlertSound()

  const soundEnabled = useAlertStore(
    (state) => state.soundEnabled
  )

  useEffect(() => {
    if (!soundEnabled) return

    if ((liquidationValue ?? 0) > 500000) {
      playSound("liquidation")
    }
  }, [liquidationValue, playSound, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if ((absorptionStrength ?? 0) > 80) {
      playSound("absorption")
    }
  }, [absorptionStrength, playSound, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if ((whaleSize ?? 0) > 1000000) {
      playSound("whale")
    }
  }, [whaleSize, playSound, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if (breakout) {
      playSound("breakout")
    }
  }, [breakout, playSound, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if (volumeSpike) {
      playSound("volume")
    }
  }, [volumeSpike, playSound, soundEnabled])

  return null
}