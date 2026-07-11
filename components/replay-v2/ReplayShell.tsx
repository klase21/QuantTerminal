import React from "react"

import { SurfacePanel } from "@/components/layout/foundation-layout"
import { Button } from "@/components/ui/foundation"
import type { ReplaySummaryViewModel } from "@/lib/replay-presentation/contracts"

export interface ReplayShellActions {
  readonly exchange: string
  readonly symbol: string
  readonly date: string
  readonly hour: string
  readonly sourceMode: "provider" | "repository"
  readonly loading: boolean
  readonly loadingStage: string | null
  readonly repositoryModeDisabled: boolean
  readonly repositoryModeReason: string | null
  readonly onExchangeChange: (value: string) => void
  readonly onSymbolChange: (value: string) => void
  readonly onDateChange: (value: string) => void
  readonly onHourChange: (value: string) => void
  readonly onSourceModeChange: (value: "provider" | "repository") => void
  readonly onLoadReplay: () => void
}

export function ReplayShell({ summary, actions }: { readonly summary: ReplaySummaryViewModel; readonly actions: ReplayShellActions }) {
  return (
    <header className="grid gap-4 border-b border-[var(--qt-color-border)] pb-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Replay V2 · Investigation Workspace</p>
          <h1 className="mt-1 break-words text-2xl font-bold text-[var(--qt-color-text-primary)]">{summary.title}</h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-[var(--qt-color-text-secondary)]">{summary.question}</p>
        </div>
        <p className="text-xs text-[var(--qt-color-text-muted)]">{summary.window}</p>
      </div>
      <SurfacePanel className="grid gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className="grid gap-1 text-xs font-semibold text-[var(--qt-color-text-secondary)]">Exchange
          <select value={actions.exchange} onChange={(event) => actions.onExchangeChange(event.target.value)} className="min-h-[var(--qt-touch-target)] rounded-[var(--qt-radius-control)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] px-3 text-sm text-[var(--qt-color-text-primary)]">
            <option value="binance_futures">Binance Futures</option><option value="binance_spot">Binance Spot</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--qt-color-text-secondary)]">Symbol
          <input value={actions.symbol} onChange={(event) => actions.onSymbolChange(event.target.value.toUpperCase())} className="min-h-[var(--qt-touch-target)] min-w-0 rounded-[var(--qt-radius-control)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] px-3 text-sm uppercase text-[var(--qt-color-text-primary)]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--qt-color-text-secondary)]">UTC date
          <input type="date" min="2025-07-01" value={actions.date} onChange={(event) => actions.onDateChange(event.target.value)} className="min-h-[var(--qt-touch-target)] min-w-0 rounded-[var(--qt-radius-control)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] px-3 text-sm text-[var(--qt-color-text-primary)] [color-scheme:dark]" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--qt-color-text-secondary)]">UTC hour
          <select value={actions.hour} onChange={(event) => actions.onHourChange(event.target.value)} className="min-h-[var(--qt-touch-target)] rounded-[var(--qt-radius-control)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] px-3 text-sm text-[var(--qt-color-text-primary)]">
            {Array.from({ length: 24 }, (_, index) => <option key={index} value={String(index)}>{String(index).padStart(2, "0")}:00</option>)}
          </select>
        </label>
        <Button variant="primary" loading={actions.loading} loadingLabel={`Loading ${actions.loadingStage ?? "Replay"}`} onClick={actions.onLoadReplay}>Load Replay</Button>
        <div className="flex flex-wrap gap-2 lg:col-span-5" role="group" aria-label="Replay source mode">
          <Button size="sm" variant={actions.sourceMode === "provider" ? "primary" : "secondary"} onClick={() => actions.onSourceModeChange("provider")}>Provider</Button>
          <Button size="sm" variant={actions.sourceMode === "repository" ? "primary" : "secondary"} disabled={actions.repositoryModeDisabled} title={actions.repositoryModeReason ?? undefined} onClick={() => actions.onSourceModeChange("repository")}>Repository</Button>
          {actions.repositoryModeDisabled && actions.repositoryModeReason ? <span role="status" className="self-center text-xs text-[var(--qt-color-warning)]">Repository mode unavailable: {actions.repositoryModeReason}</span> : null}
        </div>
      </SurfacePanel>
    </header>
  )
}

