"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Phase31_35IntelligenceLayer from "@/components/narrative/Phase31_35IntelligenceLayer";
import { generateNarrativeSurface } from "@/core/narrative/generateNarrativeSurface";
import { buildEventChainReaction } from "@/core/narrative/eventChainReactionEngine";
import type { EventChainReaction } from "@/core/narrative/eventChainReactionEngine";
import type { RealMarketRotationResponse } from "@/core/marketDataTypes";
import type {
  NarrativeHeatItem,
  NarrativeSurface,
} from "@/core/narrative/narrativeTypes";

const POLL_MS = 45000;

type FetchState = "idle" | "loading" | "live" | "partial" | "error";
type FocusMode =
  | "overview"
  | "universe"
  | "operator"
  | "threat"
  | "signals"
  | "chain";
type TimeframeMode = "5m" | "1h" | "4h" | "1d";
type WorkspacePreset = "COMMAND" | "UNIVERSE" | "RISK" | "REPLAY";
type PanelKey =
  | "operator"
  | "universe"
  | "threat"
  | "chain"
  | "signals"
  | "drilldown";
type PanelVisibility = Record<PanelKey, boolean>;

const WORKSPACE_STORAGE_KEY = "quantterminal:narrative-workspace:v1";
const SNAPSHOT_STORAGE_KEY = "quantterminal:narrative-session-snapshots:v1";
const DECISION_STORAGE_KEY = "quantterminal:narrative-decision-queue:v1";
const DEFAULT_PANEL_VISIBILITY: PanelVisibility = {
  operator: true,
  universe: true,
  threat: true,
  chain: true,
  signals: true,
  drilldown: false,
};

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

type DecisionQueueItem = {
  id: string;
  createdAt: number;
  narrative: string;
  action: "WATCH" | "INVESTIGATE" | "RISK_REVIEW" | "FOLLOW_UP";
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN" | "DONE";
  note: string;
  score: number;
};

type IntelligenceSnapshot = {
  id: string;
  createdAt: number;
  title: string;
  tone: string;
  leadNarrative: string;
  leadPhase: string;
  priority: string;
  priorityScore: number;
  chainSeverity: string;
  confidence: number;
  operatorRead: string;
  threat: {
    reflexivity: number;
    liquidity: number;
    contagion: number;
    leverage: number;
  };
  topSignals: { narrative: string; score: number; status: string }[];
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
  if (tone === "RISK_ON")
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100";
  if (tone === "RISK_OFF")
    return "border-red-400/50 bg-red-500/10 text-red-100";
  if (tone === "EUPHORIA")
    return "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-100";
  if (tone === "COMPRESSION")
    return "border-amber-400/50 bg-amber-500/10 text-amber-100";
  return "border-cyan-400/50 bg-cyan-500/10 text-cyan-100";
}

function riskStyle(score: number) {
  if (score >= 72) return "border-red-400/40 bg-red-500/10 text-red-100";
  if (score >= 52) return "border-amber-400/40 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/40 bg-emerald-500/10 text-emerald-100";
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

function severityTextStyle(score: number) {
  const rank = severityRank(score);
  if (rank === "CRITICAL") return "text-red-200";
  if (rank === "HIGH") return "text-orange-200";
  if (rank === "MEDIUM") return "text-amber-200";
  return "text-emerald-200";
}

function buildSnapshotTitle(leadNarrative: string, priority: string) {
  return `${leadNarrative || "Market"} · ${priority}`;
}

function safeSnapshots(value: unknown): IntelligenceSnapshot[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is IntelligenceSnapshot => {
      if (typeof item !== "object" || item === null) return false;
      const snapshot = item as Partial<IntelligenceSnapshot>;
      return typeof snapshot.id === "string" && typeof snapshot.createdAt === "number";
    })
    .slice(0, 12);
}

function safeDecisionQueue(value: unknown): DecisionQueueItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is DecisionQueueItem => {
      if (typeof item !== "object" || item === null) return false;
      const entry = item as Partial<DecisionQueueItem>;
      return typeof entry.id === "string" && typeof entry.createdAt === "number";
    })
    .slice(0, 20);
}

function decisionActionForPriority(priority: string): DecisionQueueItem["action"] {
  if (priority === "CRITICAL") return "RISK_REVIEW";
  if (priority === "HIGH") return "INVESTIGATE";
  if (priority === "MEDIUM") return "WATCH";
  return "FOLLOW_UP";
}

function decisionPriorityStyle(priority: string) {
  if (priority === "CRITICAL") return "border-red-400/50 bg-red-500/10 text-red-100";
  if (priority === "HIGH") return "border-orange-400/50 bg-orange-500/10 text-orange-100";
  if (priority === "MEDIUM") return "border-amber-400/50 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100";
}

function snapshotTime(value: number) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(value);
  } catch {
    return new Date(value).toLocaleTimeString();
  }
}

function buildShareBrief(snapshot: IntelligenceSnapshot) {
  const signals = snapshot.topSignals
    .slice(0, 3)
    .map((signal, index) => `${index + 1}. ${signal.narrative} (${format(signal.score)} / ${label(signal.status)})`)
    .join("\n");
  return [
    `QuantTerminal Market Brief`,
    `Time: ${new Date(snapshot.createdAt).toLocaleString()}`,
    `State: ${label(snapshot.tone)} / ${snapshot.priority} (${format(snapshot.priorityScore)})`,
    `Lead: ${snapshot.leadNarrative} · ${label(snapshot.leadPhase)}`,
    `Chain: ${snapshot.chainSeverity} · confidence ${format(snapshot.confidence)}`,
    `Threat: reflexivity ${format(snapshot.threat.reflexivity)}, liquidity ${format(snapshot.threat.liquidity)}, contagion ${format(snapshot.threat.contagion)}, leverage ${format(snapshot.threat.leverage)}`,
    `Operator: ${snapshot.operatorRead}`,
    signals ? `Top signals:\n${signals}` : `Top signals: none`,
  ].join("\n");
}

function timeframeMultiplier(timeframe: TimeframeMode) {
  if (timeframe === "5m") return 0.82;
  if (timeframe === "1h") return 1;
  if (timeframe === "4h") return 1.12;
  return 1.22;
}

function presetLabel(preset: WorkspacePreset) {
  if (preset === "COMMAND") return "Command";
  if (preset === "UNIVERSE") return "Universe";
  if (preset === "RISK") return "Risk";
  return "Replay";
}

function panelsForPreset(preset: WorkspacePreset): PanelVisibility {
  if (preset === "UNIVERSE") {
    return {
      operator: true,
      universe: true,
      threat: false,
      chain: false,
      signals: true,
      drilldown: false,
    };
  }
  if (preset === "RISK") {
    return {
      operator: true,
      universe: false,
      threat: true,
      chain: true,
      signals: true,
      drilldown: false,
    };
  }
  if (preset === "REPLAY") {
    return {
      operator: false,
      universe: true,
      threat: false,
      chain: true,
      signals: false,
      drilldown: true,
    };
  }
  return DEFAULT_PANEL_VISIBILITY;
}

function focusForPreset(preset: WorkspacePreset): FocusMode {
  if (preset === "UNIVERSE") return "universe";
  if (preset === "RISK") return "threat";
  if (preset === "REPLAY") return "chain";
  return "overview";
}

