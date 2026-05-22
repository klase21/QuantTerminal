"use client"

import { useEffect, useState } from "react"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"

function metric(value: unknown, digits = 0) {
  const number = typeof value === "number" ? value : Number(value)
  if (!Number.isFinite(number)) return "--"
  return number.toFixed(digits)
}

function statusClass(status?: string) {
  switch (status) {
    case "connected":
    case "healthy":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "partial":
    case "stale":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    case "error":
    case "degraded":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function connectorLabel(name: string) {
  switch (name) {
    case "datalab":
      return "UPBIT DATALAB"
    case "upbit-markets":
      return "UPBIT MARKETS"
    case "upbit-ticker":
      return "UPBIT TICKER"
    default:
      return name.toUpperCase()
  }
}

export default function SystemDiagnosticsWorkspace() {
  const [data, setData] = useState<RealMarketRotationResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true

    async function load() {
      try {
        setLoading(true)
        const response = await fetch("/api/market/sector-rotation", { cache: "no-store" })
        const payload = (await response.json()) as RealMarketRotationResponse
        if (!alive) return
        setData(payload)
        setError(response.ok ? null : payload.notes?.[0] ?? `diagnostics returned ${response.status}`)
      } catch (err) {
        if (!alive) return
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (alive) setLoading(false)
      }
    }

    load()
    const timer = setInterval(load, 45000)
    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [])

  const quality = data?.dataQuality
  const connectors = quality?.connectors ?? []
  const audits = data?.coverageAudit ?? []
  const weak = audits.filter((item) => item.quality !== "strong")

  return (
    <section className="h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">System Diagnostics</div>
              <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">
                {quality?.status ?? (loading ? "LOADING" : "UNKNOWN")}
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Connector health, coverage, latency and quality impact are now separated from the old Regime Lab archive.
              </p>
            </div>
            <div className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${statusClass(quality?.status)}`}>
              {quality?.stale ? "STALE" : quality?.status ?? "SCAN"}
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div>
          ) : null}

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Mapped</div>
              <div className="mt-1 text-lg font-black text-cyan-200">{metric(data?.coverage?.mappedAssets)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Sectors</div>
              <div className="mt-1 text-lg font-black text-violet-200">{metric(data?.coverage?.sectors)}</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Weak</div>
              <div className="mt-1 text-lg font-black text-amber-200">{weak.length}</div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {connectors.map((connector) => (
              <div key={connector.name} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-black uppercase text-zinc-100">{connectorLabel(connector.name)}</div>
                    <div className="mt-1 text-[11px] text-zinc-500">{connector.message ?? "connector telemetry active"}</div>
                  </div>
                  <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${statusClass(connector.status)}`}>{connector.status}</div>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.14em] text-zinc-500">
                  <span>Latency {connector.latencyMs ? `${metric(connector.latencyMs)}ms` : "--"}</span>
                  <span>Records {metric(connector.records)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">Sector Coverage Audit</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">active registry</div>
          </div>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {audits.map((audit) => (
              <div key={audit.sector} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-black uppercase text-zinc-100">{audit.sector}</div>
                  <div className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusClass(audit.quality === "strong" ? "connected" : audit.quality === "medium" ? "partial" : "stale")}`}>{audit.quality}</div>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div className="h-full rounded-full bg-cyan-400/80" style={{ width: `${Math.min(100, Math.max(0, audit.coverageRatio))}%` }} />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
                  <span>{audit.activeAssets}/{audit.registrySymbols}</span>
                  <span>BN {audit.binanceAssets}</span>
                  <span>UP {audit.upbitAssets}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
