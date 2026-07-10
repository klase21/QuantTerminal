import * as React from "react"

import { cn } from "@/lib/utils"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  readonly selected?: boolean
}

export const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, selected = false, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-qt-foundation="chip"
      aria-pressed={selected}
      className={cn(
        "inline-flex min-h-[var(--qt-touch-target)] items-center rounded-[var(--qt-radius-control)] border px-3 font-[var(--qt-font-sans)] text-xs font-semibold transition-colors duration-[var(--qt-motion-quick)] disabled:pointer-events-none disabled:opacity-[var(--qt-opacity-disabled)]",
        selected
          ? "border-[var(--qt-color-evidence)] bg-[var(--qt-color-surface-emphasis)] text-[var(--qt-color-evidence)]"
          : "border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] text-[var(--qt-color-text-secondary)] hover:border-[var(--qt-color-border-strong)]",
        className,
      )}
      {...props}
    />
  ),
)
Chip.displayName = "Chip"
