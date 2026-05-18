"use client"

import {
  useAlertRuleStore,
} from "@/stores/useAlertRuleStore"

export default function AlertRulePanel() {

  const {
    rules,
    toggleRule,
  } =
    useAlertRuleStore()

  return (

    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">

      <div className="flex items-center justify-between mb-4">

        <div className="text-sm font-semibold">
          Alert Rules
        </div>

        <div className="text-xs text-zinc-500">
          Real-Time
        </div>

      </div>

      <div className="space-y-2">

        {rules.map((rule) => (

          <div
            key={rule.id}
            className="
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-zinc-800
              bg-black/40
              p-3
            "
          >

            <div>

              <div className="text-sm font-medium">
                {rule.type}
              </div>

              <div className="text-xs text-zinc-500">
                Condition:
                {" "}
                {rule.condition?.toLocaleString()}
              </div>

            </div>

            <button
              onClick={() =>
                toggleRule(rule.id)
              }
              className={`
                px-3 py-1 rounded-lg text-xs font-semibold
                ${
                  rule.enabled
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }
              `}
            >
              {rule.enabled
                ? "ON"
                : "OFF"}
            </button>

          </div>

        ))}

      </div>

    </div>
  )
}