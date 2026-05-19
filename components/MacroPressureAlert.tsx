// ======================================================
// components/MacroPressureAlert.tsx
// MACRO PRESSURE ALERT ENGINE
// ======================================================

"use client"

import { AlertTriangle } from "lucide-react"

interface Props {
  score: number
}

export default function MacroPressureAlert({
  score,
}: Props) {
  const isBullish = score >= 20
  const isBearish = score <= -20

  if (!isBullish && !isBearish) return null

  return (
    <div
      className={`
        mt-3 rounded-xl border px-3 py-2 text-xs
        flex items-center gap-2
        ${
          isBullish
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/30 bg-red-500/10 text-red-400"
        }
      `}
    >
      <AlertTriangle className="h-4 w-4" />

      <div>
        {isBullish
          ? "Strong macro bullish pressure detected"
          : "Strong macro bearish pressure detected"}
      </div>
    </div>
  )
}