"use client"

import {
  Activity,
  Archive,
  CheckCircle2,
  Clock3,
  Database,
  FileClock,
  Lock,
  RefreshCw,
  ServerCog,
  ShieldCheck,
  Unlock,
  XCircle,
} from "lucide-react"
import { useCallback, useEffect, useState } from "react"

import type { IntelligenceOperationsSnapshot } from "@/lib/intelligence-production"

type OperationsResponse = IntelligenceOperationsSnapshot & {
  ok: boolean
  reason?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ")
}

function dateTime(value: string | null | undefined) {
  if (!value) return "NO DATA"
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return "NO DATA"
  return new Date(timestamp).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function duration(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "NO DATA"
  if (value < 1000) return `${Math.max(0, Math.round(value))} ms`
  const seconds = value / 1000
  if (seconds < 60) return `${seconds.toFixed(1)} s`
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
}

function statusTone(status: string | null | undefined) {
  if (status === "succeeded" || status === "healthy") return "text-emerald-300"
  if (status === "running") return "text-cyan-300"
  if (status === "partial" || status === "skipped" || status === "empty") return "text-amber-300"
  if (status === "failed" || status === "unavailable") return "text-rose-300"
  return "text-zinc-400"
}

function Panel({
  title,
  icon,
  children,
  className,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("min-w-0 border border-zinc-900 bg-zinc-950/75", className)}>
      <div className="flex h-9 items-center gap-2 border-b border-zinc-900 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">
        {icon}
        {title}
      </div>
      {children}
    </section>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: string
}) {
  return (
    <div className="min-w-0 border border-zinc-900 bg-black/45 px-3 py-2.5">
      <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">{label}</div>
      <div className={cn("mt-1 truncate text-sm font-black uppercase text-zinc-100", tone)} title={value}>
        {value}
      </div>
    </div>
  )
}

function StoreRow({ label, status }: { label: string; status: string }) {
  const healthy = status === "healthy"
  const Icon = healthy ? CheckCircle2 : status === "unavailable" ? XCircle : Archive
  return (
    <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-2.5 last:border-b-0">
      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-400">
        <Icon className={cn("h-3.5 w-3.5", statusTone(status))} />
        {label}
      </div>
      <span className={cn("text-[10px] font-black uppercase tracking-[0.14em]", statusTone(status))}>
        {status}
      </span>
    </div>
  )
}

