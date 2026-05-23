"use client"

import { useEffect, useMemo, useState } from "react"

import { capArray, safeFetchJson } from "@/lib/runtime/safeFetch"

type HealthPayload = {
  ok: boolean
  checkedAt: string
  uptimeSec: number
  memory?: {
    rssMb: number
    heapUsedMb: number
    heapTotalMb: number
    externalMb: number
  }
}

type RuntimeEvent = {
  at: string
  level: "INFO" | "WARN" | "ERROR"
  message: string
}

export function RuntimeHealthMonitor() {
  const [open, setOpen] = useState(false)
  const [health, setHealth] = useState<HealthPayload | null>(null)
  const [events, setEvents] = useState<RuntimeEvent[]>([])
  const [fetchFailures, setFetchFailures] = useState(0)

  useEffect(() => {
    let alive = true
    let timer: ReturnType<typeof setInterval> | null = null

    async function ping() {
      const result = await safeFetchJson<HealthPayload>("/api/health", {
        timeoutMs: 3500,
        retries: 0,
        label: "health",
      })
      if (!alive) return
      if (result.ok && result.data) {
        setHealth(result.data)
      } else {
        setFetchFailures((value) => value + 1)
        setEvents((prev) => capArray([...prev, {
          at: new Date().toISOString(),
          level: "ERROR",
          message: result.error ?? "Health check failed",
        }], 30))
      }
    }

    function onRuntimeError(event: Event) {
      const detail = (event as CustomEvent).detail as { message?: string } | undefined
      setEvents((prev) => capArray([...prev, {
        at: new Date().toISOString(),
        level: "ERROR",
        message: detail?.message ?? "Runtime error captured",
      }], 30))
      setOpen(true)
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      setEvents((prev) => capArray([...prev, {
        at: new Date().toISOString(),
        level: "ERROR",
        message: event.reason instanceof Error ? event.reason.message : String(event.reason),
      }], 30))
    }

    window.addEventListener("quantterminal:runtime-error", onRuntimeError)
    window.addEventListener("unhandledrejection", onUnhandledRejection)
    ping()
    timer = setInterval(ping, 20000)
    return () => {
      alive = false
      if (timer) clearInterval(timer)
      window.removeEventListener("quantterminal:runtime-error", onRuntimeError)
      window.removeEventListener("unhandledrejection", onUnhandledRejection)
    }
  }, [])

  const status = useMemo(() => {
    const heap = health?.memory?.heapUsedMb ?? 0
    if (fetchFailures >= 3 || heap >= 1400) return { label: "DEGRADED", className: "border-red-400/50 bg-red-950/50 text-red-100" }
    if (heap >= 900) return { label: "WATCH", className: "border-amber-400/50 bg-amber-950/40 text-amber-100" }
    return { label: "STABLE", className: "border-emerald-400/40 bg-emerald-950/30 text-emerald-100" }
  }, [fetchFailures, health])

  return (
    <div className="fixed bottom-3 right-3 z-[9999] text-xs font-mono">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={`rounded-full border px-3 py-1.5 shadow-2xl backdrop-blur ${status.className}`}
      >
        SYS {status.label} · {health?.memory?.heapUsedMb ?? "--"}MB
      </button>
      {open && (
        <div className="mt-2 w-96 rounded-2xl border border-cyan-400/20 bg-black/90 p-4 text-slate-100 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-300">Runtime Health</div>
            <button className="text-slate-400 hover:text-white" onClick={() => setEvents([])}>clear</button>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-white/5 p-2"><div className="text-slate-500">Uptime</div><div>{health?.uptimeSec ?? "--"}s</div></div>
            <div className="rounded-xl bg-white/5 p-2"><div className="text-slate-500">Heap</div><div>{health?.memory?.heapUsedMb ?? "--"}MB</div></div>
            <div className="rounded-xl bg-white/5 p-2"><div className="text-slate-500">Fails</div><div>{fetchFailures}</div></div>
          </div>
          <div className="mt-3 max-h-52 overflow-auto space-y-2">
            {events.length === 0 ? <div className="text-slate-500">No runtime events captured.</div> : events.slice().reverse().map((event, index) => (
              <div key={`${event.at}-${index}`} className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
                <div className="text-[10px] text-slate-500">{event.level} · {new Date(event.at).toLocaleTimeString()}</div>
                <div className="mt-1 text-slate-200">{event.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
