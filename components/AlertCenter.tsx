// ======================================================
// components/AlertCenter.tsx
// ======================================================

"use client"

import {
  useEffect,
  useMemo,
} from "react"

import { evaluateRule }
  from "@/lib/alert-engine"

import { playAlertSound }
  from "@/lib/alert-sound"

import { generateId }
  from "@/lib/generate-id"

import { useAlertStore }
  from "@/stores/useAlertStore"

import { useAlertRuleStore }
  from "@/stores/useAlertRuleStore"

export default function AlertCenter() {

  // ======================================================
  // STORES
  // ======================================================

  const alerts =
    useAlertStore(
      (s) => s.alerts
    )

  const addAlert =
    useAlertStore(
      (s) => s.addAlert
    )

  const removeAlert =
    useAlertStore(
      (s) => s.removeAlert
    )

  const soundEnabled =
    useAlertStore(
      (s) => s.soundEnabled
    )

  const rules =
    useAlertRuleStore(
      (s) => s.rules
    )

  const updateLastTriggered =
    useAlertRuleStore(
      (s) => s.updateLastTriggered
    )

  // ======================================================
  // SORTED ALERTS
  // ======================================================

  const sortedAlerts =
    useMemo(() => {

      return [...alerts].sort(
        (a, b) =>
          b.timestamp -
          a.timestamp
      )

    }, [alerts])

  // ======================================================
  // AUTO REMOVE
  // ======================================================

  useEffect(() => {

    if (!alerts.length)
      return

    const timers =
      alerts.map((alert) => {

        return setTimeout(() => {

          removeAlert(alert.id)

        }, 7000)

      })

    return () => {

      timers.forEach(clearTimeout)

    }

  }, [alerts, removeAlert])

  // ======================================================
  // RULE ENGINE LOOP
  // ======================================================

  useEffect(() => {

    const interval =
      setInterval(() => {

        // ======================================================
        // FAKE DATA
        // 실제론 websocket data 넣으면 됨
        // ======================================================

        const fakeMarketData = {

          symbol: "BTCUSDT",

          price:
            95000 +
            Math.random() *
              10000,

          volume:
            Math.random() *
            5000000,

          liquidation:
            Math.random() *
            1000000,

          oi:
            Math.random() *
            10000000,

          delta:
            Math.random() *
              2000000 -
            1000000,

          imbalance:
            Math.random() * 100,

        }

        // ======================================================
        // RULES
        // ======================================================

        rules.forEach((rule) => {

          // RULE OFF
          if (!rule.enabled)
            return

          // SYMBOL FILTER
          if (
            rule.symbol &&
            rule.symbol !==
              fakeMarketData.symbol
          ) {

            return

          }

          // COOLDOWN
          const now =
            Date.now()

          const cooldown =
            rule.cooldown || 0

          const last =
            rule.lastTriggered ||
            0

          const diff =
            now - last

          if (
            diff < cooldown
          ) {

            return

          }

          // ======================================================
          // RULE EVALUATION
          // ======================================================

          const triggered =
            evaluateRule(
              rule,
              fakeMarketData
            )

          if (!triggered)
            return

          // ======================================================
          // UPDATE LAST TRIGGER
          // ======================================================

          updateLastTriggered(
            rule.id,
            now
          )

          // ======================================================
          // ALERT MESSAGE
          // ======================================================

          const message =
            rule.message ||
            `${rule.type} triggered`

          // ======================================================
          // ALERT TYPE
          // ======================================================

          const severity =
            rule.severity ||
            "INFO"

          // ======================================================
          // ADD ALERT
          // ======================================================

          addAlert({

            id: generateId(),

            type: rule.type,

            message,

            severity,

            timestamp: now,

          })

          // ======================================================
          // SOUND
          // ======================================================

          if (
            soundEnabled &&
            rule.sound
          ) {

            playAlertSound(
              rule.sound ||
                "default"
            )

          }

          // ======================================================
          // CONSOLE LOG
          // ======================================================

          console.log(
            "[ALERT]",
            {
              rule:
                rule.id,
              type:
                rule.type,
              severity,
              message,
            }
          )

        })

      }, 1500)

    return () =>
      clearInterval(interval)

  }, [

    rules,

    addAlert,

    soundEnabled,

    updateLastTriggered,

  ])

  // ======================================================
  // UI
  // ======================================================

  return (

    <div
      className="
        fixed
        bottom-4
        right-4
        z-[9999]
        flex
        flex-col
        gap-3
        w-[340px]
      "
    >

      {sortedAlerts.map(
        (alert) => {

          const severity =
            alert.severity ||
            "INFO"

          return (

            <div
              key={alert.id}
              className={`
                rounded-2xl
                border
                p-4
                shadow-2xl
                backdrop-blur-xl
                animate-in
                slide-in-from-right
                duration-300

                ${
                  severity ===
                  "CRITICAL"
                    ? `
                      border-red-500/40
                      bg-red-500/10
                    `
                    : severity ===
                      "WARNING"
                    ? `
                      border-yellow-500/40
                      bg-yellow-500/10
                    `
                    : `
                      border-cyan-500/40
                      bg-zinc-950/95
                    `
                }
              `}
            >

              {/* HEADER */}
              <div
                className="
                  flex
                  items-center
                  justify-between
                  mb-2
                "
              >

                <div
                  className="
                    text-xs
                    font-bold
                    tracking-wider
                  "
                >
                  {alert.type}
                </div>

                <button
                  onClick={() =>
                    removeAlert(
                      alert.id
                    )
                  }
                  className="
                    text-zinc-500
                    hover:text-white
                    text-xs
                  "
                >
                  ✕
                </button>

              </div>

              {/* MESSAGE */}
              <div
                className="
                  text-sm
                  font-medium
                  leading-relaxed
                "
              >
                {alert.message}
              </div>

              {/* FOOTER */}
              <div
                className="
                  mt-3
                  flex
                  items-center
                  justify-between
                  text-[11px]
                  text-zinc-500
                "
              >

                <div>
                  {severity}
                </div>

                <div>
                  {new Date(
                    alert.timestamp
                  ).toLocaleTimeString()}
                </div>

              </div>

            </div>

          )

        }
      )}

    </div>
  )
}