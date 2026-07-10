import React from "react"

import type { LifecycleState } from "@/lib/design-system"
import { Badge } from "@/components/ui/foundation/badge"
import { Spinner } from "@/components/ui/foundation/spinner"
import { cn } from "@/lib/utils"

const lifecycleTone: Record<LifecycleState, "neutral" | "info" | "success" | "warning" | "danger"> = {
  LOADING: "info",
  EMPTY: "neutral",
  READY: "success",
  ERROR: "danger",
  PARTIAL: "warning",
  OFFLINE: "warning",
  REFRESHING: "info",
}

export interface StatePanelProps {
  readonly state: LifecycleState
  readonly title?: string
  readonly reason?: string | null
  readonly action?: React.ReactNode
  readonly className?: string
}

export function StatePanel({ state, title = state, reason, action, className }: StatePanelProps) {
  const isBusy = state === "LOADING" || state === "REFRESHING"
  return (
    <div
      data-qt-foundation="state-panel"
      role={state === "ERROR" ? "alert" : "status"}
      aria-live={state === "ERROR" ? "assertive" : "polite"}
      aria-busy={isBusy || undefined}
      className={cn("grid min-h-24 gap-3 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] p-[var(--qt-space-4)]", className)}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isBusy ? <Spinner label={state === "LOADING" ? "Loading" : "Refreshing"} /> : <Badge tone={lifecycleTone[state]}>{state}</Badge>}
        <strong className="text-sm text-[var(--qt-color-text-primary)]">{title}</strong>
      </div>
      {reason ? <p className="text-sm text-[var(--qt-color-text-secondary)]">{reason}</p> : null}
      {action ? <div>{action}</div> : null}
    </div>
  )
}
