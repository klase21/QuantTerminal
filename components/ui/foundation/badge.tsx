import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex min-h-6 items-center gap-1 rounded-[var(--qt-radius-control)] border px-2 font-[var(--qt-font-sans)] text-[var(--qt-type-label-size)] font-bold uppercase leading-none",
  {
    variants: {
      tone: {
        neutral: "border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-text-secondary)]",
        info: "border-[var(--qt-color-info)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-info)]",
        success: "border-[var(--qt-color-success)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-success)]",
        warning: "border-[var(--qt-color-warning)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-warning)]",
        danger: "border-[var(--qt-color-danger)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-danger)]",
        experimental: "border-dashed border-[var(--qt-color-counter-evidence)] bg-[var(--qt-color-surface-raised)] text-[var(--qt-color-counter-evidence)]",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span data-qt-foundation="badge" className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { badgeVariants }
