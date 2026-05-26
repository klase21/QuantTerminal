"use client"

import type { TacticalSectorNode } from "@/core/market-map/tacticalMarketMapEngine"

export default function NarrativeTemperatureLayer({ sectors }: { sectors: TacticalSectorNode[] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {sectors.map((sector) => (
        <div
          key={sector.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
          style={{
            left: `${sector.x}%`,
            top: `${sector.y}%`,
            width: `${80 + sector.narrativeTemp}px`,
            height: `${80 + sector.narrativeTemp}px`,
            background:
              sector.narrativeTemp > 80
                ? "rgba(251,191,36,0.14)"
                : sector.narrativeTemp > 65
                  ? "rgba(34,211,238,0.12)"
                  : "rgba(148,163,184,0.07)",
            opacity: Math.max(0.22, sector.narrativeTemp / 115),
          }}
        />
      ))}
    </div>
  )
}
