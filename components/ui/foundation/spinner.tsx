import React from "react"

import { cn } from "@/lib/utils"

export function Spinner({ label = "Loading", className }: { readonly label?: string; readonly className?: string }) {
  return (
    <span data-qt-foundation="spinner" role="status" aria-label={label} className={cn("inline-flex items-center gap-2 text-[var(--qt-color-text-secondary)]", className)}>
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-[var(--qt-color-border-strong)] border-r-[var(--qt-color-info)] motion-reduce:animate-none" />
      <span className="text-xs">{label}</span>
    </span>
  )
}
