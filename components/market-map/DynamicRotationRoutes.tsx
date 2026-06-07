"use client"

import type { RotationRoute, TacticalSectorNode } from "@/core/market-map/tacticalMarketMapEngine"

function pathForRoute(from: TacticalSectorNode, to: TacticalSectorNode) {
  const x1 = from.x
  const y1 = from.y
  const x2 = to.x
  const y2 = to.y
  const cx = (x1 + x2) / 2
  const cy = (y1 + y2) / 2
  const verticalBias = y2 > y1 ? 8 : -8
  return `M ${x1} ${y1} C ${x1} ${cy + verticalBias}, ${x2} ${cy - verticalBias}, ${x2} ${y2}`
}

export default function DynamicRotationRoutes({
  routes,
  sectors,
}: {
  routes: RotationRoute[]
  sectors: TacticalSectorNode[]
}) {
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <filter id="route-glow">
          <feGaussianBlur stdDeviation="1.2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <linearGradient id="active-route" x1="0%" x2="100%">
          <stop offset="0%" stopColor="rgba(34,211,238,0.1)" />
          <stop offset="50%" stopColor="rgba(52,211,153,0.95)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0.1)" />
        </linearGradient>

        <linearGradient id="predicted-route" x1="0%" x2="100%">
          <stop offset="0%" stopColor="rgba(168,85,247,0.1)" />
          <stop offset="50%" stopColor="rgba(168,85,247,0.85)" />
          <stop offset="100%" stopColor="rgba(168,85,247,0.1)" />
        </linearGradient>
      </defs>

      {routes.map((route) => {
        const from = sectors.find((sector) => sector.id === route.from)
        const to = sectors.find((sector) => sector.id === route.to)
        if (!from || !to) return null

        const path = pathForRoute(from, to)
        const strokeWidth = Math.max(0.55, route.strength / 38)
        const color = route.status === "ACTIVE" ? "url(#active-route)" : route.status === "PREDICTED" ? "url(#predicted-route)" : "rgba(148,163,184,0.35)"

        return (
          <g key={route.id} filter={route.status === "FADING" ? undefined : "url(#route-glow)"}>
            <path
              d={path}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={strokeWidth + 0.55}
              strokeLinecap="round"
            />
            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={route.status === "PREDICTED" ? "3 3" : "8 6"}
              className="animate-[routeDash_2.8s_linear_infinite]"
            />
            <circle r="1.2" fill={route.status === "ACTIVE" ? "#67e8f9" : "#c084fc"}>
              <animateMotion dur={`${Math.max(1.6, 4 - route.acceleration / 7)}s`} repeatCount="indefinite" path={path} />
            </circle>
          </g>
        )
      })}
    </svg>
  )
}
