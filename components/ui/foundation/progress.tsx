import React from "react"

import { cn } from "@/lib/utils"

export interface ProgressProps {
  readonly value: number
  readonly max?: number
  readonly label: string
  readonly className?: string
}

export function Progress({ value, max = 100, label, className }: ProgressProps) {
  const boundedMax = Number.isFinite(max) && max > 0 ? max : 100
  const boundedValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), boundedMax) : 0
  const percent = (boundedValue / boundedMax) * 100

  return (
    <div data-qt-foundation="progress" className={cn("grid gap-1", className)}>
      <div className="flex justify-between text-xs text-[var(--qt-color-text-secondary)]">
        <span>{label}</span>
        <span>{boundedValue} / {boundedMax}</span>
      </div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={boundedMax} aria-valuenow={boundedValue} className="h-2 overflow-hidden rounded-[var(--qt-radius-control)] bg-[var(--qt-color-surface-emphasis)]">
        <div className="h-full bg-[var(--qt-color-info)] transition-[width] duration-[var(--qt-motion-standard)] motion-reduce:transition-none" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
