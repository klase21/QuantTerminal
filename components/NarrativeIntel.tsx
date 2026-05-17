// ======================================================
// components/NarrativeIntel.tsx
// ======================================================

"use client"

import {
  useNarrativeStore
} from "@/store/useNarrativeStore"

export default function NarrativeIntel() {

  const narratives =
    useNarrativeStore((s) => s.narratives)

  return (
    <div className="
      bg-zinc-950
      border border-zinc-800
      rounded-2xl
      p-5
    ">

      <h2 className="text-xl font-bold mb-4">
        AI Narrative Engine
      </h2>

      <div className="space-y-4">

        {narratives.map((n, i) => (
          <div
            key={i}
            className="
              flex justify-between
            "
          >

            <span>
              {n.sector}
            </span>

            <span
              className={
                n.score > 70
                  ? "text-green-400"
                  : "text-red-400"
              }
            >
              {n.sentiment}
            </span>

          </div>
        ))}
      </div>
    </div>
  )
}