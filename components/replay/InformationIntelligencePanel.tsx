"use client"

import { useEffect, useState } from "react"
import { Newspaper, RadioTower, ShieldCheck, Sparkles } from "lucide-react"

import type { InformationIntelligenceDigest } from "@/core/information-intelligence/informationScoringEngine"

type InformationScoringApiResponse =
  | {
      ok: true
      mode: "information-intelligence-scoring"
      data: InformationIntelligenceDigest
    }
  | {
      ok: false
      error: string
    }

function scoreClass(value: number) {
  if (value >= 75) return "text-emerald-200"
  if (value >= 55) return "text-cyan-200"
  if (value >= 35) return "text-amber-200"
  return "text-zinc-400"
}

function ItemRow({
  title,
  source,
  score,
  read,
}: {
  title: string
  source: string
  score: number
  read: string
}) {
  return (
    <article className="rounded-lg border border-zinc-900 bg-black/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">{source}</div>
          <div className="mt-1 text-xs font-black leading-5 text-white">{title}</div>
        </div>
        <div className={`shrink-0 text-right text-sm font-black ${scoreClass(score)}`}>{score}</div>
      </div>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{read}</p>
    </article>
  )
}

export function InformationIntelligencePanel({ symbol }: { symbol?: string }) {
  const [digest, setDigest] = useState<InformationIntelligenceDigest | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const params = new URLSearchParams()
    if (symbol) params.set("symbol", symbol)

    fetch(`/api/information-intelligence/scoring?${params.toString()}`, { cache: "no-store" })
      .then((response) => response.json() as Promise<InformationScoringApiResponse>)
      .then((payload) => {
        if (cancelled) return
        if (payload.ok === false) {
          setError(payload.error)
          return
        }
        setDigest(payload.data)
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Information scoring failed")
      })

    return () => {
      cancelled = true
    }
  }, [symbol])

  const topItem = digest?.topScoredItems[0]
  const noisyItem = digest?.noisyButViralItems[0]
  const reliableItem = digest?.reliableLowAttentionItems[0]
  const impactItem = digest?.highImpactCandidates[0]

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-300">
          <Newspaper className="h-3.5 w-3.5" />
          Information Intelligence
        </div>
        <div className="rounded-full border border-zinc-700 bg-black/35 px-2 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-300">
          mock scoring
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-300/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-100">{error}</div>
      ) : null}

      <div className="grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-cyan-300/15 bg-cyan-400/10 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
            <Sparkles className="h-3.5 w-3.5" />
            Top Intelligence
          </div>
          {topItem ? <p className="mt-1 text-xs leading-5 text-cyan-50/85">{topItem.title} / {topItem.compositeScore}</p> : <p className="mt-1 text-xs text-zinc-500">Loading mock digest...</p>}
        </div>
        <div className="rounded-lg border border-amber-300/15 bg-amber-400/10 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-amber-100/70">
            <RadioTower className="h-3.5 w-3.5" />
            Noisy But Viral
          </div>
          {noisyItem ? <p className="mt-1 text-xs leading-5 text-amber-50/85">{noisyItem.title} / attention {noisyItem.attentionScore}</p> : <p className="mt-1 text-xs text-zinc-500">No viral noisy item in current filter.</p>}
        </div>
      </div>

      <div className="mt-2 grid gap-2">
        {digest?.topScoredItems.slice(0, 2).map((item) => (
          <ItemRow
            key={item.itemId}
            title={item.title}
            source={item.source}
            score={item.compositeScore}
            read={item.tacticalRead}
          />
        ))}
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-2">
        <div className="rounded-lg border border-emerald-300/15 bg-emerald-400/10 p-3">
          <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.16em] text-emerald-100/70">
            <ShieldCheck className="h-3.5 w-3.5" />
            Reliable / Low Attention
          </div>
          <p className="mt-1 text-xs leading-5 text-emerald-50/85">
            {reliableItem ? `${reliableItem.title} / reliability ${reliableItem.reliabilityScore}` : "No quiet reliable item in current filter."}
          </p>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-black/45 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-500">High Impact Candidate</div>
          <p className="mt-1 text-xs leading-5 text-zinc-300">
            {impactItem ? `${impactItem.title} / impact ${impactItem.impactScore}` : "No high-impact item in current filter."}
          </p>
        </div>
      </div>

      <p className="mt-2 text-[11px] leading-5 text-zinc-500">
        {digest?.caveat ?? "Mock Information Intelligence scoring only. No live source connection."}
      </p>
    </section>
  )
}
