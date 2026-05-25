"use client";

import { useEffect, useMemo, useState } from "react";

import Phase31_35IntelligenceLayer from "@/components/narrative/Phase31_35IntelligenceLayer";
import { buildEventChainReaction } from "@/core/narrative/eventChainReactionEngine";
import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface";
import type { RealMarketRotationResponse } from "@/core/marketDataTypes";
import type { NarrativeHeatItem, NarrativeSurface } from "@/core/narrative/narrativeTypes";

const POLL_MS = 45_000;

type FetchState = "idle" | "loading" | "live" | "partial" | "error";
type TimeframeMode = "5m" | "1h" | "4h" | "1d";

type NewsItem = {
  title?: string;
  translatedTitle?: string;
  source?: string;
  region?: string;
  sentiment?: string;
  importance?: number;
  narratives?: string[];
  timestamp?: number;
};

type UniverseNode = {
  id: string;
  label: string;
  heat: number;
  x: number;
  y: number;
  direction: string;
  sectors: string[];
  summary: string;
};

function number(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function format(value: unknown, digits = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "--";
}

function label(value?: string) {
  if (!value) return "--";
  return value.replace(/_/g, " ");
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function toneStyle(tone?: string) {
  if (tone === "RISK_ON") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
  if (tone === "RISK_OFF") return "border-red-400/40 bg-red-500/10 text-red-100";
  if (tone === "EUPHORIA") return "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100";
  if (tone === "COMPRESSION") return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/40 bg-cyan-500/10 text-cyan-100";
}

function directionStyle(direction?: string) {
  if (direction === "INFLOW") return "text-emerald-200";
  if (direction === "OUTFLOW") return "text-red-200";
  if (direction === "CHURN") return "text-amber-200";
  return "text-zinc-300";
}

function severityRank(score: number) {
  if (score >= 82) return "CRITICAL";
  if (score >= 64) return "HIGH";
  if (score >= 42) return "MEDIUM";
  return "LOW";
}

function severityStyle(score: number) {
  const rank = severityRank(score);
  if (rank === "CRITICAL") return "border-red-400/50 bg-red-500/10 text-red-100";
  if (rank === "HIGH") return "border-orange-400/50 bg-orange-500/10 text-orange-100";
  if (rank === "MEDIUM") return "border-amber-400/50 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100";
}

function riskTone(score: number) {
  if (score >= 72) return "HIGH";
  if (score >= 52) return "ELEVATED";
  return "STABLE";
}

function timeframeMultiplier(timeframe: TimeframeMode) {
  if (timeframe === "5m") return 0.84;
  if (timeframe === "1h") return 1;
  if (timeframe === "4h") return 1.12;
  return 1.22;
}

function buildNodes(heatmap: NarrativeHeatItem[], timeframe: TimeframeMode): UniverseNode[] {
  const fallback: NarrativeHeatItem[] = [
    { narrative: "AI", heat: 84, direction: "INFLOW", sectors: ["AI", "Gaming"], summary: "AI remains the strongest beta gravity." },
    { narrative: "BTC", heat: 71, direction: "MIXED", sectors: ["L1"], summary: "BTC dominance anchors the market regime." },
    { narrative: "MEME", heat: 67, direction: "CHURN", sectors: ["Meme"], summary: "Speculative beta is active but fragile." },
    { narrative: "RWA", heat: 55, direction: "INFLOW", sectors: ["RWA"], summary: "Persistent narrative, needs flow validation." },
  ];
  const source = heatmap.length ? heatmap.slice(0, 6) : fallback;
  const positions = [
    [50, 46],
    [70, 28],
    [74, 64],
    [30, 65],
    [27, 31],
    [50, 78],
  ];

  return source.map((item, index) => ({
    id: item.narrative || `node-${index}`,
    label: item.narrative || `NODE ${index + 1}`,
    heat: clamp(number(item.heat) * timeframeMultiplier(timeframe)),
    x: positions[index]?.[0] ?? 50,
    y: positions[index]?.[1] ?? 50,
    direction: item.direction,
    sectors: item.sectors ?? [],
    summary: item.summary,
  }));
}

function deriveThreat(narrative: NarrativeSurface) {
  const reflexivity = number(narrative.crossMarketReflexivity?.reflexivityScore);
  const liquidity = number(narrative.liquidityStress?.stressScore);
  const contagion = number(narrative.propagation?.stressScore ?? narrative.crossMarketReflexivity?.instabilityScore);
  const leverage = number(narrative.liquidityStress?.crowdingRisk ?? narrative.propagation?.velocityScore);
  return { reflexivity, liquidity, contagion, leverage, max: Math.max(reflexivity, liquidity, contagion, leverage) };
}

function derivePriority(narrative: NarrativeSurface, chainConfidence: number) {
  const heat = number(narrative.heatmap[0]?.heat);
  const threat = deriveThreat(narrative);
  return clamp(heat * 0.36 + threat.max * 0.42 + chainConfidence * 0.22);
}

function useNarrativeInputs() {
  const [rotationData, setRotationData] = useState<RealMarketRotationResponse | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [newsState, setNewsState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 10_000);
      try {
        setFetchState((prev) => (prev === "idle" ? "loading" : prev));
        const response = await fetch("/api/market/sector-rotation", { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as RealMarketRotationResponse;
        if (!alive) return;
        if (!response.ok || payload.ok === false) throw new Error(payload.notes?.[0] ?? `sector rotation returned ${response.status}`);
        setRotationData(payload);
        setFetchState(payload.mode === "partial" ? "partial" : "live");
        setError(null);
      } catch (err) {
        if (!alive) return;
        setFetchState("error");
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        window.clearTimeout(timeout);
      }
    };

    void load();
    timer = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const loadNews = async () => {
      try {
        setNewsState((prev) => (prev === "idle" ? "loading" : prev));
        const regions = ["kr", "en", "cn"];
        const responses = await Promise.all(
          regions.map(async (region) => {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 8_000);
            try {
              const response = await fetch(`/api/news?region=${region}&translate=false`, { cache: "no-store", signal: controller.signal });
              if (!response.ok) return [] as NewsItem[];
              const payload = await response.json();
              return Array.isArray(payload) ? (payload.slice(0, 12) as NewsItem[]) : [];
            } catch {
              return [] as NewsItem[];
            } finally {
              window.clearTimeout(timeout);
            }
          }),
        );
        if (!alive) return;
        setNewsItems(responses.flat());
        setNewsState("live");
      } catch {
        if (!alive) return;
        setNewsState("error");
      }
    };

    void loadNews();
    timer = setInterval(loadNews, POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  return { rotationData, newsItems, fetchState, newsState, error };
}

function CommandSummary({ narrative, priority, state, advanced }: { narrative: NarrativeSurface; priority: number; state: FetchState; advanced: boolean }) {
  const lead = narrative.heatmap[0];
  const second = narrative.heatmap[1];
  const phase = String(narrative.propagation?.leadPhase ?? "DORMANT");
  const threat = deriveThreat(narrative);
  const flow = lead?.sectors?.length && second?.sectors?.length ? `${lead.sectors[0]} → ${second.sectors[0]}` : `${lead?.narrative ?? "Market"} lead`;

  return (
    <div className="rounded-[1.75rem] border border-cyan-400/15 bg-zinc-950/90 p-4 shadow-[0_18px_70px_rgba(0,0,0,.35)]">
      <div className="grid gap-3 lg:grid-cols-[1.1fr_.85fr_.7fr_.9fr]">
        <div className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Market</div>
          <div className="mt-1 text-2xl font-black uppercase tracking-[0.10em] text-white">{label(narrative.tone)}</div>
          {advanced ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{state} · priority {format(priority)}</div> : null}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Lead narrative</div>
          <div className="mt-1 truncate text-2xl font-black uppercase tracking-[0.10em] text-cyan-100">{lead?.narrative ?? "Scanning"}</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{label(phase)}</div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Risk</div>
          <div className="mt-1 text-2xl font-black uppercase tracking-[0.10em] text-amber-100">{riskTone(threat.max)}</div>
          {advanced ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">max {format(threat.max)}</div> : null}
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-500">Flow</div>
          <div className="mt-1 truncate text-xl font-black uppercase tracking-[0.10em] text-emerald-100">{flow}</div>
          {advanced ? <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">{format(lead?.heat)} heat</div> : null}
        </div>
      </div>
      {advanced ? <p className="mt-3 max-w-5xl text-sm leading-6 text-zinc-400">{narrative.marketSummary}</p> : null}
    </div>
  );
}

function OperatorBrief({ narrative, chainRead, advanced }: { narrative: NarrativeSurface; chainRead: string; advanced: boolean }) {
  const lead = narrative.heatmap[0];
  const second = narrative.heatmap[1];
  const threat = deriveThreat(narrative);
  const lines = advanced
    ? [
        `${lead?.narrative ?? "Market"} is the current gravity center with heat ${format(lead?.heat)}.`,
        `${second?.narrative ?? "Secondary beta"} is the next narrative to watch.`,
        `Threat is ${riskTone(threat.max)}: liquidity ${format(threat.liquidity)}, reflexivity ${format(threat.reflexivity)}.`,
        chainRead,
      ]
    : [
        `${lead?.narrative ?? "Market"} leads the tape.`,
        `Risk is ${riskTone(threat.max).toLowerCase()}.`,
        chainRead || narrative.marketSummary,
      ];

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">AI Operator</div>
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300">{advanced ? "full read" : "3-line read"}</div>
      </div>
      <div className="mt-3 space-y-2">
        {lines.slice(0, advanced ? 4 : 3).map((line, index) => (
          <div key={`${line}-${index}`} className={`${advanced ? "rounded-2xl border border-zinc-800 bg-black/40 p-3" : "border-l border-cyan-400/25 pl-3 py-1"}`}>
            {advanced ? <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">{String(index + 1).padStart(2, "0")}</div> : null}
            <div className={`${advanced ? "mt-1 text-sm" : "text-sm"} leading-6 text-zinc-200`}>{line}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreatRadar({ narrative }: { narrative: NarrativeSurface }) {
  const threat = deriveThreat(narrative);
  const metrics = [
    { label: "Reflexivity", value: threat.reflexivity, angle: -90 },
    { label: "Liquidity", value: threat.liquidity, angle: 0 },
    { label: "Contagion", value: threat.contagion, angle: 90 },
    { label: "Leverage", value: threat.leverage, angle: 180 },
  ];
  return (
    <div className="relative overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(34,211,238,.14),transparent_58%)]" />
      <div className="relative flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Threat Radar</div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${severityStyle(threat.max)}`}>{riskTone(threat.max)}</span>
      </div>

      <div className="relative mx-auto mt-5 h-56 w-56 overflow-hidden rounded-full border border-cyan-300/20 bg-[radial-gradient(circle,rgba(34,211,238,.16),rgba(8,47,73,.08)_42%,transparent_68%)] shadow-[0_0_38px_rgba(34,211,238,.12)]">
        <div className="absolute inset-5 rounded-full border border-cyan-300/15" />
        <div className="absolute inset-11 rounded-full border border-cyan-600/12" />
        <div className="absolute inset-16 rounded-full border border-cyan-300/10" />
        <div className="qt-motion-radar-arm absolute left-1/2 top-1/2 h-[2px] w-1/2 origin-left bg-gradient-to-r from-cyan-200 via-cyan-300/70 to-transparent shadow-[0_0_18px_rgba(103,232,249,.9)]" />
        <div className="qt-motion-radar-wedge absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,rgba(34,211,238,.22)_0deg,rgba(34,211,238,.08)_34deg,transparent_72deg,transparent_360deg)]" />
        <div className="qt-motion-radar-ping absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/40" />
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-cyan-300/10" />
        <div className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-cyan-300/10" />
        {metrics.map((item, index) => {
          const radius = 24 + clamp(item.value) * 0.7;
          const x = 50 + (Math.cos((item.angle * Math.PI) / 180) * radius) / 2.35;
          const y = 50 + (Math.sin((item.angle * Math.PI) / 180) * radius) / 2.35;
          return (
            <span
              key={item.label}
              className="qt-motion-threat-dot absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-100/70 bg-cyan-200 shadow-[0_0_22px_rgba(103,232,249,.95)]"
              style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${index * 0.28}s` }}
            />
          );
        })}
      </div>

      <div className="relative mt-4 space-y-2">
        {metrics.map((item) => (
          <div key={item.label} className="grid grid-cols-[92px_1fr_38px] items-center gap-2">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">{item.label}</div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div className="qt-motion-bar h-full rounded-full bg-gradient-to-r from-cyan-400 via-cyan-200 to-emerald-300" style={{ width: `${clamp(item.value)}%` }} />
            </div>
            <div className="text-right text-xs font-black text-zinc-200">{format(item.value)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function phaseLabel(node: UniverseNode) {
  if (node.direction === "INFLOW") return "Growing";
  if (node.direction === "OUTFLOW") return "Weakening";
  if (node.direction === "CHURN") return "Rotating";
  return "Mixed";
}

function phaseHint(node: UniverseNode) {
  if (node.direction === "INFLOW") return "money moving in";
  if (node.direction === "OUTFLOW") return "money leaving";
  if (node.direction === "CHURN") return "fast handoff";
  return "unclear flow";
}

function phaseTechnical(node: UniverseNode) {
  if (node.direction === "INFLOW") return "EXPANSION";
  if (node.direction === "OUTFLOW") return "COLLAPSE";
  if (node.direction === "CHURN") return "CHURN";
  return "ROTATION";
}


type AttentionMode = "NARRATIVE" | "THREAT" | "FLOW";

function deriveAttentionMode(narrative: NarrativeSurface): AttentionMode {
  const threat = deriveThreat(narrative);
  const leadHeat = number(narrative.heatmap[0]?.heat);
  const leadDirection = narrative.heatmap[0]?.direction;
  if (threat.max >= 68) return "THREAT";
  if (leadDirection === "CHURN" || leadHeat < 58) return "FLOW";
  return "NARRATIVE";
}

function temporalState(node?: UniverseNode, timeframe: TimeframeMode = "1h") {
  if (!node) return { label: "Scanning", hint: "waiting for data", score: 0 };
  const heat = number(node.heat);
  const tfBias = timeframe === "5m" ? -4 : timeframe === "4h" ? 4 : timeframe === "1d" ? 7 : 0;
  const score = clamp(heat + tfBias);
  if (node.direction === "CHURN") return { label: "Rotating now", hint: "leadership is changing", score };
  if (node.direction === "OUTFLOW") return { label: "Fading", hint: "strength is leaving", score };
  if (score >= 74) return { label: "Accelerating", hint: "move is getting stronger", score };
  if (score >= 56) return { label: "Building", hint: "trend is still forming", score };
  return { label: "Quiet", hint: "low confirmation", score };
}

function sectorDepth(node?: UniverseNode) {
  const key = `${node?.label ?? ""} ${node?.sectors?.join(" ") ?? ""}`.toUpperCase();
  const base = [
    { symbol: "BTC", read: "anchor" },
    { symbol: "ETH", read: "beta" },
    { symbol: "SOL", read: "flow" },
  ];
  if (key.includes("AI")) return [
    { symbol: "RNDR", read: "leader" },
    { symbol: "TAO", read: "high beta" },
    { symbol: "FET", read: "breadth" },
    { symbol: "WLD", read: "retail" },
  ];
  if (key.includes("MEME")) return [
    { symbol: "DOGE", read: "liquidity" },
    { symbol: "PEPE", read: "beta" },
    { symbol: "WIF", read: "momentum" },
    { symbol: "BONK", read: "spillover" },
  ];
  if (key.includes("GAME")) return [
    { symbol: "IMX", read: "leader" },
    { symbol: "GALA", read: "beta" },
    { symbol: "SAND", read: "legacy" },
    { symbol: "AXS", read: "rebound" },
  ];
  if (key.includes("RWA")) return [
    { symbol: "ONDO", read: "leader" },
    { symbol: "MKR", read: "quality" },
    { symbol: "PENDLE", read: "yield" },
    { symbol: "ENA", read: "beta" },
  ];
  if (key.includes("DEFI")) return [
    { symbol: "UNI", read: "liquidity" },
    { symbol: "AAVE", read: "quality" },
    { symbol: "MKR", read: "credit" },
    { symbol: "LDO", read: "staking" },
  ];
  if (key.includes("L1") || key.includes("BTC")) return [
    { symbol: "BTC", read: "anchor" },
    { symbol: "ETH", read: "beta" },
    { symbol: "SOL", read: "rotation" },
    { symbol: "BNB", read: "exchange" },
  ];
  return base;
}


type CauseEffectItem = {
  cause: string;
  effect: string;
  confidence: number;
};

function buildCauseEffect(narrative: NarrativeSurface): CauseEffectItem[] {
  const lead = narrative.heatmap[0];
  const second = narrative.heatmap[1];
  const threat = deriveThreat(narrative);
  const regionalStatus = label(narrative.regionalDivergence.status).toLowerCase();
  const phase = label(String(narrative.propagation?.leadPhase ?? "quiet")).toLowerCase();

  return [
    {
      cause: `${lead?.narrative ?? "Market"} has the strongest heat and ${phase} behavior`,
      effect: `${lead?.sectors?.[0] ?? lead?.narrative ?? "Lead flow"} becomes the first thing to watch`,
      confidence: clamp(number(lead?.heat, 48)),
    },
    {
      cause: `Regional signal is ${regionalStatus}`,
      effect: regionalStatus.includes("none") ? "confirmation is still weak" : "the move has external validation",
      confidence: clamp(number(narrative.newsFusion?.validatedCount, 2) * 16 + 42),
    },
    {
      cause: `Threat pressure is ${riskTone(threat.max).toLowerCase()}`,
      effect: threat.max >= 60 ? "position sizing should stay defensive" : `${second?.narrative ?? "secondary beta"} can rotate next`,
      confidence: clamp(threat.max || 38),
    },
  ];
}

function buildTimelineCompression(narrative: NarrativeSurface) {
  const heat = narrative.heatmap.slice(0, 4);
  const sectors = heat.map((item) => item.sectors?.[0] ?? item.narrative).filter(Boolean);
  const unique = Array.from(new Set(sectors));
  const chain = unique.length >= 2 ? unique : [narrative.heatmap[0]?.narrative ?? "Market", narrative.heatmap[1]?.narrative ?? "Rotation", narrative.heatmap[2]?.narrative ?? "Risk"];
  return chain.slice(0, 4);
}

function buildInsightRead(narrative: NarrativeSurface) {
  const lead = narrative.heatmap[0];
  const threat = deriveThreat(narrative);
  const phase = String(narrative.propagation?.leadPhase ?? "DORMANT");
  if (!lead) return "Market is still scanning for a clear leading narrative.";
  if (threat.max >= 72) return `${lead.narrative} is leading, but the setup is fragile because threat pressure is elevated.`;
  if (lead.direction === "INFLOW" && number(lead.heat) >= 70) return `${lead.narrative} is attracting capital with enough strength to shape the current tape.`;
  if (lead.direction === "CHURN") return `${lead.narrative} is active, but leadership is still rotating rather than trending cleanly.`;
  if (phase.includes("EXHAUST") || lead.direction === "OUTFLOW") return `${lead.narrative} is losing quality; treat rebounds as lower-confidence until breadth returns.`;
  return `${lead.narrative} is the current lead, but confirmation is still developing.`;
}

type DecisionLens = {
  posture: "Observe" | "Prepare" | "Defend";
  primary: string;
  watch: string;
  invalidation: string;
  nextCheck: string;
};


type SelectedSignal = {
  narrative: string;
  score: number;
  status: string;
  summary: string;
};

type DecisionQueueItem = {
  id: string;
  createdAt: number;
  posture: DecisionLens["posture"];
  narrative: string;
  action: string;
  watch: string;
  invalidation: string;
  nextCheck: string;
  status: "open" | "done";
};

function buildDecisionReasons(narrative: NarrativeSurface, selectedSignal?: SelectedSignal | null) {
  const lead = narrative.heatmap[0];
  const threat = deriveThreat(narrative);
  const reasons = [
    selectedSignal
      ? `${selectedSignal.narrative} is selected from Top Signals with ${format(selectedSignal.score)} confidence.`
      : `${lead?.narrative ?? "Lead narrative"} is currently the primary attention node.`,
    `Threat state is ${riskTone(threat.max)} across reflexivity, liquidity and contagion pressure.`,
    narrative.regionalDivergence?.summary || "Regional validation is being monitored for confirmation.",
  ];
  return reasons.slice(0, 3);
}

function buildActionChecklist(lens: DecisionLens) {
  if (lens.posture === "Defend") {
    return [
      "Reduce attention to weak secondary rotations.",
      "Watch liquidity and contagion first, not upside extension.",
      "Only re-open risk if the threat strip cools on the next check.",
    ];
  }
  if (lens.posture === "Prepare") {
    return [
      "Track whether the second narrative follows the lead.",
      "Confirm breadth before treating the move as durable.",
      "Keep invalidation visible before adding complexity.",
    ];
  }
  return [
    "Do not force a directional read yet.",
    "Wait for one narrative to hold leadership through the next refresh.",
    "Use Top Signals to pick the first confirmation candidate.",
  ];
}

function createDecisionQueueItem(lens: DecisionLens, narrative: NarrativeSurface, selectedSignal?: SelectedSignal | null): DecisionQueueItem {
  const lead = selectedSignal?.narrative || narrative.heatmap[0]?.narrative || "Market";
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    posture: lens.posture,
    narrative: lead,
    action: lens.primary,
    watch: lens.watch,
    invalidation: lens.invalidation,
    nextCheck: lens.nextCheck,
    status: "open",
  };
}


function buildDecisionLens(narrative: NarrativeSurface): DecisionLens {
  const lead = narrative.heatmap[0];
  const second = narrative.heatmap[1];
  const threat = deriveThreat(narrative);
  const leadName = lead?.narrative ?? "Market";
  const secondName = second?.narrative ?? "secondary flow";
  const leadHeat = number(lead?.heat);

  if (threat.max >= 72 || lead?.direction === "OUTFLOW") {
    return {
      posture: "Defend",
      primary: `${leadName} is active, but risk pressure is high. Keep the screen focused on threat and liquidity quality.`,
      watch: `Watch whether ${leadName} loses leadership or spills stress into ${secondName}.`,
      invalidation: "Threat cools below elevated and lead flow stops fading.",
      nextCheck: "Liquidity, leverage, contagion",
    };
  }

  if (lead?.direction === "INFLOW" && leadHeat >= 68) {
    return {
      posture: "Prepare",
      primary: `${leadName} has enough strength to define the current tape. Look for confirmation instead of more noise.`,
      watch: `Watch if ${secondName} follows; that would confirm broader participation.`,
      invalidation: `${leadName} heat drops or flow rotates into churn.`,
      nextCheck: "Breadth, secondary flow, funding",
    };
  }

  return {
    posture: "Observe",
    primary: `${leadName} is visible, but the market has not produced a clean directional read yet.`,
    watch: `Watch for a clean handoff from ${leadName} into ${secondName}.`,
    invalidation: "No single narrative holds leadership for the next refresh cycle.",
    nextCheck: "Lead heat, rotation path, news validation",
  };
}

function orbitPalette(index: number, node: UniverseNode) {
  const key = `${node.label}`.toUpperCase();
  if (index === 0) {
    return {
      core: "rgb(6,182,212)",
      deep: "rgba(6,182,212,.24)",
      soft: "rgba(6,182,212,.08)",
      text: "text-cyan-100",
      border: "border-cyan-300/80",
    };
  }
  if (key.includes("AI")) {
    return { core: "rgb(167,139,250)", deep: "rgba(124,58,237,.28)", soft: "rgba(124,58,237,.08)", text: "text-violet-100", border: "border-violet-300/75" };
  }
  if (key.includes("MEME")) {
    return { core: "rgb(96,165,250)", deep: "rgba(37,99,235,.28)", soft: "rgba(37,99,235,.08)", text: "text-blue-100", border: "border-blue-300/75" };
  }
  if (key.includes("PAY") || key.includes("DEFI")) {
    return { core: "rgb(52,211,153)", deep: "rgba(5,150,105,.28)", soft: "rgba(5,150,105,.08)", text: "text-emerald-100", border: "border-emerald-300/75" };
  }
  if (key.includes("RWA")) {
    return { core: "rgb(245,158,11)", deep: "rgba(217,119,6,.30)", soft: "rgba(217,119,6,.08)", text: "text-amber-100", border: "border-amber-300/75" };
  }
  if (key.includes("GAME") || key.includes("GAMING")) {
    return { core: "rgb(251,113,133)", deep: "rgba(225,29,72,.28)", soft: "rgba(225,29,72,.08)", text: "text-rose-100", border: "border-rose-300/75" };
  }
  if (key.includes("INFRA")) {
    return { core: "rgb(244,114,182)", deep: "rgba(219,39,119,.28)", soft: "rgba(219,39,119,.08)", text: "text-pink-100", border: "border-pink-300/75" };
  }
  return { core: "rgb(34,211,238)", deep: "rgba(8,145,178,.24)", soft: "rgba(8,145,178,.08)", text: "text-cyan-100", border: "border-cyan-300/75" };
}

function UniverseMap({ nodes, timeframe, narrative, calmMode }: { nodes: UniverseNode[]; timeframe: TimeframeMode; narrative: NarrativeSurface; calmMode: boolean }) {
  const lead = nodes[0];
  const satellites = nodes.slice(1, 7);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedNode = nodes.find((node) => node.id === selectedId) ?? lead;
  const attentionMode = deriveAttentionMode(narrative);
  const threat = deriveThreat(narrative);
  const selectedTemporal = temporalState(selectedNode, timeframe);
  const selectedDepth = sectorDepth(selectedNode);
  const orbitPositions = [
    { x: 50, y: 17 },
    { x: 78, y: 33 },
    { x: 76, y: 68 },
    { x: 50, y: 82 },
    { x: 23, y: 68 },
    { x: 22, y: 32 },
  ];
  const maxHeat = Math.max(...nodes.map((node) => number(node.heat)), 1);
  const focusName = lead?.label ?? "Market";
  const focusRead = lead ? `${temporalState(lead, timeframe).label} · ${phaseHint(lead)}` : "scanning";

  const attention = (node: UniverseNode, index: number) => {
    if (index === 0) {
      const motion = calmMode && attentionMode !== "NARRATIVE" ? 0.42 : 1;
      return { weight: 1, opacity: 1, scale: 1, motion, muted: false };
    }
    const relativeHeat = clamp(number(node.heat) / maxHeat, 0, 1);
    const directionBoost = node.direction === "INFLOW" ? 0.1 : node.direction === "CHURN" ? 0.06 : node.direction === "OUTFLOW" ? -0.04 : 0;
    const rankBoost = index === 1 ? 0.2 : index === 2 ? 0.08 : 0;
    const modeBoost = attentionMode === "FLOW" && node.direction === "CHURN" ? 0.18 : attentionMode === "THREAT" ? -0.04 : 0;
    const selectedBoost = selectedNode?.id === node.id ? 0.18 : 0;
    const weight = clamp(relativeHeat * 0.64 + rankBoost + directionBoost + modeBoost + selectedBoost, 0.12, 0.9);
    const calmPenalty = calmMode && weight < 0.72 ? 0.42 : 1;
    return {
      weight,
      opacity: clamp((0.18 + weight * 0.82) * calmPenalty, 0.14, 0.94),
      scale: clamp(0.78 + weight * 0.33, 0.78, 1.13),
      motion: clamp((0.22 + weight * 0.9) * calmPenalty, 0.16, 1.08),
      muted: weight < 0.45,
    };
  };

  return (
    <div className="relative h-[720px] min-h-[620px] overflow-hidden rounded-[2rem] border border-cyan-500/15 bg-[radial-gradient(circle_at_center,rgba(2,132,199,.12),rgba(2,6,23,.96)_48%,#00030a_100%)] shadow-[inset_0_0_80px_rgba(8,47,73,.14)]">
      <div className="pointer-events-none absolute left-5 top-5 z-30 max-w-[340px] rounded-2xl border border-cyan-300/12 bg-black/45 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[9px] font-black uppercase tracking-[0.32em] text-cyan-400/80">Primary Focus</div>
          <div className="rounded-full border border-zinc-800 bg-black/45 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-zinc-500">{attentionMode}</div>
        </div>
        <div className="mt-1 truncate text-2xl font-black uppercase tracking-[0.14em] text-white">{focusName}</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-500">{focusRead}</div>
        <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-700">Calm {calmMode ? "on" : "off"} · threat {riskTone(threat.max)}</div>
      </div>

      <div className="qt-motion-scanline pointer-events-none absolute inset-0 z-20 opacity-14" />
      <div className="absolute inset-0 opacity-16 [background-image:linear-gradient(rgba(34,211,238,.022)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.022)_1px,transparent_1px)] [background-size:48px_48px]" />
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/10" />
      <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/8" />
      <div className="absolute left-1/2 top-1/2 h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-400/7" />
      <div className="qt-motion-universe-sweep absolute left-1/2 top-1/2 h-[36rem] w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,.06)_18deg,rgba(34,211,238,.02)_36deg,transparent_58deg,transparent_360deg)]" />

      {Array.from({ length: calmMode ? 7 : 14 }).map((_, index) => (
        <span
          key={`orbit-particle-${index}`}
          className="qt-motion-particle absolute rounded-full bg-cyan-400/25"
          style={{
            width: `${2 + (index % 2)}px`,
            height: `${2 + (index % 2)}px`,
            left: `${12 + ((index * 23) % 76)}%`,
            top: `${14 + ((index * 31) % 70)}%`,
            animationDelay: `${index * 0.22}s`,
            animationDuration: `${7 + (index % 5) * 0.75}s`,
          }}
        />
      ))}

      {lead && satellites.map((node, index) => {
        const positionIndex = index + 1;
        const pos = orbitPositions[index] ?? orbitPositions[0];
        const palette = orbitPalette(positionIndex, node);
        const priority = attention(node, positionIndex);
        const dx = pos.x - 50;
        const dy = pos.y - 50;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        return (
          <div
            key={`orbit-link-${node.id}`}
            className="absolute z-0 h-[2px] origin-left rounded-full transition-opacity duration-700"
            style={{
              left: "50%",
              top: "50%",
              width: `${length}%`,
              transform: `rotate(${angle}deg)`,
              background: `linear-gradient(90deg, rgba(6,182,212,.13), ${palette.core}${priority.muted ? "33" : "77"}, transparent)`,
              opacity: priority.opacity * 0.38,
            }}
          >
            <span
              className="qt-motion-beam-light absolute left-0 top-1/2 h-1 w-8 -translate-y-1/2 rounded-full"
              style={{
                backgroundColor: palette.core,
                boxShadow: `0 0 ${priority.muted ? 5 : 9}px ${palette.core}`,
                animationDelay: `${index * 0.26}s`,
                animationDuration: `${2.2 / priority.motion}s`,
                opacity: priority.opacity,
              }}
            />
          </div>
        );
      })}

      <svg className="pointer-events-none absolute inset-0 z-10 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id="qt-soft-flow-priority">
            <feGaussianBlur stdDeviation="0.24" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {lead && satellites.map((node, index) => {
          const positionIndex = index + 1;
          const pos = orbitPositions[index] ?? orbitPositions[0];
          const palette = orbitPalette(positionIndex, node);
          const priority = attention(node, positionIndex);
          const pathId = `flow-lead-${index}`;
          const curve = `M 50 50 Q ${(50 + pos.x) / 2 + (index % 2 === 0 ? 7 : -7)} ${(50 + pos.y) / 2 + (index % 3 === 0 ? -7 : 7)} ${pos.x} ${pos.y}`;
          return (
            <g key={pathId} opacity={priority.opacity}>
              <path id={pathId} d={curve} fill="none" stroke={palette.core} strokeWidth={priority.muted ? "0.12" : "0.24"} strokeLinecap="round" opacity={priority.muted ? "0.08" : "0.22"} />
              <circle r={priority.muted ? "0.35" : "0.65"} fill={palette.core} filter="url(#qt-soft-flow-priority)" opacity={priority.muted ? "0.38" : "0.88"}>
                <animateMotion dur={`${(3.2 + index * 0.24) / priority.motion}s`} repeatCount="indefinite" begin={`${index * 0.22}s`}>
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}
        {satellites.slice(0, -1).map((node, index) => {
          const from = orbitPositions[index] ?? orbitPositions[0];
          const to = orbitPositions[index + 1] ?? orbitPositions[1];
          const palette = orbitPalette(index + 1, node);
          const priority = attention(node, index + 1);
          const pathId = `flow-orbit-${index}`;
          const curve = `M ${from.x} ${from.y} Q 50 50 ${to.x} ${to.y}`;
          return (
            <g key={pathId} opacity={priority.opacity * 0.62}>
              <path id={pathId} d={curve} fill="none" stroke={palette.core} strokeWidth="0.12" strokeLinecap="round" opacity="0.1" />
              {!priority.muted ? (
                <circle r="0.38" fill={palette.core} filter="url(#qt-soft-flow-priority)" opacity="0.58">
                  <animateMotion dur={`${4.8 + index * 0.3}s`} repeatCount="indefinite" begin={`${0.5 + index * 0.36}s`}>
                    <mpath href={`#${pathId}`} />
                  </animateMotion>
                </circle>
              ) : null}
            </g>
          );
        })}
      </svg>

      {lead ? (() => {
        const palette = orbitPalette(0, lead);
        return (
          <button type="button" onClick={() => setSelectedId(lead.id)} className="absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 text-left">
            <div className="qt-motion-node-float relative grid place-items-center">
              <div className="qt-motion-node-ring absolute h-44 w-44 rounded-full border-2 opacity-32" style={{ borderColor: palette.core }} />
              <div className="relative grid h-40 w-40 place-items-center rounded-full border-[11px] bg-black/84" style={{ borderColor: palette.core, boxShadow: `inset 0 0 34px ${palette.deep}, 0 0 18px ${palette.deep}` }}>
                <div className="absolute h-17 w-17 rounded-full border-[10px] border-black bg-black" />
                <div className="relative h-7 w-7 rounded-full" style={{ backgroundColor: palette.core, boxShadow: `0 0 9px ${palette.deep}` }} />
              </div>
              <div className="mt-4 text-center">
                <div className={`text-xl font-black uppercase tracking-[0.18em] ${palette.text}`}>{lead.label}</div>
                <div className="mt-1 text-[10px] font-black uppercase tracking-[0.20em] text-zinc-500">{format(lead.heat)} · {phaseLabel(lead)}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">{phaseHint(lead)}</div>
              </div>
            </div>
          </button>
        );
      })() : null}

      {satellites.map((node, index) => {
        const positionIndex = index + 1;
        const pos = orbitPositions[index] ?? orbitPositions[0];
        const palette = orbitPalette(positionIndex, node);
        const priority = attention(node, positionIndex);
        const size = 92 * priority.scale;
        const inner = 38 * priority.scale;
        return (
          <button
            key={node.id}
            type="button"
            onClick={() => setSelectedId(node.id)}
            className="qt-motion-node-float absolute z-20 grid -translate-x-1/2 -translate-y-1/2 place-items-center transition-all duration-700"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              opacity: priority.opacity,
              filter: priority.muted ? "saturate(.62) brightness(.72)" : "saturate(1.18) brightness(1.04)",
              animationDuration: `${5.8 / priority.motion}s`,
            }}
          >
            <div className="qt-motion-node-ring absolute rounded-full border opacity-18" style={{ width: size + 18, height: size + 18, borderColor: palette.core, animationDuration: `${3.2 / priority.motion}s` }} />
            <div className="relative grid place-items-center rounded-full border-[7px] bg-black/78" style={{ width: size, height: size, borderColor: palette.core, boxShadow: `inset 0 0 ${priority.muted ? 10 : 20}px ${palette.deep}, 0 0 ${priority.muted ? 5 : 14}px ${palette.deep}` }}>
              <div className="rounded-full border-[7px] border-black bg-black" style={{ width: inner, height: inner }} />
              <div className="absolute h-4 w-4 rounded-full" style={{ backgroundColor: palette.core, opacity: priority.muted ? 0.65 : 1 }} />
            </div>
            <div className="mt-2 max-w-[150px] text-center">
              <div className={`truncate text-sm font-black uppercase tracking-[0.16em] ${priority.muted ? "text-zinc-500" : palette.text}`}>{node.label}</div>
              <div className="mt-1 text-[9px] font-black uppercase tracking-[0.13em] text-zinc-600">{format(node.heat)} · {phaseLabel(node)}</div>
              {!priority.muted ? <div className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-700">{phaseHint(node)}</div> : null}
            </div>
          </button>
        );
      })}

      <div className="pointer-events-none absolute bottom-5 left-5 z-30 rounded-2xl border border-zinc-800/80 bg-black/42 px-4 py-3 backdrop-blur-xl">
        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">Attention Weighting</div>
        <div className="mt-2 grid gap-1 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-500">
          <div><span className="text-cyan-200">Primary</span> = full color + motion</div>
          <div><span className="text-zinc-400">Secondary</span> = context fade</div>
          <div><span className="text-zinc-600">Weak</span> = quiet background</div>
        </div>
      </div>

      <div className="absolute right-5 top-5 z-30 w-[310px] rounded-2xl border border-zinc-800/80 bg-black/50 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-2">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">Why it matters</div>
          <div className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-300">{selectedTemporal.label}</div>
        </div>
        <div className="mt-2 truncate text-lg font-black uppercase tracking-[0.10em] text-white">{selectedNode?.label ?? "Market"}</div>
        <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.13em] text-zinc-500">{selectedTemporal.hint}</div>
        <p className="mt-3 line-clamp-3 text-xs leading-5 text-zinc-400">{selectedNode?.summary ?? "No read available yet."}</p>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {selectedDepth.map((item) => (
            <div key={item.symbol} className="rounded-xl border border-zinc-800 bg-black/45 px-2 py-2 text-center">
              <div className="text-[10px] font-black uppercase text-zinc-100">{item.symbol}</div>
              <div className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.10em] text-zinc-600">{item.read}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-5 right-5 z-30 rounded-2xl border border-zinc-800/80 bg-black/42 px-4 py-3 backdrop-blur-xl">
        <div className="text-[9px] font-black uppercase tracking-[0.28em] text-zinc-600">Reading Guide</div>
        <div className="mt-2 grid gap-1 text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-500">
          <div><span className="text-emerald-300">Growing</span> = money moving in</div>
          <div><span className="text-amber-300">Rotating</span> = fast handoff</div>
          <div><span className="text-rose-300">Weakening</span> = money leaving</div>
        </div>
      </div>
    </div>
  );
}


function InsightLayer({ narrative }: { narrative: NarrativeSurface }) {
  const insight = buildInsightRead(narrative);
  const causes = buildCauseEffect(narrative);
  const top = causes[0];

  return (
    <div className="rounded-[1.5rem] border border-cyan-400/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.10),rgba(9,9,11,.90)_48%,rgba(0,0,0,.92))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">AI Insight</div>
        <div className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-cyan-200">meaning</div>
      </div>
      <p className="mt-3 text-base font-bold leading-7 text-zinc-100">{insight}</p>
      {top ? (
        <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/35 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.24em] text-zinc-600">Main reason</div>
          <div className="mt-1 text-sm leading-6 text-zinc-300">{top.cause}</div>
          <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.15em] text-cyan-300">→ {top.effect}</div>
        </div>
      ) : null}
    </div>
  );
}

function DecisionLensPanel({
  narrative,
  selectedSignal,
  onPin,
}: {
  narrative: NarrativeSurface;
  selectedSignal?: SelectedSignal | null;
  onPin: (lens: DecisionLens) => void;
}) {
  const lens = buildDecisionLens(narrative);
  const checklist = buildActionChecklist(lens);
  const reasons = buildDecisionReasons(narrative, selectedSignal);
  const postureClass =
    lens.posture === "Defend"
      ? "border-red-400/35 bg-red-500/10 text-red-100"
      : lens.posture === "Prepare"
        ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-100"
        : "border-cyan-400/35 bg-cyan-500/10 text-cyan-100";

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Decision Lens</div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-600">interpretation → action → tracking</div>
        </div>
        <div className={`rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${postureClass}`}>{lens.posture}</div>
      </div>

      {selectedSignal ? (
        <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-300">Selected Signal</div>
          <div className="mt-1 text-sm font-black uppercase text-white">{selectedSignal.narrative}</div>
          <div className="mt-1 text-xs leading-5 text-cyan-100/80">{selectedSignal.summary}</div>
        </div>
      ) : null}

      <p className="mt-3 text-sm font-bold leading-6 text-zinc-100">{lens.primary}</p>

      <div className="mt-3 grid gap-2">
        {reasons.map((reason, index) => (
          <div key={`${reason}-${index}`} className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Reason {index + 1}</div>
            <div className="mt-1 text-xs leading-5 text-zinc-300">{reason}</div>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-zinc-800 bg-black/35 p-3">
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Workflow Checklist</div>
          <NextCheckCountdown />
        </div>
        <div className="mt-3 grid gap-2">
          {checklist.map((item, index) => (
            <div key={item} className="flex gap-2 text-xs leading-5 text-zinc-300">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-400/25 bg-cyan-500/10 text-[10px] font-black text-cyan-200">{index + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {[
          ["Watch", lens.watch],
          ["Invalidation", lens.invalidation],
          ["Next check", lens.nextCheck],
        ].map(([title, body]) => (
          <div key={title} className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">{title}</div>
            <div className="mt-1 text-xs leading-5 text-zinc-300">{body}</div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onPin(lens)}
        className="mt-3 w-full rounded-2xl border border-cyan-400/25 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-500/20"
      >
        Pin to Decision Queue
      </button>
    </div>
  );
}

function NextCheckCountdown() {
  const [seconds, setSeconds] = useState(15 * 60);

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((value) => (value <= 1 ? 15 * 60 : value - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return (
    <div className="rounded-full border border-zinc-800 bg-zinc-950 px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-400">
      Next {minutes}:{String(rest).padStart(2, "0")}
    </div>
  );
}

function DecisionQueuePanel({
  items,
  onToggle,
  onClearDone,
}: {
  items: DecisionQueueItem[];
  onToggle: (id: string) => void;
  onClearDone: () => void;
}) {
  if (!items.length) {
    return (
      <div className="rounded-[1.25rem] border border-zinc-900 bg-zinc-950/45 p-3 text-xs leading-5 text-zinc-600">
        Decision Queue is empty. Pin the current read when there is something worth tracking.
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/75 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Decision Queue</div>
        <button type="button" onClick={onClearDone} className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 hover:text-zinc-200">Clear Done</button>
      </div>
      <div className="mt-3 grid gap-2">
        {items.slice(0, 5).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onToggle(item.id)}
            className={`rounded-2xl border p-3 text-left transition ${item.status === "done" ? "border-zinc-900 bg-black/25 opacity-45" : "border-zinc-800 bg-black/40 hover:border-cyan-400/25"}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-200">{item.narrative}</div>
              <div className="text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">{item.posture}</div>
            </div>
            <div className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-300">{item.action}</div>
            <div className="mt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-zinc-600">Invalidation: {item.invalidation}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CauseEffectLayer({ narrative, compact = false }: { narrative: NarrativeSurface; compact?: boolean }) {
  const items = buildCauseEffect(narrative);
  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Cause → Effect</div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">why now</div>
      </div>
      <div className="mt-4 grid gap-2">
        {items.slice(0, compact ? 2 : 3).map((item, index) => (
          <div key={`${item.cause}-${index}`} className="rounded-2xl border border-zinc-800 bg-black/35 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-600">Reason {index + 1}</div>
              <div className="text-[10px] font-black text-zinc-500">{format(item.confidence)}</div>
            </div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">{item.cause}</div>
            <div className="mt-2 border-l border-cyan-400/25 pl-3 text-xs font-bold uppercase tracking-[0.12em] text-cyan-200">{item.effect}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineCompressionStrip({ narrative }: { narrative: NarrativeSurface }) {
  const chain = buildTimelineCompression(narrative);
  return (
    <div className="rounded-[1.25rem] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-2 text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Compressed path</span>
        {chain.map((item, index) => (
          <div key={`${item}-${index}`} className="flex items-center gap-2">
            <span className={`${index === 0 ? "border-cyan-300/45 bg-cyan-500/10 text-cyan-100" : "border-zinc-800 bg-black/35 text-zinc-300"} rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em]`}>{item}</span>
            {index < chain.length - 1 ? <span className="text-cyan-500/60">→</span> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function MinimalTacticalMode({ narrative }: { narrative: NarrativeSurface }) {
  const lead = narrative.heatmap[0];
  const threat = deriveThreat(narrative);
  return (
    <div className="rounded-[1.25rem] border border-zinc-800 bg-black/55 px-4 py-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.26em] text-zinc-600">Focus</div>
          <div className="mt-1 truncate text-lg font-black uppercase tracking-[0.12em] text-cyan-100">{lead?.narrative ?? "Scanning"}</div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.26em] text-zinc-600">Why</div>
          <div className="mt-1 truncate text-sm font-bold text-zinc-300">{buildCauseEffect(narrative)[0]?.effect ?? "Waiting for confirmation"}</div>
        </div>
        <div>
          <div className="text-[9px] font-black uppercase tracking-[0.26em] text-zinc-600">Risk</div>
          <div className={`mt-1 inline-flex rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${severityStyle(threat.max)}`}>{riskTone(threat.max)}</div>
        </div>
      </div>
    </div>
  );
}

function SignalMatrix({
  narrative,
  selectedNarrative,
  onSelect,
}: {
  narrative: NarrativeSurface;
  selectedNarrative?: string | null;
  onSelect: (signal: SelectedSignal) => void;
}) {
  const rows = (narrative.newsFusion?.validation?.length ? narrative.newsFusion.validation : narrative.heatmap.map((item) => ({ narrative: item.narrative, validationScore: item.heat, status: item.direction, summary: item.summary }))).slice(0, 5);
  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Top Signals</div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">CLICK TO FOCUS</div>
      </div>
      <div className="mt-4 grid gap-2">
        {rows.map((row, index) => {
          const score = number(row.validationScore);
          const selected = selectedNarrative === row.narrative;
          return (
            <button
              type="button"
              key={`${row.narrative}-${index}`}
              onClick={() => onSelect({ narrative: row.narrative, score, status: String(row.status), summary: row.summary })}
              className={`grid grid-cols-[28px_1fr_74px_46px] items-center gap-3 rounded-2xl border p-3 text-left transition ${selected ? "border-cyan-300/45 bg-cyan-500/10" : "border-zinc-800 bg-black/40 hover:border-cyan-400/25"}`}
            >
              <div className="text-xs font-black text-zinc-600">{index + 1}</div>
              <div className="min-w-0"><div className="truncate text-sm font-black uppercase text-white">{row.narrative}</div><div className="truncate text-[11px] text-zinc-500">{row.summary}</div></div>
              <div className={`rounded-full border px-2 py-1 text-center text-[10px] font-black uppercase ${severityStyle(score)}`}>{String(row.status).replace(/_/g, " ")}</div>
              <div className="text-right text-sm font-black text-cyan-100">{format(score)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventChainCompact({ narrative }: { narrative: NarrativeSurface }) {
  const chain = buildEventChainReaction(narrative);
  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Event Chain</div>
          <div className="mt-1 text-sm text-zinc-400">Macro → BTC → Narrative → Regional → Derivatives → Risk</div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${severityStyle(chain.confidence)}`}>{chain.severity}</span>
      </div>
      <div className="mt-4 grid gap-2 md:grid-cols-6">
        {chain.nodes.slice(0, 6).map((node, index) => (
          <div key={node.id} className="rounded-2xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[9px] font-black uppercase tracking-[0.16em] text-zinc-600">{String(index + 1).padStart(2, "0")}</div>
            <div className="mt-1 truncate text-xs font-black uppercase text-white">{node.label}</div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900"><div className="h-full rounded-full bg-cyan-300" style={{ width: `${clamp(number(node.score))}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ControlStrip({ timeframe, setTimeframe, compact, setCompact, advanced, setAdvanced, calmMode, setCalmMode }: { timeframe: TimeframeMode; setTimeframe: (value: TimeframeMode) => void; compact: boolean; setCompact: (value: boolean) => void; advanced: boolean; setAdvanced: (value: boolean) => void; calmMode: boolean; setCalmMode: (value: boolean) => void }) {
  const timeframes: TimeframeMode[] = ["5m", "1h", "4h", "1d"];
  return (
    <div className="sticky top-0 z-30 mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-zinc-800 bg-black/85 px-4 py-3 backdrop-blur-xl">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Tactical View · minimal by default</div>
        <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-700">Advanced mode brings back detail, replay, memory and diagnostics.</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {timeframes.map((item) => (
          <button key={item} type="button" onClick={() => setTimeframe(item)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${timeframe === item ? "border-cyan-300/50 bg-cyan-500/10 text-cyan-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:text-zinc-200"}`}>{item}</button>
        ))}
        <button type="button" onClick={() => setCompact(!compact)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${compact ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500"}`}>Compact {compact ? "On" : "Off"}</button>
        <button type="button" onClick={() => setCalmMode(!calmMode)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${calmMode ? "border-sky-300/50 bg-sky-500/10 text-sky-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:text-zinc-200"}`}>Calm {calmMode ? "On" : "Off"}</button>
        <button type="button" onClick={() => setAdvanced(!advanced)} className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${advanced ? "border-fuchsia-300/50 bg-fuchsia-500/10 text-fuchsia-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:text-zinc-200"}`}>Advanced {advanced ? "On" : "Off"}</button>
      </div>
    </div>
  );
}

export default function NarrativeIntelligenceSurface() {
  const { rotationData, newsItems, fetchState, newsState, error } = useNarrativeInputs();
  const [timeframe, setTimeframe] = useState<TimeframeMode>("1h");
  const [compact, setCompact] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [calmMode, setCalmMode] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<SelectedSignal | null>(null);
  const [decisionQueue, setDecisionQueue] = useState<DecisionQueueItem[]>([]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("qt:narrative:advanced");
      const savedCalm = window.localStorage.getItem("qt:narrative:calm");
      const savedQueue = window.localStorage.getItem("qt:narrative:decisionQueue");
      if (saved === "1") setAdvanced(true);
      if (savedCalm === "0") setCalmMode(false);
      if (savedQueue) setDecisionQueue(JSON.parse(savedQueue));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("qt:narrative:advanced", advanced ? "1" : "0");
    } catch {}
  }, [advanced]);

  useEffect(() => {
    try {
      window.localStorage.setItem("qt:narrative:calm", calmMode ? "1" : "0");
    } catch {}
  }, [calmMode]);


  useEffect(() => {
    try {
      window.localStorage.setItem("qt:narrative:decisionQueue", JSON.stringify(decisionQueue.slice(0, 20)));
    } catch {}
  }, [decisionQueue]);

  const narrative = useMemo<NarrativeSurface>(() => generateNarrativeSurface(rotationData, newsItems), [rotationData, newsItems]);
  const nodes = useMemo(() => buildNodes(narrative.heatmap, timeframe), [narrative.heatmap, timeframe]);
  const chain = useMemo(() => buildEventChainReaction(narrative), [narrative]);
  const priority = useMemo(() => derivePriority(narrative, chain.confidence), [narrative, chain.confidence]);

  const pinDecision = (lens: DecisionLens) => {
    setDecisionQueue((items) => [createDecisionQueueItem(lens, narrative, selectedSignal), ...items].slice(0, 20));
  };

  const toggleDecision = (id: string) => {
    setDecisionQueue((items) => items.map((item) => (item.id === id ? { ...item, status: item.status === "done" ? "open" : "done" } : item)));
  };

  const clearDone = () => {
    setDecisionQueue((items) => items.filter((item) => item.status !== "done"));
  };

  return (
    <section className="min-h-full bg-black p-3 text-zinc-50">
      <ControlStrip timeframe={timeframe} setTimeframe={setTimeframe} compact={compact} setCompact={setCompact} advanced={advanced} setAdvanced={setAdvanced} calmMode={calmMode} setCalmMode={setCalmMode} />
      <CommandSummary narrative={narrative} priority={priority} state={fetchState} advanced={advanced} />
      <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_.72fr]">
        <TimelineCompressionStrip narrative={narrative} />
        <MinimalTacticalMode narrative={narrative} />
      </div>
      {error ? <div className="mt-3 rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">{error}</div> : null}

      <div className={`mt-3 grid gap-3 ${compact ? "xl:grid-cols-[270px_minmax(520px,1fr)_270px]" : "xl:grid-cols-[320px_minmax(620px,1fr)_320px]"}`}>
        <div className="space-y-3">
          <InsightLayer narrative={narrative} />
          <DecisionLensPanel narrative={narrative} selectedSignal={selectedSignal} onPin={pinDecision} />
          <DecisionQueuePanel items={decisionQueue} onToggle={toggleDecision} onClearDone={clearDone} />
          <OperatorBrief narrative={narrative} chainRead={chain.operatorRead || narrative.marketSummary} advanced={advanced} />
          {advanced ? (
            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/85 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Regional Validation</div>
              <div className="mt-3 text-lg font-black uppercase text-cyan-100">{label(narrative.regionalDivergence.status)}</div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{narrative.regionalDivergence.summary}</p>
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">News {newsState}</div>
            </div>
          ) : null}
        </div>

        <UniverseMap nodes={nodes} timeframe={timeframe} narrative={narrative} calmMode={calmMode} />

        <div className="space-y-3">
          <ThreatRadar narrative={narrative} />
          <CauseEffectLayer narrative={narrative} compact={!advanced} />
          <SignalMatrix narrative={narrative} selectedNarrative={selectedSignal?.narrative} onSelect={setSelectedSignal} />
        </div>
      </div>

      {advanced ? (
        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr_.8fr]">
          <EventChainCompact narrative={narrative} />
          <details open className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/70 p-4">
            <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">Advanced Drilldown / Replay / Memory</summary>
            <div className="mt-4"><Phase31_35IntelligenceLayer narrative={narrative} /></div>
          </details>
        </div>
      ) : (
        <div className="mt-3 rounded-[1.25rem] border border-zinc-900 bg-zinc-950/45 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
          Minimal mode hides replay, memory, regional diagnostics and deep metrics. Turn Advanced On for full terminal detail.
        </div>
      )}

      <style jsx>{`
        .qt-sweep { animation: qt-spin 7s linear infinite; }
        .qt-node { animation: qt-float 5.5s ease-in-out infinite; }
        .qt-pulse { animation: qt-pulse 2.6s ease-in-out infinite; }
        .qt-flow { animation: qt-flow 2.2s ease-in-out infinite; }
        .qt-particle { animation: qt-drift 6.4s ease-in-out infinite; }
        @keyframes qt-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
        @keyframes qt-float { 0%,100% { transform: translate(-50%, -50%) translateY(0); } 50% { transform: translate(-50%, -50%) translateY(-8px); } }
        @keyframes qt-pulse { 0%,100% { transform: translate(-50%, -50%) scale(.84); opacity:.08; } 50% { transform: translate(-50%, -50%) scale(1.26); opacity:.22; } }
        @keyframes qt-flow { 0%,100% { filter: brightness(.8); opacity:.28; } 50% { filter: brightness(1.8); opacity:.88; } }
        @keyframes qt-drift { 0%,100% { transform: translate3d(0,0,0) scale(.72); opacity:.22; } 50% { transform: translate3d(18px,-14px,0) scale(1.35); opacity:.88; } }
      `}</style>
    </section>
  );
}
