"use client"

import { useEffect, useMemo, useState } from "react"
import { DatabaseZap } from "lucide-react"

type RecordType = "replay-cases" | "events" | "decisions" | "outcomes" | "memories" | "playbooks"

type PersistenceRecord = {
  id: string
  title?: string
  label?: string
  setup?: string
  decision?: string
  outcome?: string
  actualOutcome?: string
  symbol?: string
  status?: string
  confidence?: number
  audit?: {
    createdAt?: string
  }
}

type PersistenceListResponse =
  | {
      ok: true
      data: {
        records: PersistenceRecord[]
      }
    }
  | {
      ok: false
      error: string
    }

const RECORD_TYPES: { id: RecordType; label: string }[] = [
  { id: "replay-cases", label: "Replay Cases" },
  { id: "events", label: "Events" },
  { id: "decisions", label: "Decisions" },
  { id: "outcomes", label: "Outcomes" },
  { id: "memories", label: "Memories" },
  { id: "playbooks", label: "Playbooks" },
]

function titleFor(record: PersistenceRecord) {
  return record.title ?? record.label ?? record.setup ?? record.actualOutcome ?? record.outcome ?? record.decision ?? "Untitled record"
}

export function HistoricalRecordInspectorPanel({ refreshSignal = 0 }: { refreshSignal?: number }) {
  const [recordType, setRecordType] = useState<RecordType>("events")
  const [limit, setLimit] = useState("5")
  const [records, setRecords] = useState<PersistenceRecord[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const endpoint = useMemo(
    () => `/api/historical-intelligence/persistence/${recordType}?limit=${limit}`,
    [limit, recordType],
  )

  useEffect(() => {
    let isCurrent = true

    async function loadRecords() {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(endpoint)
        const payload = (await response.json()) as PersistenceListResponse

        if (!response.ok || !payload.ok) {
          if (isCurrent) {
            setRecords([])
            setError("error" in payload ? payload.error : "Record inspection failed")
          }
          return
        }

        if (isCurrent) setRecords(payload.data.records)
      } catch {
        if (isCurrent) {
          setRecords([])
          setError("Record inspection request failed")
        }
      } finally {
        if (isCurrent) setIsLoading(false)
      }
    }

    loadRecords()

    return () => {
      isCurrent = false
    }
  }, [endpoint, refreshSignal])

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <DatabaseZap className="h-3.5 w-3.5" />
          Record Inspector
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">In-memory</div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_92px] gap-2">
        <select
          value={recordType}
          onChange={(event) => setRecordType(event.target.value as RecordType)}
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
        >
          {RECORD_TYPES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <select
          value={limit}
          onChange={(event) => setLimit(event.target.value)}
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
        >
          <option value="3">3</option>
          <option value="5">5</option>
          <option value="10">10</option>
        </select>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Count</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{records.length}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
          <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">State</div>
          <div className="mt-1 text-sm font-black text-cyan-100">{isLoading ? "Loading" : error ? "Error" : "Ready"}</div>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          {error}
        </div>
      ) : null}

      {!isLoading && !error && !records.length ? (
        <div className="mt-3 rounded-lg border border-zinc-900 bg-black/45 p-3 text-xs leading-5 text-zinc-500">
          No records returned for this type.
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {records.map((record) => (
          <article key={record.id} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-xs font-black text-white">{titleFor(record)}</div>
                <div className="mt-1 truncate text-[10px] font-bold text-zinc-500">{record.id}</div>
              </div>
              <div className="shrink-0 text-right text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                {record.symbol ?? record.status ?? "record"}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {record.status ? (
                <span className="rounded-full border border-zinc-800 bg-black/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-400">
                  {record.status}
                </span>
              ) : null}
              {record.confidence !== undefined ? (
                <span className="rounded-full border border-cyan-300/15 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-cyan-100">
                  {record.confidence}%
                </span>
              ) : null}
              {record.audit?.createdAt ? (
                <span className="rounded-full border border-zinc-800 bg-black/45 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-zinc-500">
                  {record.audit.createdAt.slice(0, 10)}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
