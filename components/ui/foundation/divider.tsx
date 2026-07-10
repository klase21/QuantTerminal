import React from "react"

import { cn } from "@/lib/utils"

export function Divider({ orientation = "horizontal", className }: { readonly orientation?: "horizontal" | "vertical"; readonly className?: string }) {
  return (
    <div
      data-qt-foundation="divider"
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "shrink-0 bg-[var(--qt-color-border)]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
    />
  )
}