function safePanelVisibility(value: unknown): PanelVisibility {
  const source =
    typeof value === "object" && value !== null
      ? (value as Partial<PanelVisibility>)
      : {};
  return {
    operator: source.operator ?? DEFAULT_PANEL_VISIBILITY.operator,
    universe: source.universe ?? DEFAULT_PANEL_VISIBILITY.universe,
    threat: source.threat ?? DEFAULT_PANEL_VISIBILITY.threat,
    chain: source.chain ?? DEFAULT_PANEL_VISIBILITY.chain,
    signals: source.signals ?? DEFAULT_PANEL_VISIBILITY.signals,
    drilldown: source.drilldown ?? DEFAULT_PANEL_VISIBILITY.drilldown,
  };
}

type AdaptiveMode =
  | "EXPANSION"
  | "CONTAGION"
  | "CRISIS"
  | "COMPRESSION"
  | "NEUTRAL";

type AttentionSignal = {
  title: string;
  mode: AdaptiveMode;
  score: number;
  reason: string;
  focus: FocusMode;
};

function adaptiveModeStyle(mode: AdaptiveMode) {
  if (mode === "CRISIS")
    return "border-red-400/50 bg-red-500/10 text-red-100 shadow-[0_0_70px_rgba(239,68,68,.18)]";
  if (mode === "CONTAGION")
    return "border-orange-400/50 bg-orange-500/10 text-orange-100 shadow-[0_0_70px_rgba(251,146,60,.16)]";
  if (mode === "EXPANSION")
    return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100 shadow-[0_0_70px_rgba(52,211,153,.14)]";
  if (mode === "COMPRESSION")
    return "border-amber-400/50 bg-amber-500/10 text-amber-100 shadow-[0_0_70px_rgba(251,191,36,.13)]";
  return "border-cyan-400/35 bg-cyan-500/5 text-cyan-100";
}

function deriveAttentionSignal(
  narrative: NarrativeSurface,
  chain: EventChainReaction,
): AttentionSignal {
  const lead = narrative.heatmap[0];
  const heat = number(lead?.heat);
  const stress = number(narrative.liquidityStress?.stressScore);
  const reflexivity = number(
    narrative.crossMarketReflexivity?.reflexivityScore,
  );
  const instability = number(
    narrative.crossMarketReflexivity?.instabilityScore,
  );
  const contagion = number(narrative.propagation?.stressScore ?? instability);
  const velocity = number(narrative.propagation?.velocityScore ?? heat);
  const score = clamp(
    heat * 0.28 +
      stress * 0.24 +
      reflexivity * 0.2 +
      contagion * 0.18 +
      chain.confidence * 0.1,
  );

  if (stress >= 76 || instability >= 74 || chain.severity === "CRITICAL") {
    return {
      title: "Crisis escalation active",
      mode: "CRISIS",
      score,
      focus: "threat",
      reason: `Liquidity/reflexivity pressure is high. ${lead?.narrative ?? "Market"} may require defensive monitoring.`,
    };
  }
  if (contagion >= 68 || reflexivity >= 70) {
    return {
      title: "Contagion path expanding",
      mode: "CONTAGION",
      score,
      focus: "chain",
      reason: `Cross-market feedback is rising around ${lead?.narrative ?? "the lead narrative"}. Track second-order effects.`,
    };
  }
  if (velocity >= 68 && heat >= 64 && narrative.tone === "RISK_ON") {
    return {
      title: "Expansion regime detected",
      mode: "EXPANSION",
      score,
      focus: "universe",
      reason: `${lead?.narrative ?? "Lead narrative"} is pulling market gravity while risk tone remains constructive.`,
    };
  }
  if (narrative.tone === "COMPRESSION" || stress >= 52) {
    return {
      title: "Compression watch",
      mode: "COMPRESSION",
      score,
      focus: "operator",
      reason:
        "Market structure is compressing. Wait for expansion or fracture confirmation.",
    };
  }
  return {
    title: "Balanced market scan",
    mode: "NEUTRAL",
    score,
    focus: "overview",
    reason:
      "No single threat dominates. Keep universe, operator and signal matrix in overview.",
  };
}

function AdaptiveCommandHeader({
  attention,
  focusMode,
  setFocusMode,
  audioArmed,
  setAudioArmed,
}: {
  attention: AttentionSignal;
  focusMode: FocusMode;
  setFocusMode: (value: FocusMode) => void;
  audioArmed: boolean;
  setAudioArmed: (value: boolean) => void;
}) {
  return (
    <div
      className={`mb-3 overflow-hidden rounded-[1.75rem] border p-4 ${adaptiveModeStyle(attention.mode)}`}
    >
      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-current/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em]">
              Adaptive Intelligence
            </span>
            <span className="rounded-full border border-current/20 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
              {attention.mode}
            </span>
            <span className="rounded-full border border-current/20 bg-black/30 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em]">
              Priority {format(attention.score)}
            </span>
          </div>
          <div className="mt-3 text-3xl font-black uppercase tracking-[0.10em] text-white">
            {attention.title}
          </div>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-200">
            {attention.reason}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <button
            type="button"
            onClick={() => setFocusMode(attention.focus)}
            className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-white transition hover:bg-white/15"
          >
            Focus {attention.focus}
          </button>
          <button
            type="button"
            onClick={() =>
              setFocusMode(
                focusMode === "overview" ? attention.focus : "overview",
              )
            }
            className="rounded-2xl border border-white/15 bg-black/35 px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-200 transition hover:bg-white/10"
          >
            {focusMode === "overview" ? "Adaptive Lens" : "Overview"}
          </button>
          <button
            type="button"
            onClick={() => setAudioArmed(!audioArmed)}
            className={`rounded-2xl border px-4 py-3 text-[10px] font-black uppercase tracking-[0.18em] transition ${audioArmed ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-100" : "border-white/15 bg-black/35 text-zinc-400"}`}
          >
            Audio {audioArmed ? "Armed" : "Muted"}
          </button>
        </div>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/35">
        <div
          className="qt-attention h-full rounded-full bg-white/80"
          style={{ width: `${clamp(attention.score)}%` }}
        />
      </div>
    </div>
  );
}

function CrisisOverlay({ attention }: { attention: AttentionSignal }) {
  if (attention.mode !== "CRISIS") return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-40 border-[6px] border-red-500/20">
      <div className="absolute inset-0 bg-red-950/10 qt-crisis-flash" />
      <div className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full border border-red-300/40 bg-red-950/80 px-5 py-2 text-[10px] font-black uppercase tracking-[0.32em] text-red-100 shadow-[0_0_60px_rgba(239,68,68,.35)]">
        Crisis Mode · Defensive Feedback Monitoring
      </div>
    </div>
  );
}

function HeatWaveRings({ mode }: { mode: AdaptiveMode }) {
  const tone =
    mode === "CRISIS"
      ? "border-red-300/25"
      : mode === "CONTAGION"
        ? "border-orange-300/25"
        : mode === "EXPANSION"
          ? "border-emerald-300/25"
          : "border-cyan-300/18";
  return (
    <>
      <div
        className={`qt-heat-wave absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full border ${tone}`}
      />
      <div
        className={`qt-heat-wave absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full border ${tone}`}
        style={{ animationDelay: ".5s" }}
      />
      <div
        className={`qt-heat-wave absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full border ${tone}`}
        style={{ animationDelay: "1s" }}
      />
    </>
  );
}

function severityStyle(severity?: string) {
  if (severity === "CRITICAL")
    return "border-red-400/50 bg-red-500/10 text-red-100";
  if (severity === "HIGH")
    return "border-orange-400/50 bg-orange-500/10 text-orange-100";
  if (severity === "MEDIUM")
    return "border-amber-400/50 bg-amber-500/10 text-amber-100";
  return "border-emerald-400/50 bg-emerald-500/10 text-emerald-100";
}