export default function IntelligenceOperationsConsole() {
  const [data, setData] = useState<OperationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [reason, setReason] = useState<string | null>(null)

  const load = useCallback(async () => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 6000)
    setLoading(true)
    setReason(null)
    try {
      const response = await fetch("/api/intelligence/operations", {
        cache: "no-store",
        signal: controller.signal,
      })
      const payload = await response.json() as OperationsResponse
      if (!response.ok || !payload.ok) {
        throw new Error(payload.reason ?? "Intelligence operations data is unavailable.")
      }
      setData(payload)
    } catch (error) {
      if (controller.signal.aborted) {
        setReason("Operations request timed out.")
      } else {
        setReason(error instanceof Error ? error.message : "Operations data is unavailable.")
      }
    } finally {
      window.clearTimeout(timeout)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const latest = data?.production.latestRun
  const latestSuccessful = data?.production.latestSuccessfulRun
  const scheduler = data?.scheduler.state

  return (
    <main className="min-h-screen bg-black px-3 py-3 text-white sm:px-4">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-3 flex items-center justify-between border-b border-zinc-900 pb-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              <ServerCog className="h-4 w-4" />
              Internal Operations
            </div>
            <h1 className="mt-1 text-xl font-black uppercase text-zinc-100">Intelligence Operations</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <div className="text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">Checked</div>
              <div className="text-[10px] font-black uppercase text-zinc-400">{dateTime(data?.checkedAt)}</div>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="flex h-9 w-9 items-center justify-center border border-zinc-800 bg-zinc-950 text-zinc-300 transition hover:border-cyan-300/40 hover:text-cyan-200 disabled:cursor-wait disabled:text-zinc-700"
              title="Refresh operations status"
              aria-label="Refresh operations status"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </button>
          </div>
        </header>

        {reason && !data ? (
          <div className="border border-rose-400/25 bg-rose-400/5 px-4 py-3 text-[10px] font-black uppercase tracking-[0.12em] text-rose-200">
            UNAVAILABLE — {reason}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
              <Metric label="Last Run" value={dateTime(latest?.completedAt ?? latest?.startedAt)} />
              <Metric
                label="Overall Status"
                value={latest?.overallStatus ?? (loading ? "LOADING" : "NO DATA")}
                tone={statusTone(latest?.overallStatus)}
              />
              <Metric label="Duration" value={duration(latest?.duration)} />
              <Metric label="Last Successful Run" value={dateTime(latestSuccessful?.completedAt)} />
              <Metric label="Next Scheduled Run" value={dateTime(scheduler?.nextRun)} />
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
              <Panel title="Scheduler Status" icon={<Clock3 className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
                  <Metric
                    label="Enabled"
                    value={scheduler ? (scheduler.enabled ? "YES" : "NO") : "NO DATA"}
                    tone={scheduler?.enabled ? "text-emerald-300" : "text-zinc-500"}
                  />
                  <Metric
                    label="Locked"
                    value={data?.scheduler.locked ? "YES" : "NO"}
                    tone={data?.scheduler.locked ? "text-amber-300" : "text-emerald-300"}
                  />
                  <Metric
                    label="Status"
                    value={scheduler?.status ?? "UNCONFIGURED"}
                    tone={statusTone(scheduler?.status)}
                  />
                  <Metric label="Last Run" value={dateTime(scheduler?.lastRun?.completedAt ?? scheduler?.lastRun?.startedAt)} />
                  <Metric label="Next Run" value={dateTime(scheduler?.nextRun)} />
                  <Metric label="Last Skip" value={data?.scheduler.lastSkip?.reason ?? "NONE"} />
                </div>
                <div className="flex items-center gap-2 border-t border-zinc-900 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-600">
                  {data?.scheduler.locked
                    ? <Lock className="h-3 w-3 text-amber-300" />
                    : <Unlock className="h-3 w-3 text-emerald-300" />}
                  {scheduler?.jobId ?? "Scheduler state not generated"}
                </div>
              </Panel>

              <Panel title="Store Health" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                <StoreRow label="Artifact Store" status={data?.stores.artifactStore ?? "unavailable"} />
                <StoreRow label="Run Report Store" status={data?.stores.runReportStore ?? "unavailable"} />
                <StoreRow label="Scheduler State" status={data?.stores.schedulerState ?? "unavailable"} />
              </Panel>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[0.7fr_1.3fr]">
              <Panel title="Artifact Inventory" icon={<Database className="h-3.5 w-3.5" />}>
                <div className="grid grid-cols-2 gap-2 p-3">
                  <Metric label="Historical Analog" value={String(data?.artifactInventory.historicalAnalog ?? 0)} />
                  <Metric label="Event Impact" value={String(data?.artifactInventory.eventImpact ?? 0)} />
                  <Metric label="Replay Evidence" value={String(data?.artifactInventory.replayEvidence ?? 0)} />
                  <Metric label="Replay Learning" value={String(data?.artifactInventory.replayLearning ?? 0)} />
                  <Metric label="Market Memory" value={String(data?.artifactInventory.marketMemory ?? 0)} />
                  <Metric label="Discoverable" value={String(data?.artifactDiscovery.total ?? 0)} />
                </div>
                <div className="grid grid-cols-2 gap-px border-t border-zinc-900 bg-zinc-900 sm:grid-cols-5 lg:grid-cols-2">
                  {([
                    ["Historical", data?.artifactDiscovery.categories.historical_pattern],
                    ["Event", data?.artifactDiscovery.categories.event_pattern],
                    ["Replay", data?.artifactDiscovery.categories.replay_pattern],
                    ["Memory", data?.artifactDiscovery.categories.market_memory_candidate],
                    ["Unknown", data?.artifactDiscovery.categories.unknown],
                  ] as const).map(([label, value]) => (
                    <div key={label} className="bg-black px-3 py-2">
                      <div className="text-[8px] font-black uppercase tracking-[0.12em] text-zinc-600">
                        {label} Candidates
                      </div>
                      <div className="mt-0.5 text-xs font-black text-zinc-300">{value ?? 0}</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Recent Runs" icon={<FileClock className="h-3.5 w-3.5" />}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-zinc-900 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-600">
                        <th className="px-3 py-2">Run ID</th>
                        <th className="px-3 py-2">Timestamp</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2 text-right">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.production.recentRuns.length ? data.production.recentRuns.map((run) => (
                        <tr key={run.runId} className="border-b border-zinc-900/80 text-[10px] font-bold text-zinc-400 last:border-b-0">
                          <td className="max-w-[280px] truncate px-3 py-2.5 font-mono text-zinc-300" title={run.runId}>{run.runId}</td>
                          <td className="px-3 py-2.5">{dateTime(run.completedAt ?? run.startedAt)}</td>
                          <td className={cn("px-3 py-2.5 font-black uppercase", statusTone(run.overallStatus))}>{run.overallStatus}</td>
                          <td className="px-3 py-2.5 text-right text-zinc-300">{duration(run.duration)}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-6 text-center text-[10px] font-black uppercase tracking-[0.14em] text-zinc-600">
                            NO PRODUCTION RUNS RECORDED
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            {reason && (
              <div className="mt-3 flex items-center gap-2 border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-[9px] font-black uppercase tracking-[0.12em] text-amber-200">
                <Activity className="h-3.5 w-3.5" />
                Refresh unavailable — showing last loaded status
              </div>
            )}
          </>
        )}
      </div>
    </main>
  )
}
