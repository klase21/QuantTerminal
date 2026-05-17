"use client"

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
  const { play } = useAlertSound()

  const soundEnabled = useAlertStore(
    (state) => state.soundEnabled
  )

  useEffect(() => {
    if (!soundEnabled) return

    if ((liquidationValue ?? 0) > 500000) {
      play("liquidation")
    }
  }, [liquidationValue, play, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if ((absorptionStrength ?? 0) > 80) {
      play("absorption")
    }
  }, [absorptionStrength, play, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if ((whaleSize ?? 0) > 1000000) {
      play("whale")
    }
  }, [whaleSize, play, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if (breakout) {
      play("breakout")
    }
  }, [breakout, play, soundEnabled])

  useEffect(() => {
    if (!soundEnabled) return

    if (volumeSpike) {
      play("volume")
    }
  }, [volumeSpike, play, soundEnabled])

  return null
}