function layerColor(layer: string) {
  if (layer === "MACRO")
    return "border-violet-300/60 bg-violet-400/15 text-violet-100";
  if (layer === "BTC")
    return "border-orange-300/60 bg-orange-400/15 text-orange-100";
  if (layer === "NARRATIVE")
    return "border-cyan-300/70 bg-cyan-400/20 text-cyan-50 shadow-[0_0_42px_rgba(34,211,238,.32)]";
  if (layer === "REGIONAL")
    return "border-emerald-300/60 bg-emerald-400/15 text-emerald-100";
  if (layer === "DERIVATIVES")
    return "border-fuchsia-300/60 bg-fuchsia-400/15 text-fuchsia-100";
  return "border-red-300/60 bg-red-400/15 text-red-100";
}

function buildNodes(
  heatmap: NarrativeHeatItem[],
  timeframe: TimeframeMode,
): UniverseNode[] {
  const fallback: NarrativeHeatItem[] = [
    {
      narrative: "AI",
      heat: 84,
      direction: "INFLOW",
      sectors: ["AI", "Gaming"],
      summary: "AI remains the strongest beta gravity.",
    },
    {
      narrative: "BTC",
      heat: 71,
      direction: "MIXED",
      sectors: ["L1"],
      summary: "BTC dominance is anchoring market regime.",
    },
    {
      narrative: "MEME",
      heat: 67,
      direction: "CHURN",
      sectors: ["Meme"],
      summary: "Speculative beta is active but fragile.",
    },
    {
      narrative: "RWA",
      heat: 55,
      direction: "INFLOW",
      sectors: ["RWA"],
      summary: "Persistent narrative, needs flow validation.",
    },
  ];
  const source = heatmap.length ? heatmap.slice(0, 6) : fallback;
  const positions = [
    [50, 46],
    [68, 30],
    [72, 62],
    [32, 64],
    [29, 32],
    [50, 75],
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

function UniverseMap({
  nodes,
  replayIndex = 100,
  focusMode = "overview",
  adaptiveMode = "NEUTRAL",
}: {
  nodes: UniverseNode[];
  replayIndex?: number;
  focusMode?: FocusMode;
  adaptiveMode?: AdaptiveMode;
}) {
  const lead = nodes[0];
  const visibleCount = Math.max(
    2,
    Math.ceil((nodes.length * replayIndex) / 100),
  );
  const visibleNodes = nodes.slice(0, visibleCount);
  const links = visibleNodes.slice(1, 6);

  return (
    <div
      className={`${focusMode === "universe" ? "h-[78vh] min-h-[720px]" : "h-[620px] min-h-[520px]"} relative overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_center,rgba(14,165,233,.18),rgba(0,0,0,.92)_46%,#020617_100%)] shadow-[0_0_90px_rgba(6,182,212,.12)]`}
    >
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(34,211,238,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.08)_1px,transparent_1px)] [background-size:46px_46px]" />
      <HeatWaveRings mode={adaptiveMode} />
      <div className="absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
      <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/10" />
      <div className="absolute left-1/2 top-1/2 h-[14rem] w-[14rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/10" />
      <div className="qt-sweep absolute left-1/2 top-1/2 h-[36rem] w-[36rem] origin-center -translate-x-1/2 -translate-y-1/2 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,.18)_22deg,transparent_48deg)]" />

      {lead &&
        links.map((node, index) => {
          const dx = node.x - lead.x;
          const dy = node.y - lead.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div
              key={`${lead.id}-${node.id}`}
              className="qt-flow absolute left-0 top-0 h-[3px] origin-left rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-200 to-emerald-300/0"
              style={{
                width: `${length}%`,
                transform: `translate(${lead.x}%, ${lead.y}%) rotate(${angle}deg)`,
                opacity: 0.28 + node.heat / 170,
                animationDelay: `${index * 0.18}s`,
              }}
            />
          );
        })}

      {visibleNodes.map((node, index) => {
        const size = index === 0 ? 118 : 76 + node.heat / 3;
        const hot = node.heat >= 75;
        const defensive =
          node.direction === "OUTFLOW" || node.direction === "CHURN";
        const color =
          index === 0
            ? "border-cyan-100 bg-cyan-300/20 text-cyan-50 shadow-[0_0_80px_rgba(103,232,249,.55)]"
            : defensive
              ? "border-amber-100 bg-amber-400/16 text-amber-50 shadow-[0_0_50px_rgba(251,191,36,.32)]"
              : hot
                ? "border-emerald-100 bg-emerald-400/18 text-emerald-50 shadow-[0_0_56px_rgba(52,211,153,.38)]"
                : "border-violet-100 bg-violet-400/16 text-violet-50 shadow-[0_0_40px_rgba(167,139,250,.30)]";

        return (
          <div
            key={node.id}
            className="qt-node absolute -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              animationDelay: `${index * 0.12}s`,
            }}
          >
            <div className="absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-10 qt-pulse" />
            <div
              className={`grid place-items-center rounded-full border backdrop-blur-xl ${color}`}
              style={{ width: size, height: size }}
              title={node.summary}
            >
              <div className="text-center">
                <div className="text-[11px] font-black uppercase tracking-[0.16em]">
                  {node.label}
                </div>
                <div className="mt-1 text-[10px] font-black opacity-75">
                  HEAT {format(node.heat)}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <div
        className={`absolute right-5 top-5 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.20em] ${adaptiveModeStyle(adaptiveMode)}`}
      >
        Heat Wave · {adaptiveMode}
      </div>

      <div className="absolute left-5 top-5 rounded-2xl border border-cyan-400/20 bg-black/55 p-4 backdrop-blur-xl">
        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
          Narrative Universe
        </div>
        <div className="mt-2 max-w-[320px] text-2xl font-black uppercase tracking-[0.10em] text-white">
          {lead?.label ?? "Scanning"}
        </div>
        <div className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
          dominant market gravity
        </div>
      </div>

      <div className="absolute bottom-5 left-5 right-5 grid gap-2 md:grid-cols-3">
        {visibleNodes.slice(0, 3).map((node) => (
          <div
            key={`summary-${node.id}`}
            className="rounded-2xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="truncate text-xs font-black uppercase text-white">
                {node.label}
              </div>
              <div
                className={`text-[10px] font-black uppercase ${directionStyle(node.direction)}`}
              >
                {node.direction}
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${node.heat}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OperatorBrief({
  narrative,
  state,
}: {
  narrative: NarrativeSurface;
  state: FetchState;
}) {
  const lead = narrative.heatmap[0];
  const second = narrative.heatmap[1];
  const stress = number(narrative.liquidityStress?.stressScore);
  const reflexivity = number(
    narrative.crossMarketReflexivity?.reflexivityScore,
  );
  const phase = narrative.propagation?.leadPhase ?? "DORMANT";

  const lines = [
    `${label(narrative.tone)} regime. ${lead?.narrative ?? "Market"} is the lead narrative.`,
    `${label(phase)} phase with heat ${format(lead?.heat)} and secondary pressure from ${second?.narrative ?? "none"}.`,
    `Liquidity stress ${format(stress)} / Reflexivity ${format(reflexivity)}.`,
    narrative.newsFusion?.divergence.summary ?? narrative.marketSummary,
  ].slice(0, 4);

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
          AI Operator
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneStyle(narrative.tone)}`}
        >
          {state === "live" ? "LIVE" : state}
        </span>
      </div>
      <div className="mt-4 text-3xl font-black uppercase tracking-[0.12em] text-white">
        {label(narrative.tone)}
      </div>
      <div className="mt-3 space-y-3">
        {lines.map((line, index) => (
          <div
            key={`${line}-${index}`}
            className="rounded-2xl border border-zinc-800 bg-black/45 p-3"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="mt-1 text-sm leading-6 text-zinc-200">{line}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThreatRadar({ narrative }: { narrative: NarrativeSurface }) {
  const metrics = [
    {
      label: "Reflexivity",
      value: number(narrative.crossMarketReflexivity?.reflexivityScore),
    },
    {
      label: "Liquidity",
      value: number(narrative.liquidityStress?.stressScore),
    },
    {
      label: "Contagion",
      value: number(
        narrative.propagation?.stressScore ??
          narrative.crossMarketReflexivity?.instabilityScore,
      ),
    },
    {
      label: "Leverage",
      value: number(
        narrative.liquidityStress?.crowdingRisk ??
          narrative.propagation?.velocityScore,
      ),
    },
  ];
  const max = Math.max(...metrics.map((item) => item.value), 0);

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
          Threat Radar
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${riskStyle(max)}`}
        >
          {max >= 72 ? "HIGH" : max >= 52 ? "ELEVATED" : "STABLE"}
        </span>
      </div>

      <div className="relative mx-auto mt-5 h-56 w-56 rounded-full border border-cyan-300/10 bg-[radial-gradient(circle,rgba(34,211,238,.13),transparent_62%)]">
        <div className="absolute inset-8 rounded-full border border-cyan-300/10" />
        <div className="absolute inset-16 rounded-full border border-cyan-300/10" />
        <div className="qt-sweep absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(34,211,238,.22)_28deg,transparent_50deg)]" />
        {metrics.map((item, index) => {
          const angle = index * 90 - 90;
          const radius = 36 + clamp(item.value) * 0.65;
          const x = 50 + (Math.cos((angle * Math.PI) / 180) * radius) / 2.25;
          const y = 50 + (Math.sin((angle * Math.PI) / 180) * radius) / 2.25;
          return (
            <span
              key={item.label}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_rgba(103,232,249,.90)]"
              style={{ left: `${x}%`, top: `${y}%` }}
            />
          );
        })}
      </div>

      <div className="mt-4 space-y-2">
        {metrics.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[92px_1fr_38px] items-center gap-2"
          >
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
              {item.label}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full rounded-full bg-cyan-300"
                style={{ width: `${clamp(item.value)}%` }}
              />
            </div>
            <div className="text-right text-xs font-black text-zinc-200">
              {format(item.value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SignalMatrix({ narrative }: { narrative: NarrativeSurface }) {
  const validation = narrative.newsFusion?.validation ?? [];
  const rows = (
    validation.length
      ? validation
      : narrative.heatmap.map((item) => ({
          narrative: item.narrative,
          validationScore: item.heat,
          status: item.direction,
          summary: item.summary,
        }))
  ).slice(0, 5);

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
          Top Signals Only
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
          Focus Mode
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="grid grid-cols-[1.2fr_90px_90px_1.5fr] bg-zinc-900/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500">
          <div>Signal</div>
          <div>Conf</div>
          <div>State</div>
          <div>Read</div>
        </div>
        {rows.map((row, index) => {
          const score = number(
            "validationScore" in row ? row.validationScore : 0,
          );
          const status = String("status" in row ? row.status : "WATCH");
          const summary = String("summary" in row ? row.summary : "");
          return (
            <div
              key={`${row.narrative}-${index}`}
              className="grid grid-cols-[1.2fr_90px_90px_1.5fr] border-t border-zinc-800 px-3 py-3 text-xs"
            >
              <div className="font-black uppercase text-white">
                {row.narrative}
              </div>
              <div className="font-black text-cyan-200">{format(score)}</div>
              <div className={directionStyle(status)}>{label(status)}</div>
              <div className="line-clamp-1 text-zinc-400">
                {summary || "No tactical read available."}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventChainPanel({ chain }: { chain: EventChainReaction }) {
  const positions: Record<string, { x: number; y: number }> = {
    macro: { x: 8, y: 50 },
    btc: { x: 25, y: 32 },
    narrative: { x: 46, y: 50 },
    regional: { x: 65, y: 28 },
    derivatives: { x: 80, y: 50 },
    risk: { x: 92, y: 70 },
  };

  return (
    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
            Event Chain Reaction
          </div>
          <div className="mt-1 text-lg font-black uppercase tracking-[0.10em] text-white">
            {chain.title}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] ${severityStyle(chain.severity)}`}
          >
            {chain.severity}
          </span>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">
            CONF {format(chain.confidence)}
          </span>
        </div>
      </div>

      <div className="relative mt-4 h-[250px] overflow-hidden rounded-2xl border border-cyan-400/10 bg-[radial-gradient(circle_at_center,rgba(34,211,238,.10),rgba(0,0,0,.88)_60%)]">
        <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(34,211,238,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,.08)_1px,transparent_1px)] [background-size:34px_34px]" />
        {chain.edges.map((edge, index) => {
          const from = positions[edge.from] ?? { x: 10, y: 50 };
          const to = positions[edge.to] ?? { x: 90, y: 50 };
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          return (
            <div
              key={`${edge.from}-${edge.to}-${index}`}
              className="qt-flow absolute left-0 top-0 h-[3px] origin-left rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-200 to-fuchsia-200/0"
              style={{
                width: `${length}%`,
                transform: `translate(${from.x}%, ${from.y}%) rotate(${angle}deg)`,
                opacity: 0.35 + edge.strength / 180,
                animationDelay: `${index * 0.16}s`,
              }}
              title={edge.read}
            />
          );
        })}
        {chain.nodes.map((node) => {
          const pos = positions[node.id] ?? { x: 50, y: 50 };
          const size = node.id === "narrative" ? 92 : 68;
          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
              title={node.read}
            >
              <div className="qt-pulse absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-10" />
              <div
                className={`grid place-items-center rounded-full border text-center backdrop-blur-xl ${layerColor(node.layer)}`}
                style={{ width: size, height: size }}
              >
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.12em] opacity-70">
                    {node.layer}
                  </div>
                  <div className="mt-1 max-w-[74px] truncate text-[11px] font-black uppercase">
                    {node.label}
                  </div>
                  <div className="mt-0.5 text-[9px] font-black opacity-70">
                    {format(node.score)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr_1.3fr]">
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Trigger
          </div>
          <div className="mt-1 text-sm leading-6 text-zinc-200">
            {chain.trigger}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Consequence
          </div>
          <div className="mt-1 text-sm leading-6 text-zinc-200">
            {chain.consequence}
          </div>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
            Operator Read
          </div>
          <div className="mt-1 text-sm leading-6 text-cyan-50">
            {chain.operatorRead}
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandModeBar({
  chain,
  narrative,
}: {
  chain: EventChainReaction;
  narrative: NarrativeSurface;
}) {
  const commands = [
    {
      key: "F",
      label: "Focus lead",
      value:
        chain.nodes.find((node) => node.id === "narrative")?.label ?? "Market",
    },
    { key: "R", label: "Risk lens", value: chain.severity },
    { key: "C", label: "Chain", value: `${chain.edges.length} links` },
    {
      key: "D",
      label: "Drilldown",
      value: narrative.propagation?.leadPhase ?? "DORMANT",
    },
  ];
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-cyan-400/20 bg-cyan-500/5 px-4 py-3">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
          Command Mode
        </div>
        <div className="mt-1 text-sm text-zinc-300">
          One-screen market read: lead narrative, active chain, threat state,
          and top signals.
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {commands.map((command) => (
          <div
            key={command.key}
            className="rounded-xl border border-zinc-800 bg-black/55 px-3 py-2"
          >
            <span className="mr-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-black text-zinc-300">
              {command.key}
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
              {command.label}
            </span>
            <span className="ml-2 text-[10px] font-black uppercase text-white">
              {String(command.value).replace(/_/g, " ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SnapshotCommandCenter({
  snapshots,
  selectedSnapshotId,
  setSelectedSnapshotId,
  onCapture,
  onClear,
  activeSnapshot,
}: {
  snapshots: IntelligenceSnapshot[];
  selectedSnapshotId: string | null;
  setSelectedSnapshotId: (value: string | null) => void;
  onCapture: () => void;
  onClear: () => void;
  activeSnapshot: IntelligenceSnapshot | null;
}) {
  return (
    <div className="mb-3 grid gap-3 xl:grid-cols-[320px_1fr]">
      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
              Session Memory
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              save the current market read for replay and sharing
            </div>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100">
            {snapshots.length} saved
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCapture}
            className="rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:bg-cyan-500/15"
          >
            Capture Read
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-xl border border-zinc-800 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-200"
          >
            Clear
          </button>
        </div>
        <div className="mt-4 max-h-[220px] space-y-2 overflow-auto pr-1">
          {snapshots.length ? (
            snapshots.map((snapshot) => (
              <button
                key={snapshot.id}
                type="button"
                onClick={() => setSelectedSnapshotId(snapshot.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${selectedSnapshotId === snapshot.id ? "border-cyan-300/50 bg-cyan-500/10" : "border-zinc-800 bg-black/35 hover:border-zinc-700"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="truncate text-xs font-black uppercase text-white">
                    {snapshot.title}
                  </div>
                  <div className="text-[10px] font-black text-zinc-500">
                    {snapshotTime(snapshot.createdAt)}
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${severityTextStyle(snapshot.priorityScore)}`}>
                    {snapshot.priority}
                  </span>
                  <span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[9px] font-black uppercase text-zinc-400">
                    {label(snapshot.leadPhase)}
                  </span>
                </div>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/25 p-4 text-xs leading-6 text-zinc-500">
              No snapshots yet. Capture a market read when the screen tells a clear story.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
              Shareable Brief
            </div>
            <div className="mt-1 text-lg font-black uppercase tracking-[0.10em] text-white">
              {activeSnapshot?.title ?? "No active snapshot"}
            </div>
          </div>
          <button
            type="button"
            disabled={!activeSnapshot}
            onClick={() => {
              if (!activeSnapshot) return;
              const brief = buildShareBrief(activeSnapshot);
              void navigator.clipboard?.writeText(brief);
            }}
            className="rounded-xl border border-emerald-300/35 bg-emerald-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100 disabled:cursor-not-allowed disabled:border-zinc-800 disabled:bg-black/30 disabled:text-zinc-600"
          >
            Copy Brief
          </button>
        </div>
        {activeSnapshot ? (
          <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Operator Read
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                {activeSnapshot.operatorRead}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
                Threat Snapshot
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                {Object.entries(activeSnapshot.threat).map(([key, value]) => (
                  <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-2">
                    <div className="text-[9px] font-black uppercase text-zinc-600">{key}</div>
                    <div className="mt-1 text-lg font-black text-cyan-100">{format(value)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="xl:col-span-2 rounded-2xl border border-cyan-400/15 bg-cyan-500/5 p-3">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-300">
                Top Signals at Capture
              </div>
              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {activeSnapshot.topSignals.slice(0, 3).map((signal) => (
                  <div key={signal.narrative} className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                    <div className="text-xs font-black uppercase text-white">{signal.narrative}</div>
                    <div className="mt-1 text-[10px] font-black uppercase text-zinc-500">{label(signal.status)}</div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-cyan-300" style={{ width: `${clamp(signal.score)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 bg-black/25 p-6 text-sm leading-6 text-zinc-500">
            Capture a snapshot to generate a compact copyable market brief.
          </div>
        )}
      </div>
    </div>
  );
}

function DecisionQueuePanel({
  queue,
  onAdd,
  onToggle,
  onRemove,
  onClearDone,
  currentSnapshot,
}: {
  queue: DecisionQueueItem[];
  onAdd: (source?: IntelligenceSnapshot) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onClearDone: () => void;
  currentSnapshot: IntelligenceSnapshot;
}) {
  const openItems = queue.filter((item) => item.status === "OPEN");
  const pinned = openItems.slice(0, 4);
  return (
    <div className="mb-3 grid gap-3 xl:grid-cols-[360px_1fr]">
      <div className="rounded-[1.5rem] border border-amber-400/20 bg-amber-500/5 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.30em] text-amber-300">
              Decision Queue
            </div>
            <div className="mt-1 text-sm leading-6 text-zinc-300">
              pin only the market reads that require action; keep the rest out of the way.
            </div>
          </div>
          <span className="rounded-full border border-amber-300/30 bg-black/35 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100">
            {openItems.length} open
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAdd(currentSnapshot)}
            className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100 transition hover:bg-amber-500/15"
          >
            Pin Current
          </button>
          <button
            type="button"
            onClick={onClearDone}
            className="rounded-xl border border-zinc-800 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-200"
          >
            Clear Done
          </button>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
              Pinned Reads / Watchlist
            </div>
            <div className="mt-1 text-lg font-black uppercase tracking-[0.10em] text-white">
              {pinned[0]?.narrative ?? currentSnapshot.leadNarrative} · action stack
            </div>
          </div>
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
            Click item to mark done
          </div>
        </div>
        <div className="mt-4 grid gap-2 lg:grid-cols-2 2xl:grid-cols-4">
          {pinned.length ? (
            pinned.map((item) => (
              <div
                key={item.id}
                className={`rounded-2xl border p-3 ${item.status === "DONE" ? "border-zinc-800 bg-black/30 opacity-50" : "border-zinc-800 bg-black/45"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onToggle(item.id)}
                    className="min-w-0 text-left"
                  >
                    <div className="truncate text-xs font-black uppercase text-white">
                      {item.narrative}
                    </div>
                    <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                      {item.action.replace(/_/g, " ")} · {snapshotTime(item.createdAt)}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(item.id)}
                    className="rounded-lg border border-zinc-800 px-2 py-1 text-[10px] font-black text-zinc-500 hover:text-red-200"
                  >
                    ×
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${decisionPriorityStyle(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className="text-[10px] font-black text-zinc-500">
                    {format(item.score)}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-zinc-400">
                  {item.note}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/25 p-4 text-xs leading-6 text-zinc-500 lg:col-span-2 2xl:col-span-4">
              No pinned decisions. Pin the current read only when it changes what you should watch next.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WorkspaceDock({
  preset,
  setPreset,
  panelVisibility,
  setPanelVisibility,
  compactMode,
  setCompactMode,
  applyPreset,
  resetWorkspace,
}: {
  preset: WorkspacePreset;
  setPreset: (value: WorkspacePreset) => void;
  panelVisibility: PanelVisibility;
  setPanelVisibility: (value: PanelVisibility) => void;
  compactMode: boolean;
  setCompactMode: (value: boolean) => void;
  applyPreset: (value: WorkspacePreset) => void;
  resetWorkspace: () => void;
}) {
  const presets: WorkspacePreset[] = ["COMMAND", "UNIVERSE", "RISK", "REPLAY"];
  const panels: { key: PanelKey; label: string }[] = [
    { key: "operator", label: "Operator" },
    { key: "universe", label: "Universe" },
    { key: "threat", label: "Threat" },
    { key: "chain", label: "Chain" },
    { key: "signals", label: "Signals" },
    { key: "drilldown", label: "Deep" },
  ];

  return (
    <div className="sticky top-0 z-30 mb-3 rounded-[1.5rem] border border-zinc-800 bg-black/85 p-3 shadow-[0_18px_60px_rgba(0,0,0,.35)] backdrop-blur-xl">
      <div className="grid gap-3 2xl:grid-cols-[auto_1fr_auto] 2xl:items-center">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.30em] text-cyan-300">
            Workspace Dock
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            persisted panel focus · press 1/2/3/4 for presets
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setPreset(item);
                applyPreset(item);
              }}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${preset === item ? "border-cyan-300/50 bg-cyan-500/10 text-cyan-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500 hover:text-zinc-200"}`}
            >
              {presetLabel(item)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 2xl:justify-end">
          <button
            type="button"
            onClick={() => setCompactMode(!compactMode)}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition ${compactMode ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100" : "border-zinc-800 bg-zinc-950/70 text-zinc-500"}`}
          >
            Compact {compactMode ? "On" : "Off"}
          </button>
          <button
            type="button"
            onClick={resetWorkspace}
            className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-zinc-500 transition hover:text-zinc-200"
          >
            Reset
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-zinc-900 pt-3">
        {panels.map((panel) => (
          <button
            key={panel.key}
            type="button"
            onClick={() =>
              setPanelVisibility({
                ...panelVisibility,
                [panel.key]: !panelVisibility[panel.key],
              })
            }
            className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${panelVisibility[panel.key] ? "border-white/15 bg-white/10 text-white" : "border-zinc-800 bg-zinc-950/70 text-zinc-600"}`}
          >
            {panelVisibility[panel.key] ? "●" : "○"} {panel.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommandPalette({
  open,
  focusMode,
  setOpen,
  setFocusMode,
  timeframe,
  setTimeframe,
}: {
  open: boolean;
  focusMode: FocusMode;
  setOpen: (value: boolean) => void;
  setFocusMode: (value: FocusMode) => void;
  timeframe: TimeframeMode;
  setTimeframe: (value: TimeframeMode) => void;
}) {
  if (!open) return null;
  const actions: { label: string; hint: string; focus: FocusMode }[] = [
    { label: "Focus Narrative Universe", hint: "U", focus: "universe" },
    { label: "Focus AI Operator", hint: "O", focus: "operator" },
    { label: "Focus Threat Radar", hint: "T", focus: "threat" },
    { label: "Focus Signal Matrix", hint: "S", focus: "signals" },
    { label: "Focus Event Chain", hint: "C", focus: "chain" },
    { label: "Back to Overview", hint: "0", focus: "overview" },
  ];
  const timeframes: TimeframeMode[] = ["5m", "1h", "4h", "1d"];
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 p-4 backdrop-blur-md"
      onClick={() => setOpen(false)}
    >
      <div
        className="mx-auto mt-20 max-w-2xl rounded-[1.5rem] border border-cyan-400/30 bg-zinc-950/95 p-4 shadow-[0_0_80px_rgba(34,211,238,.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
          <div>
            <div className="text-[10px] font-black uppercase tracking-[0.32em] text-cyan-300">
              Command Palette
            </div>
            <div className="mt-1 text-sm text-zinc-400">
              Focus the terminal instead of adding more noise.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-zinc-800 px-3 py-1.5 text-[10px] font-black uppercase text-zinc-400"
          >
            ESC
          </button>
        </div>
        <div className="mt-4 grid gap-2">
          {actions.map((action) => (
            <button
              key={action.focus}
              type="button"
              onClick={() => {
                setFocusMode(action.focus);
                setOpen(false);
              }}
              className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${focusMode === action.focus ? "border-cyan-300/50 bg-cyan-500/10" : "border-zinc-800 bg-black/35 hover:border-zinc-600"}`}
            >
              <span className="text-sm font-black uppercase tracking-[0.10em] text-white">
                {action.label}
              </span>
              <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] font-black text-zinc-400">
                {action.hint}
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-800 pt-4">
          {timeframes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTimeframe(item)}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${timeframe === item ? "border-cyan-300/50 bg-cyan-500/10 text-cyan-100" : "border-zinc-800 bg-black/35 text-zinc-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusToolbar({
  focusMode,
  setFocusMode,
  timeframe,
  setTimeframe,
  replayIndex,
  setReplayIndex,
  setCommandOpen,
}: {
  focusMode: FocusMode;
  setFocusMode: (value: FocusMode) => void;
  timeframe: TimeframeMode;
  setTimeframe: (value: TimeframeMode) => void;
  replayIndex: number;
  setReplayIndex: (value: number) => void;
  setCommandOpen: (value: boolean) => void;
}) {
  const modes: { key: FocusMode; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "universe", label: "Universe" },
    { key: "operator", label: "Operator" },
    { key: "threat", label: "Threat" },
    { key: "signals", label: "Signals" },
    { key: "chain", label: "Chain" },
  ];
  const timeframes: TimeframeMode[] = ["5m", "1h", "4h", "1d"];
  return (
    <div className="mb-3 rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {modes.map((mode) => (
            <button
              key={mode.key}
              type="button"
              onClick={() => setFocusMode(mode.key)}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${focusMode === mode.key ? "border-cyan-300/50 bg-cyan-500/10 text-cyan-100" : "border-zinc-800 bg-black/35 text-zinc-500 hover:text-zinc-200"}`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100"
        >
          CMD / CTRL + K
        </button>
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr] lg:items-center">
        <div className="flex flex-wrap gap-2">
          {timeframes.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTimeframe(item)}
              className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-black uppercase ${timeframe === item ? "border-emerald-300/50 bg-emerald-500/10 text-emerald-100" : "border-zinc-800 bg-black/35 text-zinc-500"}`}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[120px_1fr_48px] items-center gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">
            Replay Scrub
          </div>
          <input
            aria-label="Replay scrubber"
            type="range"
            min={20}
            max={100}
            step={10}
            value={replayIndex}
            onChange={(event) => setReplayIndex(Number(event.target.value))}
            className="w-full accent-cyan-300"
          />
          <div className="text-right text-[10px] font-black text-cyan-200">
            {replayIndex}%
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityHeader({
  narrative,
  chain,
}: {
  narrative: NarrativeSurface;
  chain: EventChainReaction;
}) {
  const leadHeat = number(narrative.heatmap[0]?.heat);
  const stress = number(narrative.liquidityStress?.stressScore);
  const reflexivity = number(
    narrative.crossMarketReflexivity?.reflexivityScore,
  );
  const score = clamp(
    leadHeat * 0.38 +
      stress * 0.28 +
      reflexivity * 0.22 +
      chain.confidence * 0.12,
  );
  const rank = severityRank(score);
  return (
    <div className="mb-3 grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
      <div>
        <div className="text-[10px] font-black uppercase tracking-[0.32em] text-zinc-500">
          Market Severity Hierarchy
        </div>
        <div className="mt-2 text-2xl font-black uppercase tracking-[0.10em] text-white">
          {narrative.heatmap[0]?.narrative ?? "Market"} leads ·{" "}
          {label(narrative.propagation?.leadPhase ?? "DORMANT")}
        </div>
      </div>
      <div
        className={`rounded-2xl border border-zinc-800 bg-black/45 px-5 py-3 text-right ${severityTextStyle(score)}`}
      >
        <div className="text-[10px] font-black uppercase tracking-[0.20em] opacity-70">
          Priority
        </div>
        <div className="text-3xl font-black uppercase tracking-[0.12em]">
          {rank}
        </div>
        <div className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
          score {format(score)}
        </div>
      </div>
    </div>
  );
}
export default function NarrativeIntelligenceSurface() {
  const [rotationData, setRotationData] =
    useState<RealMarketRotationResponse | null>(null);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [newsState, setNewsState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState<FocusMode>("overview");
  const [timeframe, setTimeframe] = useState<TimeframeMode>("1h");
  const [replayIndex, setReplayIndex] = useState(100);
  const [audioArmed, setAudioArmed] = useState(false);
  const [workspacePreset, setWorkspacePreset] =
    useState<WorkspacePreset>("COMMAND");
  const [panelVisibility, setPanelVisibility] = useState<PanelVisibility>(
    DEFAULT_PANEL_VISIBILITY,
  );
  const [compactMode, setCompactMode] = useState(false);
  const [snapshots, setSnapshots] = useState<IntelligenceSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [decisionQueue, setDecisionQueue] = useState<DecisionQueueItem[]>([]);
  const previousModeRef = useRef<AdaptiveMode | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as {
        preset?: WorkspacePreset;
        focusMode?: FocusMode;
        timeframe?: TimeframeMode;
        replayIndex?: number;
        compactMode?: boolean;
        panelVisibility?: Partial<PanelVisibility>;
      };
      if (parsed.preset) setWorkspacePreset(parsed.preset);
      if (parsed.focusMode) setFocusMode(parsed.focusMode);
      if (parsed.timeframe) setTimeframe(parsed.timeframe);
      if (typeof parsed.replayIndex === "number")
        setReplayIndex(clamp(parsed.replayIndex, 20, 100));
      if (typeof parsed.compactMode === "boolean")
        setCompactMode(parsed.compactMode);
      if (parsed.panelVisibility)
        setPanelVisibility(safePanelVisibility(parsed.panelVisibility));
    } catch {
      // Ignore corrupted workspace snapshots.
    }
  }, []);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      const safe = safeSnapshots(parsed);
      setSnapshots(safe);
      setSelectedSnapshotId(safe[0]?.id ?? null);
    } catch {
      // Snapshot memory is optional.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({
          preset: workspacePreset,
          focusMode,
          timeframe,
          replayIndex,
          compactMode,
          panelVisibility,
        }),
      );
    } catch {
      // Persistence is optional.
    }
  }, [
    workspacePreset,
    focusMode,
    timeframe,
    replayIndex,
    compactMode,
    panelVisibility,
  ]);


  useEffect(() => {
    try {
      window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
    } catch {
      // Snapshot persistence is optional.
    }
  }, [snapshots]);

  const applyWorkspacePreset = (value: WorkspacePreset) => {
    setPanelVisibility(panelsForPreset(value));
    setFocusMode(focusForPreset(value));
    if (value === "REPLAY") setReplayIndex(60);
    if (value === "COMMAND") setReplayIndex(100);
  };

  const resetWorkspace = () => {
    setWorkspacePreset("COMMAND");
    setFocusMode("overview");
    setTimeframe("1h");
    setReplayIndex(100);
    setCompactMode(false);
    setPanelVisibility(DEFAULT_PANEL_VISIBILITY);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (key === "escape") {
        setCommandOpen(false);
        setFocusMode("overview");
      }
      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (key === "u") setFocusMode("universe");
        if (key === "o") setFocusMode("operator");
        if (key === "t") setFocusMode("threat");
        if (key === "s") setFocusMode("signals");
        if (key === "c") setFocusMode("chain");
        if (key === "0") setFocusMode("overview");
        if (key === "1") {
          setWorkspacePreset("COMMAND");
          applyWorkspacePreset("COMMAND");
        }
        if (key === "2") {
          setWorkspacePreset("UNIVERSE");
          applyWorkspacePreset("UNIVERSE");
        }
        if (key === "3") {
          setWorkspacePreset("RISK");
          applyWorkspacePreset("RISK");
        }
        if (key === "4") {
          setWorkspacePreset("REPLAY");
          applyWorkspacePreset("REPLAY");
        }
        if (key === "p") setCompactMode((value) => !value);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;
    const load = async () => {
      try {
        setFetchState((prev) => (prev === "idle" ? "loading" : prev));
        const response = await fetch("/api/market/sector-rotation", {
          cache: "no-store",
        });
        const payload = (await response.json()) as RealMarketRotationResponse;
        if (!alive) return;
        if (!response.ok || payload.ok === false)
          throw new Error(
            payload.notes?.[0] ?? `sector rotation returned ${response.status}`,
          );
        setRotationData(payload);
        setFetchState(payload.mode === "partial" ? "partial" : "live");
        setError(null);
      } catch (err) {
        if (!alive) return;
        setFetchState("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    };
    load();
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
            const response = await fetch(
              `/api/news?region=${region}&translate=false`,
              { cache: "no-store" },
            );
            if (!response.ok) return [] as NewsItem[];
            const payload = await response.json();
            return Array.isArray(payload)
              ? (payload.slice(0, 20) as NewsItem[])
              : [];
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
    loadNews();
    timer = setInterval(loadNews, POLL_MS);
    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const narrative = useMemo<NarrativeSurface>(
    () => generateNarrativeSurface(rotationData, newsItems),
    [rotationData, newsItems],
  );
  const nodes = useMemo(
    () => buildNodes(narrative.heatmap, timeframe),
    [narrative.heatmap, timeframe],
  );
  const chain = useMemo(() => buildEventChainReaction(narrative), [narrative]);
  const attention = useMemo(
    () => deriveAttentionSignal(narrative, chain),
    [narrative, chain],
  );


  const currentSnapshot = useMemo<IntelligenceSnapshot>(() => {
    const lead = narrative.heatmap[0];
    const stress = number(narrative.liquidityStress?.stressScore);
    const reflexivity = number(narrative.crossMarketReflexivity?.reflexivityScore);
    const contagion = number(
      narrative.propagation?.stressScore ??
        narrative.crossMarketReflexivity?.instabilityScore,
    );
    const leverage = number(
      narrative.liquidityStress?.crowdingRisk ??
        narrative.propagation?.velocityScore,
    );
    const priority = severityRank(attention.score);
    const topSignals = (narrative.newsFusion?.validation ?? [])
      .slice(0, 5)
      .map((item) => ({
        narrative: item.narrative,
        score: number(item.validationScore),
        status: item.status,
      }));
    return {
      id: `live-${Date.now()}`,
      createdAt: Date.now(),
      title: buildSnapshotTitle(lead?.narrative ?? "Market", priority),
      tone: narrative.tone,
      leadNarrative: lead?.narrative ?? "Market",
      leadPhase: String(narrative.propagation?.leadPhase ?? "DORMANT"),
      priority,
      priorityScore: attention.score,
      chainSeverity: chain.severity,
      confidence: chain.confidence,
      operatorRead: chain.operatorRead || narrative.marketSummary,
      threat: { reflexivity, liquidity: stress, contagion, leverage },
      topSignals,
    };
  }, [attention.score, chain, narrative]);

  const activeSnapshot =
    snapshots.find((snapshot) => snapshot.id === selectedSnapshotId) ??
    snapshots[0] ??
    null;

  const captureSnapshot = () => {
    const snapshot = {
      ...currentSnapshot,
      id: `snapshot-${Date.now()}`,
      createdAt: Date.now(),
    };
    setSnapshots((prev) => [snapshot, ...prev].slice(0, 12));
    setSelectedSnapshotId(snapshot.id);
  };

  const clearSnapshots = () => {
    setSnapshots([]);
    setSelectedSnapshotId(null);
  };

  const addDecisionFromSnapshot = (source = currentSnapshot) => {
    const priority = source.priority as DecisionQueueItem["priority"];
    const item: DecisionQueueItem = {
      id: `decision-${Date.now()}`,
      createdAt: Date.now(),
      narrative: source.leadNarrative || "Market",
      action: decisionActionForPriority(priority),
      priority,
      status: "OPEN",
      note: source.operatorRead || `${source.leadNarrative} requires follow-up monitoring.`,
      score: source.priorityScore,
    };
    setDecisionQueue((prev) => [item, ...prev].slice(0, 20));
  };

  const toggleDecisionStatus = (id: string) => {
    setDecisionQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "OPEN" ? "DONE" : "OPEN" }
          : item,
      ),
    );
  };

  const removeDecision = (id: string) => {
    setDecisionQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearDoneDecisions = () => {
    setDecisionQueue((prev) => prev.filter((item) => item.status !== "DONE"));
  };

  useEffect(() => {
    if (!audioArmed) {
      previousModeRef.current = attention.mode;
      return;
    }
    if (previousModeRef.current === attention.mode) return;
    previousModeRef.current = attention.mode;
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = attention.mode === "CRISIS" ? "sawtooth" : "sine";
      oscillator.frequency.value =
        attention.mode === "CRISIS"
          ? 220
          : attention.mode === "CONTAGION"
            ? 330
            : 520;
      gain.gain.value = attention.mode === "CRISIS" ? 0.05 : 0.025;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.16);
      window.setTimeout(() => context.close().catch(() => undefined), 260);
    } catch {
      // Audio is optional and browser-gated.
    }
  }, [audioArmed, attention.mode]);

  const showLeft =
    panelVisibility.operator &&
    (focusMode === "overview" || focusMode === "operator");
  const showCenter =
    panelVisibility.universe &&
    (focusMode === "overview" || focusMode === "universe");
  const showRight =
    panelVisibility.threat &&
    (focusMode === "overview" || focusMode === "threat");
  const showChain =
    panelVisibility.chain &&
    (focusMode === "overview" || focusMode === "chain");
  const showSignals =
    panelVisibility.signals &&
    (focusMode === "overview" || focusMode === "signals");
  const gridClass =
    focusMode === "overview"
      ? compactMode
        ? "grid min-h-[650px] gap-2 xl:grid-cols-[260px_minmax(520px,1fr)_260px]"
        : "grid min-h-[780px] gap-3 xl:grid-cols-[310px_minmax(520px,1fr)_310px]"
      : compactMode
        ? "grid min-h-[650px] gap-2"
        : "grid min-h-[780px] gap-3";

  return (
    <section
      className={`min-h-full p-3 text-zinc-100 ${attention.mode === "CRISIS" ? "bg-red-950/30" : "bg-black"}`}
    >
      <CrisisOverlay attention={attention} />
      <CommandPalette
        open={commandOpen}
        focusMode={focusMode}
        setOpen={setCommandOpen}
        setFocusMode={setFocusMode}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
      />
      <WorkspaceDock
        preset={workspacePreset}
        setPreset={setWorkspacePreset}
        panelVisibility={panelVisibility}
        setPanelVisibility={setPanelVisibility}
        compactMode={compactMode}
        setCompactMode={setCompactMode}
        applyPreset={applyWorkspacePreset}
        resetWorkspace={resetWorkspace}
      />
      <AdaptiveCommandHeader
        attention={attention}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        audioArmed={audioArmed}
        setAudioArmed={setAudioArmed}
      />
      <CommandModeBar chain={chain} narrative={narrative} />
      <FocusToolbar
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        timeframe={timeframe}
        setTimeframe={setTimeframe}
        replayIndex={replayIndex}
        setReplayIndex={setReplayIndex}
        setCommandOpen={setCommandOpen}
      />
      <SeverityHeader narrative={narrative} chain={chain} />
      <SnapshotCommandCenter
        snapshots={snapshots}
        selectedSnapshotId={selectedSnapshotId}
        setSelectedSnapshotId={setSelectedSnapshotId}
        onCapture={captureSnapshot}
        onClear={clearSnapshots}
        activeSnapshot={activeSnapshot}
      />
      <DecisionQueuePanel
        queue={decisionQueue}
        onAdd={addDecisionFromSnapshot}
        onToggle={toggleDecisionStatus}
        onRemove={removeDecision}
        onClearDone={clearDoneDecisions}
        currentSnapshot={currentSnapshot}
      />

      <div className={gridClass}>
        {showLeft ? (
          <div className="flex min-h-0 flex-col gap-3">
            <OperatorBrief narrative={narrative} state={fetchState} />
            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
                Market Read
              </div>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {narrative.marketSummary}
              </p>
              {error ? (
                <div className="mt-3 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-200">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {showCenter ? (
          <div className="min-w-0">
            <UniverseMap
              nodes={nodes}
              replayIndex={replayIndex}
              focusMode={focusMode}
              adaptiveMode={attention.mode}
            />
          </div>
        ) : null}

        {showRight ? (
          <div className="flex min-h-0 flex-col gap-3">
            <ThreatRadar narrative={narrative} />
            <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
                Regional Validation
              </div>
              <div className="mt-3 text-lg font-black uppercase text-cyan-100">
                {label(narrative.regionalDivergence.status)}
              </div>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                {narrative.regionalDivergence.summary}
              </p>
              <div className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
                News {newsState}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div
        className={`mt-3 grid gap-3 ${focusMode === "overview" ? "2xl:grid-cols-[1.25fr_.75fr]" : ""}`}
      >
        {showChain ? <EventChainPanel chain={chain} /> : null}
        {showSignals ? <SignalMatrix narrative={narrative} /> : null}
      </div>

      {panelVisibility.drilldown ? (
        <details
          open
          className="mt-3 rounded-[1.5rem] border border-zinc-800 bg-zinc-950/70 p-4"
        >
          <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.30em] text-zinc-500">
            Advanced Drilldown / Replay / Memory
          </summary>
          <div className="mt-4">
            <Phase31_35IntelligenceLayer narrative={narrative} />
          </div>
        </details>
      ) : null}

      <style jsx>{`
        .qt-sweep {
          animation: qt-spin 7s linear infinite;
        }
        .qt-node {
          animation: qt-float 5.5s ease-in-out infinite;
        }
        .qt-pulse {
          animation: qt-pulse 2.6s ease-in-out infinite;
        }
        .qt-flow {
          animation: qt-flow 2.2s ease-in-out infinite;
        }
        .qt-attention {
          animation: qt-attention 1.8s ease-in-out infinite;
        }
        .qt-crisis-flash {
          animation: qt-crisis-flash 1.05s ease-in-out infinite;
        }
        .qt-heat-wave {
          animation: qt-heat-wave 3.2s ease-out infinite;
        }
        @keyframes qt-spin {
          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
        @keyframes qt-float {
          0%,
          100% {
            transform: translate(-50%, -50%) translateY(0);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-8px);
          }
        }
        @keyframes qt-pulse {
          0%,
          100% {
            transform: translate(-50%, -50%) scale(0.84);
            opacity: 0.08;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.26);
            opacity: 0.22;
          }
        }
        @keyframes qt-flow {
          0%,
          100% {
            filter: brightness(0.8);
            opacity: 0.28;
          }
          50% {
            filter: brightness(1.8);
            opacity: 0.88;
          }
        }
        @keyframes qt-attention {
          0%,
          100% {
            filter: brightness(0.8);
            opacity: 0.74;
          }
          50% {
            filter: brightness(1.7);
            opacity: 1;
          }
        }
        @keyframes qt-crisis-flash {
          0%,
          100% {
            opacity: 0.05;
          }
          50% {
            opacity: 0.18;
          }
        }
        @keyframes qt-heat-wave {
          0% {
            transform: translate(-50%, -50%) scale(0.72);
            opacity: 0.28;
          }
          70% {
            opacity: 0.1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.36);
            opacity: 0;
          }
        }
      `}</style>
    </section>
  );
}
