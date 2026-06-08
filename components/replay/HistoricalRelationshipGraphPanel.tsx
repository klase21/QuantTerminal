"use client"

import { useState } from "react"
import { GitBranch } from "lucide-react"

import type {
  HistoricalGraphNode,
  HistoricalRelationshipGraph,
} from "@/core/historical-intelligence/historicalRelationshipGraphTypes"
import type { AcceptedEventLinkType } from "@/core/historical-intelligence/acceptedEventLinkerTypes"

type GraphResponse =
  | {
      ok: true
      data: HistoricalRelationshipGraph
    }
  | {
      ok: false
      error: string
    }

const TARGET_TYPES: { id: "" | AcceptedEventLinkType; label: string }[] = [
  { id: "", label: "All Targets" },
  { id: "replay_case", label: "Replay Case" },
  { id: "memory", label: "Memory" },
  { id: "decision", label: "Decision" },
  { id: "outcome", label: "Outcome" },
  { id: "playbook", label: "Playbook" },
]

function appendParam(params: URLSearchParams, key: string, value: string) {
  const trimmed = value.trim()
  if (trimmed) params.set(key, trimmed)
}

function nodeById(nodes: HistoricalGraphNode[], id: string) {
  return nodes.find((node) => node.id === id)
}

export function HistoricalRelationshipGraphPanel() {
  const [sourceEventId, setSourceEventId] = useState("")
  const [targetType, setTargetType] = useState<"" | AcceptedEventLinkType>("")
  const [limit, setLimit] = useState("5")
  const [graph, setGraph] = useState<HistoricalRelationshipGraph | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function loadGraph() {
    setIsLoading(true)
    setError(null)

    const params = new URLSearchParams({ limit })
    appendParam(params, "sourceEventId", sourceEventId)
    if (targetType) params.set("targetType", targetType)

    try {
      const response = await fetch(`/api/historical-intelligence/relationship-graph?${params.toString()}`)
      const payload = (await response.json()) as GraphResponse
      if (!response.ok || !payload.ok) {
        setGraph(null)
        setError("error" in payload ? payload.error : "Relationship graph request failed")
        return
      }
      setGraph(payload.data)
    } catch {
      setGraph(null)
      setError("Relationship graph request failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-300">
          <GitBranch className="h-3.5 w-3.5" />
          Relationship Graph
        </div>
        <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">Trace View</div>
      </div>

      <div className="grid gap-2">
        <input
          value={sourceEventId}
          onChange={(event) => setSourceEventId(event.target.value)}
          placeholder="sourceEventId optional"
          className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-cyan-300/50"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_72px_76px] gap-2">
          <select
            value={targetType}
            onChange={(event) => setTargetType(event.target.value as "" | AcceptedEventLinkType)}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-3 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            {TARGET_TYPES.map((item) => (
              <option key={item.id || "all"} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <select
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="h-9 rounded-lg border border-zinc-800 bg-black/60 px-2 text-xs font-bold text-cyan-50 outline-none transition focus:border-cyan-300/50"
          >
            <option value="3">3</option>
            <option value="5">5</option>
            <option value="10">10</option>
          </select>
          <button
            type="button"
            onClick={loadGraph}
            disabled={isLoading}
            className="h-9 rounded-lg border border-cyan-300/30 bg-cyan-400/15 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 transition hover:border-cyan-200/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? "..." : "Load"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-3 rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">
          {error}
        </div>
      ) : null}

      {graph ? (
        <div className="mt-3 grid gap-2">
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Nodes</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{graph.summary.nodeCount}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Edges</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{graph.summary.edgeCount}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-black/45 p-2">
              <div className="text-[8px] font-black uppercase tracking-[0.14em] text-zinc-500">Avg Conf</div>
              <div className="mt-1 text-sm font-black text-cyan-100">{graph.summary.averageConfidence}%</div>
            </div>
          </div>

          {graph.summary.caveat ? (
            <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3 text-xs leading-5 text-amber-50/80">
              {graph.summary.caveat}
            </div>
          ) : null}

          {graph.edges.map((edge) => {
            const source = nodeById(graph.nodes, edge.sourceNodeId)
            const target = nodeById(graph.nodes, edge.targetNodeId)
            return (
              <article key={edge.id} className="rounded-lg border border-zinc-900 bg-black/45 p-3">
                <div className="text-xs font-black text-white">{source?.title ?? edge.sourceNodeId}</div>
                <div className="my-2 border-l border-cyan-300/30 pl-3 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">
                  down / {edge.relationship} / {edge.confidence}%
                </div>
                <div className="text-xs font-black text-zinc-100">{target?.title ?? edge.targetNodeId}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-500">
                  {target?.type ?? "target"} {target?.subtitle ? `/ ${target.subtitle}` : ""}
                </div>
                {edge.rationale ? <p className="mt-2 text-[11px] leading-5 text-zinc-400">{edge.rationale}</p> : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </section>
  )
}
