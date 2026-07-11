import React from "react"
import Link from "next/link"
import { BookOpen, History } from "lucide-react"

import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import { RepositoryLink } from "@/components/navigation"
import type { DashboardHandoffViewModel } from "@/lib/dashboard/contracts"
import type { RepositoryHandoffViewModel } from "@/lib/design-system"

const icons = { replay: History, research: BookOpen }

export function InvestigationHandoffs({
  handoffs,
  repository,
}: {
  readonly handoffs: readonly DashboardHandoffViewModel[]
  readonly repository: RepositoryHandoffViewModel
}) {
  const investigationHandoffs = handoffs.filter((handoff) => handoff.id !== "repository")
  return (
    <Section aria-labelledby="dashboard-handoff-title">
      <div>
        <p className="text-xs font-semibold uppercase text-[var(--qt-color-repository)]">Levels 4, 7 and 8 · Continue investigation</p>
        <h2 id="dashboard-handoff-title" className="mt-1 text-xl font-bold text-[var(--qt-color-text-primary)]">Replay, Research and Repository</h2>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {investigationHandoffs.map((handoff) => {
          const Icon = icons[handoff.id as keyof typeof icons]
          return (
            <SurfacePanel key={handoff.id}>
              <Icon className="size-5 text-[var(--qt-color-evidence)]" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold">{handoff.label}</h3>
              <p className="mt-2 text-xs leading-5 text-[var(--qt-color-text-muted)]">{handoff.description}</p>
              {handoff.available && handoff.href ? (
                <Link href={handoff.href} className="mt-4 inline-flex min-h-[var(--qt-touch-target)] items-center text-sm font-semibold text-[var(--qt-color-evidence)] hover:underline">
                  {handoff.label}
                </Link>
              ) : (
                <p role="status" className="mt-4 text-xs text-[var(--qt-color-text-muted)]">UNAVAILABLE: {handoff.unavailableReason}</p>
              )}
            </SurfacePanel>
          )
        })}
        <SurfacePanel>
          <h3 className="text-sm font-semibold">Repository record</h3>
          <p className="mt-2 text-xs leading-5 text-[var(--qt-color-text-muted)]">Record-level traceability is shown only when a valid identity and destination are supplied.</p>
          <div className="mt-4"><RepositoryLink handoff={repository} /></div>
        </SurfacePanel>
      </div>
    </Section>
  )
}
