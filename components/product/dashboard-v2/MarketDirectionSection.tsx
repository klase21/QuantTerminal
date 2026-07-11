import React from "react"
import { Activity, ShieldAlert } from "lucide-react"

import { AvailabilityBadge, FreshnessIndicator, StatePanel } from "@/components/feedback"
import { Inline, Section, Stack, SurfacePanel } from "@/components/layout/foundation-layout"
import { Badge } from "@/components/ui/foundation"
import type { MarketDirectionViewModel } from "@/lib/dashboard/contracts"

export function MarketDirectionSection({ model }: { readonly model: MarketDirectionViewModel }) {
  return (
    <Section aria-labelledby="dashboard-direction-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Level 1 · Market orientation</p>
          <h1 id="dashboard-direction-title" className="mt-1 text-2xl font-bold text-[var(--qt-color-text-primary)] sm:text-3xl">Market Direction</h1>
        </div>
        <Inline gap="2">
          <AvailabilityBadge availability={model.availability} />
          <FreshnessIndicator freshness={model.freshness} />
        </Inline>
      </div>

      {model.direction === null ? (
        <StatePanel
          state={model.lifecycle}
          title={model.contaminatedByHistoricalAnalog ? "Market Direction limited" : "Market Direction unavailable"}
          reason={model.availability.reason ?? model.limitation ?? "No supported aggregate direction was supplied."}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.34fr)]">
          <SurfacePanel className="flex min-h-52 flex-col justify-center border-[var(--qt-color-evidence)]">
            <Inline gap="2">
              <Badge tone="info"><Activity className="size-3.5" aria-hidden="true" />Observed aggregate</Badge>
              <Badge tone="neutral">{model.symbol}</Badge>
            </Inline>
            <p className="mt-5 text-4xl font-bold text-[var(--qt-color-text-primary)] sm:text-5xl">{model.direction}</p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--qt-color-text-secondary)]">
              Supplied market-driver aggregate. It is displayed only when no unsupported Historical Analog influence is detected.
            </p>
          </SurfacePanel>

          <SurfacePanel>
            <Stack gap="3">
              <div className="flex items-center gap-2 text-[var(--qt-color-evidence)]">
                <ShieldAlert className="size-4" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Evidence Readiness</h2>
              </div>
              {model.evidenceReadiness ? (
                <>
                  <p className="font-[var(--qt-font-mono)] text-3xl font-semibold text-[var(--qt-color-text-primary)]">{model.evidenceReadiness.value}</p>
                  <p className="text-xs leading-5 text-[var(--qt-color-text-muted)]">Basis: {model.evidenceReadiness.basis}</p>
                  <p className="text-xs font-semibold text-[var(--qt-color-warning)]">Not confidence.</p>
                </>
              ) : (
                <p className="text-sm text-[var(--qt-color-text-muted)]">Evidence Readiness unavailable.</p>
              )}
              <p className="text-xs text-[var(--qt-color-text-muted)]">
                Coverage: {model.coverage.state}{model.coverage.percent !== null && model.coverage.percent !== undefined ? ` · ${model.coverage.percent}%` : ""}
              </p>
            </Stack>
          </SurfacePanel>
        </div>
      )}
    </Section>
  )
}
