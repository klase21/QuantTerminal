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

          <div
            className="
              flex
              items-center
              justify-between
              mb-2
            "
          >

            <div>

              <div
                className="
                  text-sm
                  font-semibold
                "
              >

                {rule.name}

              </div>

              <div
                className="
                  text-xs
                  text-zinc-500
                "
              >

                {rule.type}

              </div>

            </div>

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

                ${
                  rule.enabled
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-zinc-800 text-zinc-400"
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

          <div
            className="
              flex
              justify-between
              text-xs
              text-zinc-400
            "
          >

            <span>
              Threshold:
              {" "}
              {rule.threshold}
            </span>

            <span>
              Cooldown:
              {" "}
              {rule.cooldown}ms
            </span>

          </div>

          <button

            onClick={() =>
              removeRule(
                rule.id
              )
            }

            className="
              mt-3
              text-xs
              text-red-400
            "
          >

            Remove

          </button>

        </div>

      ))}

    </div>

  )

}