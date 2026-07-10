import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const foundationButtonVariants = cva(
  "inline-flex min-h-[var(--qt-touch-target)] items-center justify-center gap-2 rounded-[var(--qt-radius-control)] border px-3 font-[var(--qt-font-sans)] text-sm font-semibold transition-colors duration-[var(--qt-motion-quick)] disabled:pointer-events-none disabled:opacity-[var(--qt-opacity-disabled)]",
  {
    variants: {
      variant: {
        primary: "border-[var(--qt-color-evidence)] bg-[var(--qt-color-evidence)] text-[var(--qt-color-background)] hover:brightness-110",
        secondary: "border-[var(--qt-color-border-strong)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-text-primary)] hover:border-[var(--qt-color-text-muted)]",
        ghost: "border-transparent bg-transparent text-[var(--qt-color-text-secondary)] hover:bg-[var(--qt-color-surface-raised)] hover:text-[var(--qt-color-text-primary)]",
        danger: "border-[var(--qt-color-danger)] bg-transparent text-[var(--qt-color-danger)] hover:bg-[var(--qt-color-surface-emphasis)]",
      },
      size: {
        sm: "px-2 text-xs",
        md: "px-3 text-sm",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
)

export interface FoundationButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof foundationButtonVariants> {
  readonly loading?: boolean
  readonly loadingLabel?: string
}

export const Button = React.forwardRef<HTMLButtonElement, FoundationButtonProps>(
  ({ children, className, disabled, loading = false, loadingLabel = "Working", type = "button", variant, size, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      data-qt-foundation="button"
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(foundationButtonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <span aria-hidden="true" className="size-3 animate-spin rounded-full border border-current border-r-transparent motion-reduce:animate-none" /> : null}
      <span>{loading ? loadingLabel : children}</span>
    </button>
  ),
)
Button.displayName = "FoundationButton"

export { foundationButtonVariants }
