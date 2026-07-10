import React from "react"
import { Database } from "lucide-react"

import type { RepositoryHandoffViewModel } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export function RepositoryLink({ handoff, className }: { readonly handoff: RepositoryHandoffViewModel; readonly className?: string }) {
  if (!handoff.available || !handoff.href) {
    return (
      <span data-qt-foundation="repository-link" role="status" className={cn("inline-flex items-center gap-2 text-xs text-[var(--qt-color-text-muted)]", className)}>
        <Database aria-hidden="true" className="size-3.5" />
        <span>Repository unavailable{handoff.unavailableReason ? `: ${handoff.unavailableReason}` : ""}</span>
      </span>
    )
  }

  return (
    <a data-qt-foundation="repository-link" href={handoff.href} className={cn("inline-flex min-h-[var(--qt-touch-target)] items-center gap-2 rounded-[var(--qt-radius-control)] text-xs font-semibold text-[var(--qt-color-repository)] underline-offset-4 hover:underline", className)}>
      <Database aria-hidden="true" className="size-3.5" />
      <span>{handoff.label ?? "Open Repository record"}</span>
      {handoff.recordId ? <span className="font-[var(--qt-font-mono)] text-[var(--qt-color-text-muted)]">{handoff.recordId}</span> : null}
    </a>
  )
}
