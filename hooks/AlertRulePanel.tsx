// ======================================================
// components/AlertRulePanel.tsx
// ======================================================

"use client"

import {
  useAlertRuleStore,
} from "@/stores/useAlertRuleStore"

export default function AlertRulePanel() {

  const {
    rules,
    toggleRule,
    removeRule,
  } =
    useAlertRuleStore()

  return (

    <div
      className="
        space-y-3
      "
    >

      {rules.map((rule) => (

        <div

          key={rule.id}

          className="
            rounded-xl
            border
            border-zinc-800
            bg-zinc-950
            p-3
          "
        >

          {/* ====================================================== */}
          {/* HEADER */}
          {/* ====================================================== */}

          <div
            className="
              flex
              items-center
              justify-between
              mb-3
            "
          >

            <div>

              {/* SYMBOL */}

              <div
                className="
                  text-sm
                  font-semibold
                  text-white
                "
              >

                {rule.symbol}

              </div>

              {/* TYPE */}

              <div
                className="
                  text-xs
                  text-zinc-500
                "
              >

                {rule.type}

              </div>

            </div>

            {/* TOGGLE */}

            <button

              onClick={() =>
                toggleRule(
                  rule.id
                )
              }

              className={`
                px-2
                py-1
                rounded-lg
                text-xs
                font-semibold
                transition-all

                ${
                  rule.enabled
                    ? `
                      bg-emerald-500/20
                      text-emerald-400
                      border
                      border-emerald-500/30
                    `
                    : `
                      bg-zinc-800
                      text-zinc-400
                      border
                      border-zinc-700
                    `
                }
              `}
            >

              {
                rule.enabled
                  ? "ON"
                  : "OFF"
              }

            </button>

          </div>

          {/* ====================================================== */}
          {/* RULE INFO */}
          {/* ====================================================== */}

          <div
            className="
              space-y-1
              text-xs
              text-zinc-400
            "
          >

            {/* CONDITION */}

            <div
              className="
                flex
                justify-between
              "
            >

              <span>
                Condition
              </span>

              <span
                className="
                  text-white
                "
              >
                {rule.condition}
              </span>

            </div>

            {/* SEVERITY */}

            <div
              className="
                flex
                justify-between
              "
            >

              <span>
                Severity
              </span>

              <span
                className="
                  text-white
                "
              >

                {
                  rule.severity ||
                  "INFO"
                }

              </span>

            </div>

            {/* COOLDOWN */}

            <div
              className="
                flex
                justify-between
              "
            >

              <span>
                Cooldown
              </span>

              <span
                className="
                  text-white
                "
              >

                {
                  rule.cooldown || 0
                }
                ms

              </span>

            </div>

            {/* SOUND */}

            <div
              className="
                flex
                justify-between
              "
            >

              <span>
                Sound
              </span>

              <span
                className="
                  text-white
                "
              >

                {
                  rule.sound ||
                  "default"
                }

              </span>

            </div>

            {/* LAST TRIGGERED */}

            <div
              className="
                flex
                justify-between
              "
            >

              <span>
                Last Triggered
              </span>

              <span
                className="
                  text-white
                "
              >

                {
                  rule.lastTriggered
                    ? new Date(
                        rule.lastTriggered
                      ).toLocaleTimeString()
                    : "-"
                }

              </span>

            </div>

          </div>

          {/* ====================================================== */}
          {/* REMOVE */}
          {/* ====================================================== */}

          <button

            onClick={() =>
              removeRule(
                rule.id
              )
            }

            className="
              mt-4
              w-full
              rounded-lg
              border
              border-red-500/20
              bg-red-500/10
              py-2
              text-xs
              font-semibold
              text-red-400
              transition-all
              hover:bg-red-500/20
            "
          >

            Remove Rule

          </button>

        </div>

      ))}

    </div>

  )

}