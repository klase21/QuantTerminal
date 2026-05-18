// ======================================================
// hooks/useAlertEngine.ts
// ======================================================

"use client"

import { useEffect }
  from "react"

import { nanoid }
  from "nanoid"

import {
  useAlertStore,
} from "@/stores/useAlertStore"

import {
  useAlertRuleStore,
} from "@/stores/useAlertRuleStore"

const cooldownMap:
  Record<string, number> = {}

interface Props {

  absorptionEvents?: any[]

  liquidityEvents?: any[]

  liquidations?: any[]

}

export default function useAlertEngine({

  absorptionEvents = [],

  liquidityEvents = [],

  liquidations = [],

}: Props) {

  const addAlert =
    useAlertStore(
      (s) => s.addAlert
    )

  const rules =
    useAlertRuleStore(
      (s) => s.rules
    )

  // ======================================================
  // PLAY SOUND
  // ======================================================

  function playSound(
    type: string
  ) {

    let src =
      "/sounds/alert.mp3"

    if (
      type === "absorption"
    ) {

      src =
        "/sounds/absorption.mp3"

    }

    if (
      type === "liquidation"
    ) {

      src =
        "/sounds/liquidation.mp3"

    }

    const audio =
      new Audio(src)

    audio.volume = 0.4

    audio.play()

  }

  // ======================================================
  // PROCESS RULE
  // ======================================================

  function triggerRule(

    rule: any,

    message: string

  ) {

    const now = Date.now()

    const last =
      cooldownMap[rule.id] || 0

    if (
      now - last
      < rule.cooldown
    ) {

      return

    }

    cooldownMap[rule.id] = now

    addAlert({

      id: nanoid(),

      type: rule.type,

      message,

      timestamp: now,

    })

    if (
      rule.sound
    ) {

      playSound(
        rule.type
      )

    }

  }

  // ======================================================
  // LIQUIDATIONS
  // ======================================================

  useEffect(() => {

    if (
      !liquidations.length
    ) return

    const latest =
      liquidations[0]

    rules
      .filter((r) =>

        r.enabled &&
        r.type ===
          "LIQUIDATION"

      )
      .forEach((rule) => {

        if (

          latest.amount >=
          (rule.threshold ?? 0)

        ) {

          triggerRule(

            rule,

            `Large liquidation detected ($${Math.round(
              latest.amount
            ).toLocaleString()})`

          )

        }

      })

  }, [liquidations])

  // ======================================================
  // ABSORPTION
  // ======================================================

  useEffect(() => {

    if (
      !absorptionEvents.length
    ) return

    const latest =
      absorptionEvents[0]

    rules
      .filter((r) =>

        r.enabled &&
        r.type ===
          "ABSORPTION"

      )
      .forEach((rule) => {

        if (

          latest.intensity >=
          rule.threshold

        ) {

          triggerRule(

            rule,

            `Strong absorption (${latest.intensity})`

          )

        }

      })

  }, [absorptionEvents])

  // ======================================================
  // LIQUIDITY
  // ======================================================

  useEffect(() => {

    if (
      !liquidityEvents.length
    ) return

    const latest =
      liquidityEvents[0]

    rules
      .filter((r) =>

        r.enabled &&
        r.type ===
          "LIQUIDITY_SWEEP"

      )
      .forEach((rule) => {

        if (

          latest.strength >=
          rule.threshold

        ) {

          triggerRule(

            rule,

            `Liquidity event (${latest.strength})`

          )

        }

      })

  }, [liquidityEvents])

}