import * as React from "react"

import { cn } from "@/lib/utils"

type Gap = "1" | "2" | "3" | "4" | "5" | "6" | "8"
type Density = "comfortable" | "standard" | "compact"

const gaps: Record<Gap, string> = {
  "1": "gap-[var(--qt-space-1)]",
  "2": "gap-[var(--qt-space-2)]",
  "3": "gap-[var(--qt-space-3)]",
  "4": "gap-[var(--qt-space-4)]",
  "5": "gap-[var(--qt-space-5)]",
  "6": "gap-[var(--qt-space-6)]",
  "8": "gap-[var(--qt-space-8)]",
}

export interface FoundationLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  readonly gap?: Gap
  readonly density?: Density
}

export function Stack({ gap = "3", density = "standard", className, ...props }: FoundationLayoutProps) {
  return <div data-qt-foundation="stack" data-qt-density={density} className={cn("flex flex-col", gaps[gap], className)} {...props} />
}

export function Inline({ gap = "2", density = "standard", className, ...props }: FoundationLayoutProps) {
  return <div data-qt-foundation="inline" data-qt-density={density} className={cn("flex flex-wrap items-center", gaps[gap], className)} {...props} />
}

export function Section({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section data-qt-foundation="section" className={cn("grid gap-[var(--qt-space-3)]", className)} {...props} />
}

export function SurfacePanel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-qt-foundation="surface-panel"
      className={cn(
        "rounded-[var(--qt-radius-panel)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)] p-[var(--qt-space-4)] text-[var(--qt-color-text-primary)] shadow-[var(--qt-elevation-base)]",
        className,
      )}
      {...props}
    />
  )
}
