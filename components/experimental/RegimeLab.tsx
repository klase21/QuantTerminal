"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BadgeInfo,
  BellRing,
  BrainCircuit,
  CheckCircle2,
  Database,
  Gauge,
  GitBranch,
  Layers3,
  Pause,
  Play,
  RadioTower,
  Radar,
  Target,
  Shield,
  Sparkles,
  TestTube2,
  Waves,
  Zap,
} from "lucide-react"

import { calculateMarketRegime } from "@/lib/regime/calculateMarketRegime"
import { getCoreMigrationStats, terminalCoreManifest } from "@/core/terminalCoreManifest"
import type { DataLabHistoryMetric, MarketRegimeSnapshot, UpbitDataLabSnapshot } from "@/lib/regime/calculateMarketRegime"
import type { RealMarketRotationResponse } from "@/core/marketDataTypes"
import { useMarketStore } from "@/stores/useMarketStore"
import type { Ticker } from "@/types/market"

type ScenarioId = "live" | "alt" | "btc" | "panic" | "mixed"

const regimeAccent: Record<string, string> = {
  ALT_ROTATION: "from-fuchsia-500/20 via-purple-500/10 to-cyan-500/10 border-fuchsia-500/30",
  BTC_DEFENSIVE: "from-amber-500/20 via-orange-500/10 to-zinc-950 border-amber-500/30",
  RISK_ON: "from-emerald-500/20 via-cyan-500/10 to-zinc-950 border-emerald-500/30",
  RISK_OFF: "from-red-500/20 via-rose-500/10 to-zinc-950 border-red-500/30",
  MIXED: "from-zinc-700/30 via-zinc-900 to-black border-zinc-700",
}

const scenarioLabels: Record<ScenarioId, string> = {
  live: "Live",
  alt: "Alt Rotation",
  btc: "BTC Defensive",
  panic: "Risk Off",
  mixed: "Mixed",
}

type DataLabStatus = "idle" | "loading" | "connected" | "partial" | "proxy" | "error"

function formatDataLabValue(value?: number | null, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}${suffix}`
}

function formatScore(value: number) {
  if (!Number.isFinite(value)) return "—"
  return value.toFixed(2)
}

function clamp(value: number, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function getDataLabStatus(snapshot: UpbitDataLabSnapshot | null, loading: boolean): DataLabStatus {
  if (loading) return "loading"
  if (!snapshot) return "idle"
  if (!snapshot.ok) return "error"
  if (snapshot.source === "upbit-public-proxy") return "proxy"
  return snapshot.notes?.length ? "partial" : "connected"
}

function ticker(symbol: string, change24h: number, quoteVolume: number): Ticker {
  return {
    symbol,
    price: 1,
    change24h,
    volume: quoteVolume,
    quoteVolume,
    exchange: "scenario",
    timestamp: Date.now(),
  }
}

const scenarioTickers: Record<Exclude<ScenarioId, "live">, Record<string, Ticker>> = {
  alt: {
    BTCUSDT: ticker("BTCUSDT", 0.8, 900_000_000),
    ETHUSDT: ticker("ETHUSDT", 3.6, 820_000_000),
    SOLUSDT: ticker("SOLUSDT", 6.4, 620_000_000),
    PEPEUSDT: ticker("PEPEUSDT", 18.2, 420_000_000),
    DOGEUSDT: ticker("DOGEUSDT", 8.7, 380_000_000),
    FETUSDT: ticker("FETUSDT", 11.4, 280_000_000),
    RNDRUSDT: ticker("RNDRUSDT", 9.9, 220_000_000),
    ONDOUSDT: ticker("ONDOUSDT", 7.1, 180_000_000),
    AAVEUSDT: ticker("AAVEUSDT", 4.6, 110_000_000),
    GALAUSDT: ticker("GALAUSDT", 12.3, 160_000_000),
  },
  btc: {
    BTCUSDT: ticker("BTCUSDT", 2.9, 2_800_000_000),
    ETHUSDT: ticker("ETHUSDT", 0.4, 700_000_000),
    SOLUSDT: ticker("SOLUSDT", -1.9, 260_000_000),
    PEPEUSDT: ticker("PEPEUSDT", -6.8, 120_000_000),
    DOGEUSDT: ticker("DOGEUSDT", -3.9, 180_000_000),
    FETUSDT: ticker("FETUSDT", -4.6, 90_000_000),
    RNDRUSDT: ticker("RNDRUSDT", -2.2, 80_000_000),
    ONDOUSDT: ticker("ONDOUSDT", -1.5, 70_000_000),
    AAVEUSDT: ticker("AAVEUSDT", -0.6, 55_000_000),
    GALAUSDT: ticker("GALAUSDT", -5.2, 40_000_000),
  },
  panic: {
    BTCUSDT: ticker("BTCUSDT", -2.7, 1_900_000_000),
    ETHUSDT: ticker("ETHUSDT", -5.1, 900_000_000),
    SOLUSDT: ticker("SOLUSDT", -8.4, 430_000_000),
    PEPEUSDT: ticker("PEPEUSDT", -16.2, 260_000_000),
    DOGEUSDT: ticker("DOGEUSDT", -10.7, 220_000_000),
    FETUSDT: ticker("FETUSDT", -12.4, 130_000_000),
    RNDRUSDT: ticker("RNDRUSDT", -9.9, 110_000_000),
    ONDOUSDT: ticker("ONDOUSDT", -7.1, 100_000_000),
    AAVEUSDT: ticker("AAVEUSDT", -6.6, 95_000_000),
    GALAUSDT: ticker("GALAUSDT", -14.3, 85_000_000),
  },
  mixed: {
    BTCUSDT: ticker("BTCUSDT", 0.2, 1_200_000_000),
    ETHUSDT: ticker("ETHUSDT", 0.1, 680_000_000),
    SOLUSDT: ticker("SOLUSDT", 1.2, 300_000_000),
    PEPEUSDT: ticker("PEPEUSDT", -2.8, 160_000_000),
    DOGEUSDT: ticker("DOGEUSDT", 0.7, 150_000_000),
    FETUSDT: ticker("FETUSDT", 2.4, 130_000_000),
    RNDRUSDT: ticker("RNDRUSDT", -1.9, 90_000_000),
    ONDOUSDT: ticker("ONDOUSDT", 1.1, 100_000_000),
    AAVEUSDT: ticker("AAVEUSDT", -0.4, 80_000_000),
    GALAUSDT: ticker("GALAUSDT", 0.3, 75_000_000),
  },
}

function getBarTone(value: number) {
  if (value >= 70) return "bg-emerald-400"
  if (value >= 55) return "bg-cyan-400"
  if (value >= 40) return "bg-amber-400"
  return "bg-red-400"
}

function getStatusText(value: number) {
  if (value >= 70) return "Hot"
  if (value >= 55) return "Firm"
  if (value >= 40) return "Neutral"
  return "Cold"
}

function getSeverityClass(severity: string) {
  if (severity === "high") return "border-red-400/30 bg-red-500/10 text-red-100"
  if (severity === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
}

function getImpactClass(impact: string) {
  if (impact === "bullish") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
  if (impact === "bearish") return "border-red-400/20 bg-red-500/10 text-red-200"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function getLiquidityTone(direction: string) {
  if (direction === "INFLOW") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
  if (direction === "OUTFLOW") return "border-red-400/30 bg-red-500/10 text-red-200"
  if (direction === "CHURN") return "border-amber-400/30 bg-amber-500/10 text-amber-200"
  return "border-zinc-700 bg-zinc-900 text-zinc-400"
}

function getQualityTone(status?: string) {
  if (status === "healthy" || status === "connected" || status === "strong") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
  if (status === "partial" || status === "medium" || status === "idle") return "border-amber-400/30 bg-amber-500/10 text-amber-200"
  if (status === "degraded" || status === "stale" || status === "thin") return "border-orange-400/30 bg-orange-500/10 text-orange-200"
  if (status === "error") return "border-red-400/30 bg-red-500/10 text-red-200"
  return "border-zinc-700 bg-zinc-900 text-zinc-400"
}

function getBreakdownEntries(breakdown?: object) {
  if (!breakdown) return []
  return Object.entries(breakdown as Record<string, number>).map(([key, value]) => ({
    key,
    label: key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase()),
    value,
  }))
}

type VisualTimelineEvent = {
  id: string
  time: string
  type: "REGIME" | "LIQUIDITY" | "VOLATILITY" | "DATALAB" | "ALERT"
  title: string
  description: string
  severity: "info" | "watch" | "high"
  metric: string
}

function getTimelineTone(severity: VisualTimelineEvent["severity"]) {
  if (severity === "high") return "border-red-400/30 bg-red-500/10 text-red-100 shadow-red-500/10"
  if (severity === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-100 shadow-amber-500/10"
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100 shadow-cyan-500/10"
}


type FlowNode = {
  id: string
  label: string
  detail: string
  tone: string
  activeWhen: string[]
  metric: string
}

function buildFlowNodes(snapshot: MarketRegimeSnapshot, dataLabStatus: DataLabStatus): FlowNode[] {
  const leader = snapshot.liquidityRotations[0]
  const volatilityValue = snapshot.dataLab?.volatility
  const premiumValue = snapshot.dataLab?.premium

  return [
    {
      id: "scan",
      label: "SCAN",
      detail: dataLabStatus === "connected" ? "DataLab feed confirmed" : "Waiting for clean feed",
      tone: "border-zinc-600 bg-zinc-900/80 text-zinc-200",
      activeWhen: ["MIXED", "BTC_DEFENSIVE", "RISK_ON", "RISK_OFF", "ALT_ROTATION"],
      metric: dataLabStatus.toUpperCase(),
    },
    {
      id: "churn",
      label: "CHURN",
      detail: leader?.direction === "CHURN" ? `${leader.sector} rotation pressure` : "Watch for high-volume handoff",
      tone: "border-amber-400/40 bg-amber-500/10 text-amber-100",
      activeWhen: ["MIXED", "ALT_ROTATION", "RISK_ON"],
      metric: leader ? `${leader.triggerCount} triggers` : "—",
    },
    {
      id: "inflow",
      label: "INFLOW",
      detail: leader?.direction === "INFLOW" ? `${leader.sector} liquidity leader` : "No confirmed leader yet",
      tone: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
      activeWhen: ["ALT_ROTATION", "RISK_ON"],
      metric: leader ? leader.sector : "—",
    },
    {
      id: "expansion",
      label: "EXPANSION",
      detail: volatilityValue != null ? `Volatility ${volatilityValue.toFixed(2)}` : "Volatility pending",
      tone: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100",
      activeWhen: ["ALT_ROTATION", "RISK_ON", "RISK_OFF"],
      metric: volatilityValue != null ? volatilityValue.toFixed(2) : "—",
    },
    {
      id: "premium",
      label: "K-PREMIUM",
      detail: premiumValue != null ? `Premium ${premiumValue.toFixed(2)}%` : "Korea pressure pending",
      tone: "border-cyan-400/40 bg-cyan-500/10 text-cyan-100",
      activeWhen: ["ALT_ROTATION", "BTC_DEFENSIVE", "RISK_ON"],
      metric: premiumValue != null ? `${premiumValue.toFixed(2)}%` : "—",
    },
  ]
}

function getNodeIsActive(node: FlowNode, snapshot: MarketRegimeSnapshot, step: number) {
  const leader = snapshot.liquidityRotations[0]
  if (node.id === "churn") return leader?.direction === "CHURN" || step >= 1
  if (node.id === "inflow") return leader?.direction === "INFLOW" || snapshot.regime === "ALT_ROTATION" || step >= 2
  if (node.id === "expansion") return (snapshot.dataLab?.volatility ?? 0) >= 50 || step >= 3
  if (node.id === "premium") return Math.abs(snapshot.dataLab?.premium ?? 0) >= 1 || step >= 4
  return node.activeWhen.includes(snapshot.regime)
}

function getFlowArrowTone(direction: string) {
  if (direction === "INFLOW") return "from-emerald-400/0 via-emerald-300 to-emerald-400/0"
  if (direction === "OUTFLOW") return "from-red-400/0 via-red-300 to-red-400/0"
  if (direction === "CHURN") return "from-amber-400/0 via-amber-300 to-amber-400/0"
  return "from-zinc-500/0 via-zinc-500 to-zinc-500/0"
}

function getFlowLabel(direction: string) {
  if (direction === "INFLOW") return "Capital Inflow"
  if (direction === "OUTFLOW") return "Risk Outflow"
  if (direction === "CHURN") return "High Rotation"
  return "Quiet Flow"
}

function getFlowWidth(score: number) {
  return `${Math.max(18, Math.min(96, score))}%`
}

function buildVisualTimeline(
  snapshot: MarketRegimeSnapshot,
  scenario: ScenarioId,
  dataLabStatus: DataLabStatus
): VisualTimelineEvent[] {
  const leader = snapshot.liquidityRotations[0]
  const second = snapshot.liquidityRotations[1]
  const strongestAlert = [...snapshot.alertCandidates].sort((a, b) => b.confidence - a.confidence)[0]
  const hotSector = snapshot.sectors[0]

  const events: VisualTimelineEvent[] = [
    {
      id: "regime-now",
      time: "NOW",
      type: "REGIME",
      title: `${snapshot.regime} detected`,
      description: snapshot.summary,
      severity: snapshot.confidence >= 72 ? "watch" : "info",
      metric: `${snapshot.confidence}% confidence`,
    },
    {
      id: "liquidity-leader",
      time: "-02m",
      type: "LIQUIDITY",
      title: leader ? `${leader.sector} ${leader.direction}` : "Liquidity scan pending",
      description: leader ? leader.interpretation : "Waiting for sector pressure to form a confirmed candidate.",
      severity: leader?.direction === "OUTFLOW" ? "high" : leader && leader.direction !== "QUIET" ? "watch" : "info",
      metric: leader ? `score ${leader.score.toFixed(2)}` : "no leader",
    },
    {
      id: "sector-pulse",
      time: "-05m",
      type: "LIQUIDITY",
      title: hotSector ? `${hotSector.sector} radar leads` : "Sector radar warming",
      description: hotSector?.reason ?? "Sector matching is waiting for ticker coverage.",
      severity: hotSector && hotSector.score >= 70 ? "watch" : "info",
      metric: hotSector ? `${hotSector.score} heat` : "—",
    },
    {
      id: "volatility-context",
      time: "-08m",
      type: "VOLATILITY",
      title: "Volatility context applied",
      description: snapshot.dataLab?.volatility
        ? "Upbit volatility index is now included in the regime temperature and liquidity matrix."
        : "Volatility is still running from ticker movement until the DataLab value is available.",
      severity: snapshot.dataLab?.volatility && snapshot.dataLab.volatility >= 60 ? "watch" : "info",
      metric: snapshot.dataLab?.volatility != null ? snapshot.dataLab.volatility.toFixed(2) : "fallback",
    },
    {
      id: "datalab-status",
      time: "-11m",
      type: "DATALAB",
      title: `DataLab ${dataLabStatus}`,
      description: scenario === "live"
        ? "Live mode is reading Upbit DataLab snapshot inputs. Scenario mode remains isolated from production dashboard UI."
        : "Scenario mode is active, so DataLab values are visible but not injected into this run.",
      severity: dataLabStatus === "error" ? "high" : dataLabStatus === "partial" ? "watch" : "info",
      metric: scenario.toUpperCase(),
    },
  ]

  if (second) {
    events.splice(2, 0, {
      id: "second-flow",
      time: "-03m",
      type: "LIQUIDITY",
      title: `${second.sector} secondary flow`,
      description: `${second.direction} candidate with ${second.triggerCount} active trigger(s).`,
      severity: second.direction !== "QUIET" ? "watch" : "info",
      metric: `rank #${second.rank}`,
    })
  }

  if (strongestAlert) {
    events.push({
      id: "alert-candidate",
      time: "-14m",
      type: "ALERT",
      title: strongestAlert.title,
      description: strongestAlert.reason,
      severity: strongestAlert.severity,
      metric: `${strongestAlert.confidence}% alert`,
    })
  }

  return events.slice(0, 7)
}



type PlaybookStep = {
  label: string
  detail: string
  state: "complete" | "watch" | "blocked"
}

function buildActionPlaybook(item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined, snapshot: MarketRegimeSnapshot): PlaybookStep[] {
  if (!item) {
    return [
      { label: "Scan", detail: "Waiting for a ranked sector candidate.", state: "watch" },
      { label: "Validate", detail: "No liquidity evidence stack is available yet.", state: "blocked" },
      { label: "Promote", detail: "Alert promotion disabled until a candidate forms.", state: "blocked" },
    ]
  }

  const hasFlow = item.direction !== "QUIET"
  const hasConfidence = item.confidence >= 60
  const hasTriggers = item.triggerCount >= 2
  const regimeAligned = snapshot.regime === "ALT_ROTATION" || snapshot.regime === "RISK_ON" || item.direction === "OUTFLOW"

  return [
    {
      label: "1. Confirm Flow",
      detail: hasFlow ? `${item.sector} is in ${item.direction} with ${formatScore(item.score)} liquidity score.` : `${item.sector} is still QUIET. Keep it on radar only.`,
      state: hasFlow ? "complete" : "watch",
    },
    {
      label: "2. Validate Evidence",
      detail: hasTriggers ? `${item.triggerCount} trigger(s) active: volume, volatility, or price pressure confirmed.` : "Need at least two active triggers before promotion.",
      state: hasTriggers ? "complete" : "watch",
    },
    {
      label: "3. Check Regime Fit",
      detail: regimeAligned ? `${snapshot.regime} supports this signal context.` : `${snapshot.regime} is not fully aligned. Treat as lower conviction.`,
      state: regimeAligned ? "complete" : "watch",
    },
    {
      label: "4. Promote Alert",
      detail: hasFlow && hasConfidence && hasTriggers ? `Ready to promote ${item.sector} ${item.direction} to alert candidate.` : "Not ready for production alert. Keep in Regime Lab.",
      state: hasFlow && hasConfidence && hasTriggers ? "complete" : "blocked",
    },
  ]
}

function getPlaybookTone(state: PlaybookStep["state"]) {
  if (state === "complete") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (state === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}

function getPlaybookDot(state: PlaybookStep["state"]) {
  if (state === "complete") return "bg-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.8)]"
  if (state === "watch") return "bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.8)]"
  return "bg-zinc-600"
}


type AlertSimulation = {
  status: "READY" | "WATCH" | "BLOCKED"
  headline: string
  body: string
  route: string
  priority: "HIGH" | "MEDIUM" | "LOW"
  cooldown: string
  payload: string
  blockers: string[]
  confirmations: string[]
}

function buildAlertSimulation(
  item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined,
  snapshot: MarketRegimeSnapshot,
  playbook: PlaybookStep[]
): AlertSimulation {
  const finalStep = playbook[playbook.length - 1]
  const ready = finalStep?.state === "complete"

  if (!item) {
    return {
      status: "BLOCKED",
      headline: "No sector signal selected",
      body: "Select a sector from Rotation Command Map before simulating alert delivery.",
      route: "Regime Lab only",
      priority: "LOW",
      cooldown: "—",
      payload: "{ status: 'blocked', reason: 'no_sector_candidate' }",
      blockers: ["No ranked liquidity candidate", "No evidence stack", "No promotion target"],
      confirmations: [],
    }
  }

  const blockers = playbook
    .filter((step) => step.state !== "complete")
    .map((step) => step.label.replace(/^\d+\.\s*/, ""))

  const priority: AlertSimulation["priority"] =
    item.direction === "OUTFLOW" || item.confidence >= 75 ? "HIGH" : item.confidence >= 60 ? "MEDIUM" : "LOW"

  const status: AlertSimulation["status"] = ready ? "READY" : item.direction === "QUIET" ? "BLOCKED" : "WATCH"
  const verb = item.direction === "INFLOW" ? "liquidity entering" : item.direction === "OUTFLOW" ? "liquidity exiting" : item.direction === "CHURN" ? "high rotation forming" : "quiet flow"

  const payload = `{
  type: "LIQUIDITY_${item.direction}",
  sector: "${item.sector}",
  regime: "${snapshot.regime}",
  confidence: ${formatScore(item.confidence)},
  liquidityScore: ${formatScore(item.score)},
  volumePressure: ${formatScore(item.volumePressure)},
  volatility: ${formatScore(item.volatility)},
  priceChange: ${formatScore(item.priceChange)},
  priority: "${priority}"
}`

  return {
    status,
    headline: `${item.sector} ${item.direction} Alert ${ready ? "Ready" : "Simulation"}`,
    body: `${item.sector} shows ${verb} inside ${snapshot.regime}. Confidence ${formatScore(item.confidence)} with ${item.triggerCount} active trigger(s).`,
    route: ready ? "Alert Center → Toast → Sound" : "Regime Lab watchlist only",
    priority,
    cooldown: priority === "HIGH" ? "15m" : priority === "MEDIUM" ? "30m" : "60m",
    payload,
    blockers,
    confirmations: [
      `Direction: ${item.direction}`,
      `Regime: ${snapshot.regime}`,
      `Evidence: ${item.triggerCount} trigger(s)`,
    ],
  }
}

function getAlertSimulationTone(status: AlertSimulation["status"]) {
  if (status === "READY") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (status === "WATCH") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}

function getPriorityTone(priority: AlertSimulation["priority"]) {
  if (priority === "HIGH") return "border-red-400/30 bg-red-500/10 text-red-100"
  if (priority === "MEDIUM") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
}


type OperatorCommand = {
  id: string
  label: string
  target: string
  reason: string
  state: "armed" | "watch" | "blocked"
  eta: string
}

function buildOperatorCommands(
  item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined,
  snapshot: MarketRegimeSnapshot,
  alert: AlertSimulation
): OperatorCommand[] {
  const sector = item?.sector ?? "Market"
  const direction = item?.direction ?? "SCAN"
  const commands: OperatorCommand[] = [
    {
      id: "confirm-data",
      label: "Confirm Data Feed",
      target: "DataLab Snapshot",
      reason: snapshot.dataLab?.ok ? "Upbit DataLab snapshot is available for live context." : "Use scenario flow until DataLab snapshot stabilizes.",
      state: snapshot.dataLab?.ok ? "armed" : "watch",
      eta: "now",
    },
    {
      id: "track-sector",
      label: "Track Sector Pressure",
      target: sector,
      reason: item ? `${sector} is ranked #${item.rank} with ${formatScore(item.score)} liquidity score.` : "No sector has enough evidence yet.",
      state: item && item.direction !== "QUIET" ? "armed" : "watch",
      eta: "1-3m",
    },
    {
      id: "promote-alert",
      label: "Promote Alert",
      target: `${sector} ${direction}`,
      reason: alert.status === "READY" ? "Promotion rail is clear. This can be moved toward Alert Center." : "Keep this inside Regime Lab until blockers clear.",
      state: alert.status === "READY" ? "armed" : alert.status === "WATCH" ? "watch" : "blocked",
      eta: alert.cooldown,
    },
  ]

  return commands
}

function getCommandTone(state: OperatorCommand["state"]) {
  if (state === "armed") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (state === "watch") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-500"
}

function buildSignalStack(snapshot: MarketRegimeSnapshot, item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined) {
  return [
    { label: "Regime", value: snapshot.regime, score: snapshot.confidence, tone: snapshot.confidence >= 70 ? "emerald" : snapshot.confidence >= 55 ? "amber" : "zinc" },
    { label: "Leader", value: item ? `${item.sector} ${item.direction}` : "Scanning", score: item?.confidence ?? 0, tone: item && item.direction !== "QUIET" ? "cyan" : "zinc" },
    { label: "Volatility", value: snapshot.dataLab?.volatility != null ? formatDataLabValue(snapshot.dataLab.volatility) : "Pending", score: snapshot.dataLab?.volatility ?? 0, tone: (snapshot.dataLab?.volatility ?? 0) >= 50 ? "fuchsia" : "zinc" },
    { label: "K-Premium", value: snapshot.dataLab?.premium != null ? formatDataLabValue(snapshot.dataLab.premium, "%") : "Pending", score: Math.min(100, Math.abs(snapshot.dataLab?.premium ?? 0) * 20), tone: Math.abs(snapshot.dataLab?.premium ?? 0) >= 1 ? "cyan" : "zinc" },
  ]
}

function getStackTone(tone: string) {
  if (tone === "emerald") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (tone === "amber") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  if (tone === "cyan") return "border-cyan-400/30 bg-cyan-500/10 text-cyan-100"
  if (tone === "fuchsia") return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}


type RegimeStateNode = {
  id: string
  label: string
  description: string
  score: number
  active: boolean
  next: string
  tone: string
}

function buildRegimeStateMachine(snapshot: MarketRegimeSnapshot): RegimeStateNode[] {
  const factors = Object.fromEntries(snapshot.factors.map((factor) => [factor.label, factor.value]))
  const riskAppetite = Number(factors["Risk Appetite"] ?? 0)
  const altStrength = Number(factors["Alt Strength"] ?? 0)
  const btcDefense = Number(factors["BTC Defense"] ?? 0)
  const liquidity = Number(factors["Liquidity"] ?? 0)
  const volatility = snapshot.dataLab?.volatility ?? 0
  const premiumAbs = Math.abs(snapshot.dataLab?.premium ?? 0)
  const leader = snapshot.liquidityRotations[0]

  const compressionScore = Math.max(0, 70 - volatility)
  const defensiveScore = Math.max(btcDefense, 100 - altStrength)
  const churnScore = leader?.direction === "CHURN" ? leader.confidence : Math.max(35, liquidity * 0.55)
  const inflowScore = leader?.direction === "INFLOW" ? leader.confidence : Math.max(25, altStrength * 0.65)
  const expansionScore = Math.max(volatility, riskAppetite, altStrength)
  const euphoriaScore = Math.min(100, riskAppetite * 0.42 + altStrength * 0.32 + volatility * 0.18 + premiumAbs * 8)

  return [
    {
      id: "defensive",
      label: "BTC_DEFENSIVE",
      description: "BTC/stable preference dominates. Alt signals need stronger confirmation.",
      score: defensiveScore,
      active: snapshot.regime === "BTC_DEFENSIVE",
      next: "COMPRESSION",
      tone: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    },
    {
      id: "compression",
      label: "COMPRESSION",
      description: "Volatility is contained. Watch for liquidity handoff before breakout.",
      score: compressionScore,
      active: volatility > 0 && volatility < 35,
      next: "CHURN",
      tone: "border-blue-400/30 bg-blue-500/10 text-blue-100",
    },
    {
      id: "churn",
      label: "CHURN",
      description: "High rotation / handoff zone. Volume and volatility rise before direction confirms.",
      score: churnScore,
      active: leader?.direction === "CHURN",
      next: "INFLOW",
      tone: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    },
    {
      id: "inflow",
      label: "INFLOW",
      description: "Liquidity leader forms. Sector candidates become alert-watch candidates.",
      score: inflowScore,
      active: leader?.direction === "INFLOW" || snapshot.regime === "ALT_ROTATION",
      next: "EXPANSION",
      tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    },
    {
      id: "expansion",
      label: "EXPANSION",
      description: "Trend participation broadens. Regime confidence and volatility both matter here.",
      score: expansionScore,
      active: snapshot.regime === "RISK_ON" || snapshot.regime === "ALT_ROTATION" || volatility >= 50,
      next: "EUPHORIA",
      tone: "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100",
    },
    {
      id: "euphoria",
      label: "EUPHORIA",
      description: "Late-stage risk appetite. Strong upside can coexist with distribution risk.",
      score: euphoriaScore,
      active: euphoriaScore >= 72,
      next: "RISK_OFF",
      tone: "border-pink-400/30 bg-pink-500/10 text-pink-100",
    },
    {
      id: "riskoff",
      label: "RISK_OFF",
      description: "Capital leaves high beta. OUTFLOW alerts should outrank inflow candidates.",
      score: snapshot.regime === "RISK_OFF" ? snapshot.confidence : Math.max(20, 100 - riskAppetite),
      active: snapshot.regime === "RISK_OFF" || leader?.direction === "OUTFLOW",
      next: "BTC_DEFENSIVE",
      tone: "border-red-400/30 bg-red-500/10 text-red-100",
    },
  ].map((node) => ({ ...node, score: Math.max(0, Math.min(100, node.score)) }))
}



type GlossaryTerm = {
  term: string
  meaning: string
  usage: string
  tone: string
}

const regimeGlossary: GlossaryTerm[] = [
  { term: "REGIME", meaning: "Current market operating mode inferred from sentiment, dominance, liquidity, volatility, and sector flow.", usage: "Used as context for every rotation and alert decision.", tone: "border-violet-400/25 bg-violet-500/10 text-violet-100" },
  { term: "INFLOW", meaning: "Liquidity pressure is entering a sector with volume, volatility, and positive price confirmation.", usage: "Potential long-side attention or alert promotion candidate.", tone: "border-emerald-400/25 bg-emerald-500/10 text-emerald-100" },
  { term: "OUTFLOW", meaning: "Liquidity pressure is leaving or selling through a sector with negative price pressure.", usage: "Risk reduction, sell pressure, or distribution warning.", tone: "border-red-400/25 bg-red-500/10 text-red-100" },
  { term: "CHURN", meaning: "High rotation / handoff state. Volume and volatility rise but direction is not confirmed yet.", usage: "Watch zone before breakout, breakdown, accumulation, or distribution.", tone: "border-amber-400/25 bg-amber-500/10 text-amber-100" },
  { term: "COMPRESSION", meaning: "Volatility is contained and the market is storing energy before the next directional move.", usage: "Look for liquidity expansion or sector rank changes.", tone: "border-blue-400/25 bg-blue-500/10 text-blue-100" },
  { term: "EXPANSION", meaning: "Participation and volatility are broadening. Trend phase is active or forming.", usage: "Alert confidence can increase when regime and sector flow agree.", tone: "border-fuchsia-400/25 bg-fuchsia-500/10 text-fuchsia-100" },
]

const enhancedScenarioPresets = [
  { id: "btc", label: "BTC Defensive", recipe: "BTC dominance high · altseason weak · premium muted", output: "BTC_DEFENSIVE" },
  { id: "alt", label: "Alt Rotation", recipe: "Alt breadth rising · sector INFLOW · volatility active", output: "ALT_ROTATION" },
  { id: "panic", label: "Panic / Risk Off", recipe: "High volatility · negative price pressure · OUTFLOW leaders", output: "RISK_OFF" },
  { id: "mixed", label: "Churn Before Breakout", recipe: "Volume/volatility rise · price flat · no clean leader", output: "CHURN WATCH" },
  { id: "live", label: "Korea Retail FOMO", recipe: "Premium expands · Upbit volume rises · high beta INFLOW", output: "RISK_ON / EUPHORIA WATCH" },
]

type FormulaRow = {
  label: string
  formula: string
  current: string
  status: "pass" | "watch" | "blocked"
  note: string
}

function getFormulaTone(status: FormulaRow["status"]) {
  if (status === "pass") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
  if (status === "watch") return "border-amber-400/25 bg-amber-500/10 text-amber-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}

function buildFormulaInspector(snapshot: MarketRegimeSnapshot, item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined): FormulaRow[] {
  const premium = snapshot.dataLab?.premium
  const volatility = snapshot.dataLab?.volatility
  const riskFactor = snapshot.factors.find((factor) => factor.label === "Risk Appetite")
  const altFactor = snapshot.factors.find((factor) => factor.label === "Alt Strength")
  const liquidity = item?.score ?? 0
  const triggerCount = item?.triggerCount ?? 0
  const direction = item?.direction ?? "QUIET"

  return [
    {
      label: "Liquidity Score",
      formula: "volumePressure × 0.45 + volatility × 0.30 + priceMomentum × 0.20 + breadthBonus × 0.05",
      current: item ? `${formatScore(item.score)} / 100` : "No sector selected",
      status: liquidity >= 70 ? "pass" : liquidity >= 45 ? "watch" : "blocked",
      note: item ? `${item.sector} currently has ${triggerCount} active trigger(s).` : "Select a sector from Rotation Command Map.",
    },
    {
      label: "Confidence Gate",
      formula: "confidence >= 60 AND triggerCount >= 2 AND direction != QUIET",
      current: item ? `${formatScore(item.confidence)} confidence · ${triggerCount} trigger(s) · ${direction}` : "No candidate",
      status: item && item.confidence >= 60 && triggerCount >= 2 && direction !== "QUIET" ? "pass" : item && direction !== "QUIET" ? "watch" : "blocked",
      note: "Controls whether a lab signal can move toward Alert Simulation.",
    },
    {
      label: "Regime Fit",
      formula: "ALT_ROTATION/RISK_ON supports INFLOW · RISK_OFF supports OUTFLOW · CHURN stays watch-only",
      current: `${snapshot.regime} with ${item?.direction ?? "SCAN"}`,
      status: (snapshot.regime === "ALT_ROTATION" || snapshot.regime === "RISK_ON" || item?.direction === "OUTFLOW") ? "pass" : item?.direction === "CHURN" ? "watch" : "blocked",
      note: "Same sector signal is interpreted differently depending on current regime.",
    },
    {
      label: "DataLab Context",
      formula: "fearGreed + altSeason + premium + btcDominance + volatility",
      current: `premium ${premium != null ? formatDataLabValue(premium, "%") : "—"} · volatility ${volatility != null ? formatDataLabValue(volatility) : "—"}`,
      status: snapshot.dataLab?.ok ? "pass" : "watch",
      note: "Overview and indicator APIs provide macro context for the sandbox.",
    },
    {
      label: "Regime Score",
      formula: "weighted risk appetite + alt strength + BTC defense + liquidity + volatility context",
      current: `${snapshot.regime} · ${snapshot.confidence}% confidence · ${snapshot.temperature}`,
      status: snapshot.confidence >= 72 ? "pass" : snapshot.confidence >= 55 ? "watch" : "blocked",
      note: `${riskFactor?.label ?? "Risk"}: ${riskFactor?.value ?? "—"} · ${altFactor?.label ?? "Alt"}: ${altFactor?.value ?? "—"}`,
    },
  ]
}

type SignalConflict = {
  title: string
  detail: string
  severity: "low" | "medium" | "high"
}

function getConflictTone(severity: SignalConflict["severity"]) {
  if (severity === "high") return "border-red-400/25 bg-red-500/10 text-red-100"
  if (severity === "medium") return "border-amber-400/25 bg-amber-500/10 text-amber-100"
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
}

function buildSignalConflicts(snapshot: MarketRegimeSnapshot, item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined): SignalConflict[] {
  const conflicts: SignalConflict[] = []
  const premium = snapshot.dataLab?.premium ?? 0
  const altSeason = snapshot.dataLab?.altSeason ?? 0
  const btcDominance = snapshot.dataLab?.btcDominance ?? 0
  const volatility = snapshot.dataLab?.volatility ?? 0

  if (item && item.volumePressure >= 65 && Math.abs(item.priceChange) < 1.5) {
    conflicts.push({
      title: "Volume without price confirmation",
      detail: `${item.sector} has elevated volume pressure but price is not confirming direction yet. Treat as CHURN / handoff risk.`,
      severity: "medium",
    })
  }

  if (premium > 1 && altSeason < 35) {
    conflicts.push({
      title: "Korea premium vs weak alt breadth",
      detail: "Korean bid is improving, but broad alt participation is still weak. Avoid over-promoting isolated spikes.",
      severity: "medium",
    })
  }

  if (btcDominance >= 63 && item?.direction === "INFLOW") {
    conflicts.push({
      title: "BTC dominance against sector inflow",
      detail: `${item.sector} has INFLOW, but BTC dominance remains high. Sector signal may be short-lived unless breadth improves.`,
      severity: "high",
    })
  }

  if (volatility >= 60 && snapshot.regime !== "RISK_OFF" && item?.direction === "OUTFLOW") {
    conflicts.push({
      title: "Volatility expansion with outflow leader",
      detail: "Volatility is elevated while the leader is OUTFLOW. Downside risk can outrank rotation opportunities.",
      severity: "high",
    })
  }

  if (!conflicts.length) {
    conflicts.push({
      title: "No major signal conflict",
      detail: "Current regime, liquidity leader, and DataLab context are not strongly contradicting each other.",
      severity: "low",
    })
  }

  return conflicts.slice(0, 4)
}

function buildOperatorSummary(snapshot: MarketRegimeSnapshot, item: MarketRegimeSnapshot["liquidityRotations"][number] | undefined, dataLabStatus: DataLabStatus, scenario: ScenarioId) {
  const sectorText = item ? `${item.sector} ${item.direction}` : "no confirmed sector leader"
  const premiumText = snapshot.dataLab?.premium != null ? `premium ${formatDataLabValue(snapshot.dataLab.premium, "%")}` : "premium pending"
  const volatilityText = snapshot.dataLab?.volatility != null ? `volatility ${formatDataLabValue(snapshot.dataLab.volatility)}` : "volatility pending"
  const modeText = scenario === "live" ? `live feed ${dataLabStatus}` : `${scenarioLabels[scenario]} scenario`

  return `Market is in ${snapshot.regime} with ${snapshot.confidence}% confidence. Leading flow is ${sectorText}. Context: ${premiumText}, ${volatilityText}, ${modeText}.`
}

function getRegimePathSummary(nodes: RegimeStateNode[]) {
  const active = nodes.filter((node) => node.active).map((node) => node.label)
  if (!active.length) return "No hard state lock yet. Market remains in scanning mode."
  return `Active state lock: ${active.join(" + ")}`
}

function metric2(value?: number | null, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—"
  return `${value.toFixed(2)}${suffix}`
}

function getMomentumTone(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "border-zinc-800 bg-zinc-950 text-zinc-500"
  if (value > 0.5) return "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
  if (value < -0.5) return "border-red-400/25 bg-red-500/10 text-red-200"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function getPercentileTone(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "bg-zinc-700"
  if (value >= 80) return "bg-fuchsia-400"
  if (value >= 60) return "bg-emerald-400"
  if (value >= 35) return "bg-cyan-400"
  return "bg-amber-400"
}

function getHistoryMetrics(snapshot: MarketRegimeSnapshot) {
  const history = snapshot.dataLab?.history ?? {}
  return [
    history.fearGreed,
    history.volatility,
    history.altSeason,
    history.btcDominance,
    history.tradeVolumeTrend,
    history.premium,
  ].filter(Boolean)
}

function buildHistoricalMatrix(snapshot: MarketRegimeSnapshot) {
  const history = snapshot.dataLab?.history ?? {}
  const fear = history.fearGreed
  const vol = history.volatility
  const alt = history.altSeason
  const btc = history.btcDominance
  const premium = history.premium
  const volume = history.tradeVolumeTrend

  const fearPct = fear?.percentile ?? 50
  const volPct = vol?.percentile ?? 50
  const alt7 = alt?.change7d ?? 0
  const btc7 = btc?.change7d ?? 0
  const premium7 = premium?.change7d ?? 0
  const volume7 = volume?.change7d ?? 0

  const rows = []

  let matrix = "Neutral positioning"
  if (fearPct >= 75 && volPct >= 70) matrix = "EUPHORIA / high-vol risk"
  else if (fearPct <= 25 && volPct >= 70) matrix = "CAPITULATION / panic volatility"
  else if (fearPct >= 45 && fearPct <= 65 && volPct <= 35) matrix = "COMPRESSION / setup phase"
  else if (fear?.change7d != null && vol?.change7d != null && fear.change7d > 0 && vol.change7d > 0) matrix = "EXPANSION / sentiment + vol rising"

  rows.push({
    title: "Fear × Volatility Matrix",
    value: matrix,
    detail: `Fear pct ${metric2(fear?.percentile, "%")} · Vol pct ${metric2(vol?.percentile, "%")}`,
    tone: volPct >= 70 ? "border-red-400/25 bg-red-500/10 text-red-100" : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100",
  })

  let divergence = "No hard divergence"
  let divTone = "border-zinc-700 bg-zinc-900 text-zinc-300"
  if (alt7 > 0 && btc7 > 0) {
    divergence = "ALT ↑ while BTC dominance ↑"
    divTone = "border-amber-400/25 bg-amber-500/10 text-amber-100"
  } else if (alt7 > 0 && btc7 < 0) {
    divergence = "Clean ALT rotation"
    divTone = "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
  } else if (alt7 < 0 && btc7 > 0) {
    divergence = "BTC defensive divergence"
    divTone = "border-orange-400/25 bg-orange-500/10 text-orange-100"
  }

  rows.push({
    title: "Altseason × BTC Dominance",
    value: divergence,
    detail: `Alt 7D ${metric2(alt7)} · BTC Dom 7D ${metric2(btc7)}`,
    tone: divTone,
  })

  let local = "Korea pressure neutral"
  let localTone = "border-zinc-700 bg-zinc-900 text-zinc-300"
  if (premium7 > 0 && volume7 > 0) {
    local = "Korea liquidity expansion"
    localTone = "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
  } else if (premium7 > 0 && volume7 <= 0) {
    local = "Premium up without volume confirmation"
    localTone = "border-amber-400/25 bg-amber-500/10 text-amber-100"
  } else if (premium7 < 0 && volume7 < 0) {
    local = "Korea liquidity cooling"
    localTone = "border-red-400/25 bg-red-500/10 text-red-100"
  }

  rows.push({
    title: "Premium × Trade Volume",
    value: local,
    detail: `Premium 7D ${metric2(premium7)} · Volume 7D ${metric2(volume7)}`,
    tone: localTone,
  })

  return rows
}

function buildHistoryTimeline(snapshot: MarketRegimeSnapshot) {
  const history = snapshot.dataLab?.history ?? {}
  const events: Array<{ title: string; detail: string; severity: "info" | "watch" | "high" }> = []

  Object.values(history).forEach((metric: any) => {
    if (!metric) return
    if (metric.percentile != null && metric.percentile >= 85) {
      events.push({
        title: `${metric.label} high percentile`,
        detail: `${metric.label} is at ${metric2(metric.percentile, "%")} of its historical range.`,
        severity: "watch",
      })
    }
    if (metric.change7d != null && Math.abs(metric.change7d) >= 5) {
      events.push({
        title: `${metric.label} momentum ${metric.direction}`,
        detail: `7D change ${metric2(metric.change7d)} · 30D change ${metric2(metric.change30d)}`,
        severity: Math.abs(metric.change7d) >= 12 ? "high" : "info",
      })
    }
  })

  if (!events.length) {
    events.push({
      title: "Historical layer scanning",
      detail: "No extreme percentile or large 7D momentum event detected yet.",
      severity: "info",
    })
  }

  return events.slice(0, 6)
}


type RotationLifecycleState = "QUIET" | "CHURN" | "INFLOW" | "EXPANSION" | "EXHAUSTION" | "OUTFLOW"

type RotationIntelligenceRow = MarketRegimeSnapshot["liquidityRotations"][number] & {
  previousRank?: number
  rankDelta: number
  lifecycle: RotationLifecycleState
  regimeFit: number
  premiumBoost: number
  rotationStory: string
  timelineEvent: string
}

function getLifecycleState(item: MarketRegimeSnapshot["liquidityRotations"][number]): RotationLifecycleState {
  if (item.direction === "OUTFLOW") return "OUTFLOW"
  if (item.direction === "CHURN") return "CHURN"
  if (item.direction === "INFLOW" && item.confidence >= 76 && item.volatility >= 55) return "EXPANSION"
  if (item.direction === "INFLOW") return "INFLOW"
  if (item.score >= 70 && item.priceChange < 0) return "EXHAUSTION"
  return "QUIET"
}

function getLifecycleTone(state: RotationLifecycleState) {
  if (state === "EXPANSION") return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
  if (state === "INFLOW") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (state === "OUTFLOW") return "border-red-400/30 bg-red-500/10 text-red-100"
  if (state === "CHURN") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  if (state === "EXHAUSTION") return "border-orange-400/30 bg-orange-500/10 text-orange-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-400"
}

function getRankDeltaLabel(delta: number) {
  if (delta > 0) return `▲ ${delta}`
  if (delta < 0) return `▼ ${Math.abs(delta)}`
  return "—"
}

function getRankDeltaTone(delta: number) {
  if (delta > 0) return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
  if (delta < 0) return "border-red-400/30 bg-red-500/10 text-red-200"
  return "border-zinc-800 bg-zinc-950 text-zinc-500"
}

function buildRotationStory(item: MarketRegimeSnapshot["liquidityRotations"][number], snapshot: MarketRegimeSnapshot, lifecycle: RotationLifecycleState, rankDelta: number) {
  const movement = rankDelta > 0 ? `rank improved by ${rankDelta}` : rankDelta < 0 ? `rank faded by ${Math.abs(rankDelta)}` : "rank is stable"
  if (lifecycle === "EXPANSION") return `${item.sector} is entering EXPANSION inside ${snapshot.regime}; ${movement}, liquidity score ${formatScore(item.score)}, volatility ${formatScore(item.volatility)}.`
  if (lifecycle === "INFLOW") return `${item.sector} is showing INFLOW; volume and price are aligned, but expansion still needs persistence.`
  if (lifecycle === "CHURN") return `${item.sector} is in CHURN; liquidity is active but direction is not confirmed yet.`
  if (lifecycle === "OUTFLOW") return `${item.sector} is showing OUTFLOW; negative price pressure is dominating liquidity activity.`
  if (lifecycle === "EXHAUSTION") return `${item.sector} may be entering EXHAUSTION; high activity is no longer producing clean upside.`
  return `${item.sector} remains QUIET; keep it as background context.`
}

function buildRotationIntelligence(
  snapshot: MarketRegimeSnapshot,
  previousRanks: Record<string, number>
): RotationIntelligenceRow[] {
  const premiumAbs = Math.abs(snapshot.dataLab?.premium ?? 0)
  return snapshot.liquidityRotations.map((item) => {
    const previousRank = previousRanks[item.sector]
    const rankDelta = previousRank ? previousRank - item.rank : 0
    const lifecycle = getLifecycleState(item)
    const regimeFit = (() => {
      if (snapshot.regime === "ALT_ROTATION" && (item.direction === "INFLOW" || lifecycle === "EXPANSION")) return 92
      if (snapshot.regime === "RISK_ON" && item.direction === "INFLOW") return 84
      if (snapshot.regime === "RISK_OFF" && item.direction === "OUTFLOW") return 88
      if (snapshot.regime === "BTC_DEFENSIVE" && item.direction === "INFLOW") return 42
      if (item.direction === "CHURN") return 58
      return 50
    })()
    const premiumBoost = Math.min(20, premiumAbs * 6)
    const rotationStory = buildRotationStory(item, snapshot, lifecycle, rankDelta)
    const timelineEvent = `${item.sector} ${lifecycle} · rank #${item.rank}${rankDelta ? ` (${getRankDeltaLabel(rankDelta)})` : ""}`

    return {
      ...item,
      previousRank,
      rankDelta,
      lifecycle,
      regimeFit,
      premiumBoost,
      rotationStory,
      timelineEvent,
    }
  })
}

function buildRotationPhase3Summary(rows: RotationIntelligenceRow[], snapshot: MarketRegimeSnapshot) {
  const leader = rows[0]
  const mover = [...rows].sort((a, b) => b.rankDelta - a.rankDelta)[0]
  const expansion = rows.find((row) => row.lifecycle === "EXPANSION")
  const outflow = rows.find((row) => row.lifecycle === "OUTFLOW")

  if (outflow && snapshot.regime === "RISK_OFF") return `${outflow.sector} OUTFLOW is the dominant rotation risk. Defensive alerts should outrank inflow candidates.`
  if (expansion) return `${expansion.sector} is the strongest EXPANSION candidate with ${formatScore(expansion.confidence)} confidence.`
  if (mover && mover.rankDelta > 0) return `${mover.sector} is the fastest rank climber while ${leader?.sector ?? "market"} remains the liquidity leader.`
  if (leader) return `${leader.sector} is the current liquidity leader, but persistence is still required before production promotion.`
  return "Rotation intelligence is scanning for a confirmed sector leader."
}


type Phase4Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
type Phase4Status = "FIRED" | "QUEUED" | "SUPPRESSED" | "WATCH"

type Phase4Alert = {
  id: string
  type: "REGIME" | "ROTATION" | "LIQUIDITY" | "VOLATILITY"
  title: string
  sector: string
  severity: Phase4Severity
  status: Phase4Status
  confidence: number
  cooldown: string
  route: string
  reasons: string[]
  payload: string
}

type Phase4Event = {
  id: string
  bus: "EVENT_BUS" | "ALERT_ENGINE" | "COOLDOWN" | "OPERATOR"
  title: string
  detail: string
  status: Phase4Status
  severity: Phase4Severity
}

type CooldownSlot = {
  key: string
  label: string
  remaining: string
  state: "open" | "cooling" | "locked"
}

function getPhase4SeverityTone(severity: Phase4Severity) {
  if (severity === "CRITICAL") return "border-red-300/40 bg-red-500/15 text-red-100 shadow-red-500/20"
  if (severity === "HIGH") return "border-orange-300/35 bg-orange-500/15 text-orange-100 shadow-orange-500/15"
  if (severity === "MEDIUM") return "border-amber-300/35 bg-amber-500/12 text-amber-100 shadow-amber-500/10"
  return "border-cyan-300/25 bg-cyan-500/10 text-cyan-100 shadow-cyan-500/10"
}

function getPhase4StatusTone(status: Phase4Status) {
  if (status === "FIRED") return "border-emerald-300/40 bg-emerald-500/15 text-emerald-100"
  if (status === "QUEUED") return "border-cyan-300/35 bg-cyan-500/12 text-cyan-100"
  if (status === "SUPPRESSED") return "border-zinc-700 bg-zinc-950 text-zinc-500"
  return "border-amber-300/35 bg-amber-500/12 text-amber-100"
}

function getCooldownTone(state: CooldownSlot["state"]) {
  if (state === "open") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
  if (state === "cooling") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-zinc-800 bg-zinc-950 text-zinc-500"
}

function mapPriorityToSeverity(priority: AlertSimulation["priority"], confidence: number, direction?: string): Phase4Severity {
  if (direction === "OUTFLOW" && confidence >= 72) return "CRITICAL"
  if (priority === "HIGH" || confidence >= 76) return "HIGH"
  if (priority === "MEDIUM" || confidence >= 60) return "MEDIUM"
  return "LOW"
}

function buildPhase4AlertOS(
  snapshot: MarketRegimeSnapshot,
  selected: MarketRegimeSnapshot["liquidityRotations"][number] | undefined,
  alert: AlertSimulation,
  rotations: RotationIntelligenceRow[]
) {
  const leader = rotations[0]
  const expansion = rotations.find((row) => row.lifecycle === "EXPANSION")
  const outflow = rotations.find((row) => row.lifecycle === "OUTFLOW")
  const highMover = [...rotations].sort((a, b) => b.rankDelta - a.rankDelta)[0]
  const primary = selected ?? leader
  const severity = mapPriorityToSeverity(alert.priority, primary?.confidence ?? snapshot.confidence, primary?.direction)

  const alerts: Phase4Alert[] = []

  if (primary) {
    const status: Phase4Status = alert.status === "READY" ? "FIRED" : alert.status === "WATCH" ? "QUEUED" : "WATCH"
    alerts.push({
      id: `liquidity-${primary.sector}-${primary.direction}`,
      type: "LIQUIDITY",
      title: `${primary.sector} ${primary.direction} promotion`,
      sector: primary.sector,
      severity,
      status,
      confidence: primary.confidence,
      cooldown: alert.cooldown,
      route: status === "FIRED" ? "Event Bus → Alert Center → Operator HUD" : "Event Bus → Watch Queue",
      reasons: [
        `Liquidity score ${formatScore(primary.score)}`,
        `Trigger stack ${primary.triggerCount}`,
        `Regime context ${snapshot.regime}`,
      ],
      payload: `{ type: "LIQUIDITY_${primary.direction}", sector: "${primary.sector}", severity: "${severity}", confidence: ${formatScore(primary.confidence)} }`,
    })
  }

  if (expansion) {
    alerts.push({
      id: `rotation-expansion-${expansion.sector}`,
      type: "ROTATION",
      title: `${expansion.sector} EXPANSION detected`,
      sector: expansion.sector,
      severity: expansion.confidence >= 82 ? "CRITICAL" : "HIGH",
      status: expansion.rank <= 2 ? "FIRED" : "QUEUED",
      confidence: expansion.confidence,
      cooldown: "20m",
      route: "Rotation Engine → Priority Queue",
      reasons: [
        `Lifecycle ${expansion.lifecycle}`,
        `Regime fit ${formatScore(expansion.regimeFit)}`,
        `Premium boost ${formatScore(expansion.premiumBoost)}`,
      ],
      payload: `{ type: "ROTATION_EXPANSION", sector: "${expansion.sector}", lifecycle: "${expansion.lifecycle}" }`,
    })
  }

  if (outflow) {
    alerts.push({
      id: `risk-outflow-${outflow.sector}`,
      type: "ROTATION",
      title: `${outflow.sector} OUTFLOW risk`,
      sector: outflow.sector,
      severity: "HIGH",
      status: snapshot.regime === "RISK_OFF" ? "FIRED" : "QUEUED",
      confidence: outflow.confidence,
      cooldown: "15m",
      route: "Risk Monitor → Operator HUD",
      reasons: [
        `Negative price pressure ${formatScore(outflow.priceChange)}`,
        `Volatility ${formatScore(outflow.volatility)}`,
        `Risk regime ${snapshot.regime}`,
      ],
      payload: `{ type: "ROTATION_OUTFLOW", sector: "${outflow.sector}", regime: "${snapshot.regime}" }`,
    })
  }

  if (highMover && highMover.rankDelta > 0) {
    alerts.push({
      id: `rank-change-${highMover.sector}`,
      type: "ROTATION",
      title: `${highMover.sector} rank acceleration`,
      sector: highMover.sector,
      severity: highMover.rankDelta >= 3 ? "HIGH" : "MEDIUM",
      status: "QUEUED",
      confidence: Math.min(95, highMover.confidence + highMover.rankDelta * 4),
      cooldown: "30m",
      route: "Rank Tracker → Watch Queue",
      reasons: [
        `Rank delta ${getRankDeltaLabel(highMover.rankDelta)}`,
        `Current rank #${highMover.rank}`,
        `Lifecycle ${highMover.lifecycle}`,
      ],
      payload: `{ type: "RANK_ACCELERATION", sector: "${highMover.sector}", rankDelta: ${highMover.rankDelta} }`,
    })
  }

  const vol = snapshot.dataLab?.volatility ?? 0
  if (vol >= 60) {
    alerts.push({
      id: "market-volatility-expansion",
      type: "VOLATILITY",
      title: "Market volatility expansion",
      sector: "MARKET",
      severity: vol >= 80 ? "CRITICAL" : "HIGH",
      status: "QUEUED",
      confidence: Math.min(95, vol),
      cooldown: "25m",
      route: "Volatility → Event Bus",
      reasons: [`Volatility ${formatScore(vol)}`, `Regime ${snapshot.regime}`, "Use as context filter for sector alerts"],
      payload: `{ type: "VOLATILITY_EXPANSION", volatility: ${formatScore(vol)} }`,
    })
  }

  if (!alerts.length) {
    alerts.push({
      id: "lab-watch-scan",
      type: "REGIME",
      title: "No production-grade alert",
      sector: "MARKET",
      severity: "LOW",
      status: "WATCH",
      confidence: snapshot.confidence,
      cooldown: "—",
      route: "Regime Lab",
      reasons: ["No sector cleared promotion threshold", "Keep scanning for persistence"],
      payload: `{ type: "LAB_WATCH", regime: "${snapshot.regime}" }`,
    })
  }

  const sortedAlerts = [...alerts].sort((a, b) => {
    const weight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
    return weight[b.severity] - weight[a.severity] || b.confidence - a.confidence
  })

  const firedCount = sortedAlerts.filter((item) => item.status === "FIRED").length
  const queuedCount = sortedAlerts.filter((item) => item.status === "QUEUED").length
  const osStatus = firedCount > 0 ? "ARMED" : queuedCount > 0 ? "QUEUEING" : "WATCH"
  const hudFlash = firedCount > 0 || sortedAlerts.some((item) => item.severity === "CRITICAL")

  const eventBus: Phase4Event[] = sortedAlerts.slice(0, 5).map((item, index) => ({
    id: `event-${item.id}`,
    bus: item.status === "FIRED" ? "ALERT_ENGINE" : item.status === "QUEUED" ? "EVENT_BUS" : item.status === "SUPPRESSED" ? "COOLDOWN" : "OPERATOR",
    title: item.title,
    detail: `${item.route} · ${item.reasons[0] ?? "No reason"}`,
    status: item.status,
    severity: item.severity,
  }))

  const cooldownSlots: CooldownSlot[] = sortedAlerts.slice(0, 4).map((item, index) => ({
    key: item.id,
    label: `${item.sector} ${item.type}`,
    remaining: item.status === "FIRED" ? item.cooldown : index === 0 ? "open" : `${10 + index * 5}m`,
    state: item.status === "FIRED" ? "cooling" : item.status === "QUEUED" && index > 1 ? "locked" : "open",
  }))

  return {
    alerts: sortedAlerts,
    eventBus,
    cooldownSlots,
    osStatus,
    hudFlash,
    topAlert: sortedAlerts[0],
  }
}


type ReplayWindow = "30D" | "90D" | "180D"

type ReplaySnapshot = {
  index: number
  date: string
  fearGreed: number | null
  volatility: number | null
  altSeason: number | null
  btcDominance: number | null
  tradeVolumeTrend: number | null
  premium: number | null
  regime: string
  temperature: number
  alertCount: number
  headline: string
}

type BacktestAlert = {
  id: string
  date: string
  type: "ALT_ROTATION" | "VOL_EXPANSION" | "BTC_DEFENSIVE" | "K_PREMIUM" | "CAPITULATION"
  title: string
  detail: string
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  next7dScore: number | null
}

function replayLimit(window: ReplayWindow) {
  if (window === "30D") return 30
  if (window === "90D") return 90
  return 180
}

function replayPoint(points: DataLabHistoryMetric["points"] | undefined, index: number) {
  const point = points?.[index]
  return typeof point?.value === "number" && Number.isFinite(point.value) ? point.value : null
}

function replayDate(points: DataLabHistoryMetric["points"] | undefined, index: number) {
  return points?.[index]?.date?.slice(0, 10) ?? `T-${index}D`
}

function inferReplayRegime(frame: Omit<ReplaySnapshot, "regime" | "headline" | "alertCount">) {
  const fear = frame.fearGreed ?? 50
  const vol = frame.volatility ?? 50
  const alt = frame.altSeason ?? 50
  const btc = frame.btcDominance ?? 50
  const volume = frame.tradeVolumeTrend ?? 0
  const premium = frame.premium ?? 0

  if (fear < 25 && vol > 65) return "CAPITULATION"
  if (btc > 62 && alt < 35) return "BTC_DEFENSIVE"
  if (alt > 65 && volume > 0) return "ALT_ROTATION"
  if (fear > 70 && vol > 60) return "EUPHORIA"
  if (vol < 35 && alt < 55) return "COMPRESSION"
  if (Math.abs(premium) > 1.5 && volume > 0) return "K_PREMIUM"
  return "MIXED"
}

function buildReplaySnapshots(snapshot: MarketRegimeSnapshot, window: ReplayWindow): ReplaySnapshot[] {
  const history = snapshot.dataLab?.history ?? {}
  const fear = history.fearGreed
  const vol = history.volatility
  const alt = history.altSeason
  const btc = history.btcDominance
  const volume = history.tradeVolumeTrend
  const premium = history.premium
  const limit = Math.min(
    replayLimit(window),
    Math.max(
      fear?.points?.length ?? 0,
      vol?.points?.length ?? 0,
      alt?.points?.length ?? 0,
      btc?.points?.length ?? 0,
      volume?.points?.length ?? 0,
      premium?.points?.length ?? 0
    )
  )

  const frames: ReplaySnapshot[] = []
  for (let index = limit - 1; index >= 0; index -= 1) {
    const base = {
      index,
      date:
        replayDate(fear?.points, index) !== `T-${index}D`
          ? replayDate(fear?.points, index)
          : replayDate(vol?.points, index),
      fearGreed: replayPoint(fear?.points, index),
      volatility: replayPoint(vol?.points, index),
      altSeason: replayPoint(alt?.points, index),
      btcDominance: replayPoint(btc?.points, index),
      tradeVolumeTrend: replayPoint(volume?.points, index),
      premium: replayPoint(premium?.points, index),
      temperature: 0,
    }
    const temperature = clamp(
      (base.fearGreed ?? 50) * 0.24 +
        (base.altSeason ?? 50) * 0.26 +
        (base.volatility ?? 50) * 0.24 +
        clamp(50 + (base.tradeVolumeTrend ?? 0)) * 0.16 +
        clamp(50 + (base.premium ?? 0) * 10) * 0.1
    )
    const regime = inferReplayRegime({ ...base, temperature })
    const headline =
      regime === "ALT_ROTATION"
        ? "Alt breadth and volume were aligned"
        : regime === "BTC_DEFENSIVE"
          ? "BTC dominance controlled the tape"
          : regime === "COMPRESSION"
            ? "Volatility stayed compressed"
            : regime === "EUPHORIA"
              ? "Sentiment and volatility overheated"
              : regime === "CAPITULATION"
                ? "Fear and volatility flashed stress"
                : regime === "K_PREMIUM"
                  ? "Korea premium pressure expanded"
                  : "Mixed historical tape"

    frames.push({ ...base, temperature, regime, alertCount: 0, headline })
  }

  return frames
}

function frameDelta(frames: ReplaySnapshot[], frameIndex: number, key: keyof ReplaySnapshot, lookback = 7) {
  const current = frames[frameIndex]?.[key]
  const previous = frames[frameIndex - lookback]?.[key]
  if (typeof current !== "number" || typeof previous !== "number") return null
  return current - previous
}

function buildBacktestAlerts(frames: ReplaySnapshot[]): BacktestAlert[] {
  const alerts: BacktestAlert[] = []

  frames.forEach((frame, i) => {
    const alt7 = frameDelta(frames, i, "altSeason", 7)
    const btc7 = frameDelta(frames, i, "btcDominance", 7)
    const vol7 = frameDelta(frames, i, "volatility", 7)
    const fear7 = frameDelta(frames, i, "fearGreed", 7)
    const premium7 = frameDelta(frames, i, "premium", 7)
    const volume7 = frameDelta(frames, i, "tradeVolumeTrend", 7)
    const next = frames[i + 7]
    const next7dScore = next ? next.temperature - frame.temperature : null

    if ((alt7 ?? 0) > 6 && (btc7 ?? 0) < 0) {
      alerts.push({
        id: `${frame.date}-alt`,
        date: frame.date,
        type: "ALT_ROTATION",
        title: "ALT_ROTATION backtest fired",
        detail: `Altseason +${metric2(alt7)} while BTC dominance ${metric2(btc7)} over 7D.`,
        severity: "HIGH",
        next7dScore,
      })
    }

    if ((vol7 ?? 0) > 8 && (fear7 ?? 0) > 0) {
      alerts.push({
        id: `${frame.date}-vol`,
        date: frame.date,
        type: "VOL_EXPANSION",
        title: "VOL_EXPANSION backtest fired",
        detail: `Volatility +${metric2(vol7)} with Fear/Greed ${metric2(fear7)} over 7D.`,
        severity: "MEDIUM",
        next7dScore,
      })
    }

    if ((btc7 ?? 0) > 2 && (alt7 ?? 0) < -3) {
      alerts.push({
        id: `${frame.date}-btc`,
        date: frame.date,
        type: "BTC_DEFENSIVE",
        title: "BTC_DEFENSIVE backtest fired",
        detail: `BTC dominance +${metric2(btc7)} while altseason ${metric2(alt7)} over 7D.`,
        severity: "MEDIUM",
        next7dScore,
      })
    }

    if ((premium7 ?? 0) > 0.8 && (volume7 ?? 0) > 0) {
      alerts.push({
        id: `${frame.date}-premium`,
        date: frame.date,
        type: "K_PREMIUM",
        title: "K_PREMIUM backtest fired",
        detail: `Premium +${metric2(premium7)} with volume ${metric2(volume7)} over 7D.`,
        severity: "LOW",
        next7dScore,
      })
    }

    if ((frame.fearGreed ?? 50) < 25 && (frame.volatility ?? 0) > 65) {
      alerts.push({
        id: `${frame.date}-capitulation`,
        date: frame.date,
        type: "CAPITULATION",
        title: "CAPITULATION backtest fired",
        detail: `Fear ${metric2(frame.fearGreed)} with volatility ${metric2(frame.volatility)}.`,
        severity: "CRITICAL",
        next7dScore,
      })
    }
  })

  const alertCountByDate = new Map<string, number>()
  alerts.forEach((alert) => alertCountByDate.set(alert.date, (alertCountByDate.get(alert.date) ?? 0) + 1))
  frames.forEach((frame) => {
    frame.alertCount = alertCountByDate.get(frame.date) ?? 0
  })

  return alerts.slice(-16).reverse()
}

function getReplayRegimeTone(regime: string) {
  if (regime === "ALT_ROTATION") return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
  if (regime === "BTC_DEFENSIVE") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  if (regime === "EUPHORIA") return "border-pink-400/30 bg-pink-500/10 text-pink-100"
  if (regime === "CAPITULATION") return "border-red-400/30 bg-red-500/10 text-red-100"
  if (regime === "COMPRESSION") return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
  if (regime === "K_PREMIUM") return "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function getBacktestSeverityTone(severity: BacktestAlert["severity"]) {
  if (severity === "CRITICAL") return "border-red-400/40 bg-red-500/15 text-red-100"
  if (severity === "HIGH") return "border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-100"
  if (severity === "MEDIUM") return "border-amber-400/30 bg-amber-500/10 text-amber-100"
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
}

function buildReplayCaseStudy(frames: ReplaySnapshot[], alerts: BacktestAlert[]) {
  if (!frames.length) return "History feed pending. Replay engine will activate after DataLab candles are parsed."
  const hottest = [...frames].sort((a, b) => b.temperature - a.temperature)[0]
  const mostAlerted = [...frames].sort((a, b) => b.alertCount - a.alertCount)[0]
  const highAlerts = alerts.filter((alert) => alert.severity === "HIGH" || alert.severity === "CRITICAL").length
  return `Replay window found ${alerts.length} alert fire(s), ${highAlerts} high-priority event(s). Hottest frame was ${hottest.date} in ${hottest.regime} with temperature ${metric2(hottest.temperature)}. Most clustered alert day: ${mostAlerted.date} (${mostAlerted.alertCount} event(s)).`
}

export default function RegimeLab() {
  const liveTickers = useMarketStore((state) => state.tickers)
  const [scenario, setScenario] = useState<ScenarioId>("live")
  const [dataLab, setDataLab] = useState<UpbitDataLabSnapshot | null>(null)
  const [dataLabLoading, setDataLabLoading] = useState(false)
  const [dataLabError, setDataLabError] = useState<string | null>(null)
  const [realRotation, setRealRotation] = useState<RealMarketRotationResponse | null>(null)
  const [realRotationLoading, setRealRotationLoading] = useState(false)
  const [realRotationError, setRealRotationError] = useState<string | null>(null)
  const [rotationDataMode, setRotationDataMode] = useState<"real" | "simulated">("real")
  const [flowPlaying, setFlowPlaying] = useState(true)
  const [flowStep, setFlowStep] = useState(0)
  const [selectedLiquiditySector, setSelectedLiquiditySector] = useState<string | null>(null)
  const [previousSectorRanks, setPreviousSectorRanks] = useState<Record<string, number>>({})
  const [replayWindow, setReplayWindow] = useState<ReplayWindow>("90D")
  const [replayPlaying, setReplayPlaying] = useState(false)
  const [replayCursor, setReplayCursor] = useState(0)

  async function refreshDataLab() {
    setDataLabLoading(true)
    setDataLabError(null)

    try {
      const response = await fetch("/api/upbit-datalab/snapshot", { cache: "no-store" })
      const json = (await response.json()) as UpbitDataLabSnapshot
      setDataLab(json)

      if (!json.ok) {
        setDataLabError("DataLab APIs and fallback returned no confirmed numeric values yet.")
      }
    } catch (error) {
      setDataLabError(error instanceof Error ? error.message : "Failed to fetch DataLab snapshot")
      setDataLab(null)
    } finally {
      setDataLabLoading(false)
    }
  }

  async function refreshRealRotation() {
    setRealRotationLoading(true)
    setRealRotationError(null)

    try {
      const response = await fetch("/api/market/sector-rotation", { cache: "no-store" })
      const json = (await response.json()) as RealMarketRotationResponse
      setRealRotation(json)

      if (!json.ok) {
        setRealRotationError(json.notes?.[0] ?? "Real market sector rotation returned no mapped sectors.")
      }
    } catch (error) {
      setRealRotationError(error instanceof Error ? error.message : "Failed to fetch real sector rotation")
      setRealRotation(null)
    } finally {
      setRealRotationLoading(false)
    }
  }

  useEffect(() => {
    refreshDataLab()
    const timer = window.setInterval(refreshDataLab, 60_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    refreshRealRotation()
    const timer = window.setInterval(refreshRealRotation, 45_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!flowPlaying) return
    const timer = window.setInterval(() => {
      setFlowStep((current) => (current + 1) % 5)
    }, 1400)
    return () => window.clearInterval(timer)
  }, [flowPlaying])

  const activeTickers = useMemo(() => {
    if (scenario === "live") return liveTickers
    return scenarioTickers[scenario]
  }, [liveTickers, scenario])

  const snapshot = useMemo(
    () => calculateMarketRegime(activeTickers, scenario === "live" ? dataLab : null),
    [activeTickers, dataLab, scenario]
  )

  const hasLiveData = Object.keys(liveTickers).length > 0
  const isScenarioMode = scenario !== "live"
  const accent = regimeAccent[snapshot.regime] || regimeAccent.MIXED
  const dataLabStatus = getDataLabStatus(dataLab, dataLabLoading)
  const leadingLiquidity = snapshot.liquidityRotations[0]
  const selectedLiquidity = snapshot.liquidityRotations.find((item) => item.sector === selectedLiquiditySector) ?? leadingLiquidity
  const actionableLiquidity = snapshot.liquidityRotations.filter((item) => item.direction !== "QUIET")
  const visualTimeline = buildVisualTimeline(snapshot, scenario, dataLabStatus)
  const flowNodes = buildFlowNodes(snapshot, dataLabStatus)
  const actionPlaybook = buildActionPlaybook(selectedLiquidity, snapshot)
  const promotionReady = actionPlaybook[actionPlaybook.length - 1]?.state === "complete"
  const alertSimulation = buildAlertSimulation(selectedLiquidity, snapshot, actionPlaybook)
  const operatorCommands = buildOperatorCommands(selectedLiquidity, snapshot, alertSimulation)
  const signalStack = buildSignalStack(snapshot, selectedLiquidity)
  const regimeStateNodes = buildRegimeStateMachine(snapshot)
  const activeRegimeNodes = regimeStateNodes.filter((node) => node.active)
  const formulaInspector = buildFormulaInspector(snapshot, selectedLiquidity)
  const signalConflicts = buildSignalConflicts(snapshot, selectedLiquidity)
  const operatorSummary = buildOperatorSummary(snapshot, selectedLiquidity, dataLabStatus, scenario)
  const historicalMetrics = getHistoryMetrics(snapshot)
  const historicalMatrix = buildHistoricalMatrix(snapshot)
  const historyTimeline = buildHistoryTimeline(snapshot)
  const rotationIntelligence = buildRotationIntelligence(snapshot, previousSectorRanks)
  const phase3Leader = rotationIntelligence[0]
  const phase3Mover = [...rotationIntelligence].sort((a, b) => b.rankDelta - a.rankDelta)[0]
  const phase3Summary = buildRotationPhase3Summary(rotationIntelligence, snapshot)
  const phase4AlertOS = buildPhase4AlertOS(snapshot, selectedLiquidity, alertSimulation, rotationIntelligence)
  const replaySnapshots = useMemo(() => buildReplaySnapshots(snapshot, replayWindow), [snapshot, replayWindow])
  const replayFrame = replaySnapshots[replayCursor] ?? replaySnapshots[replaySnapshots.length - 1]
  const backtestAlerts = useMemo(() => buildBacktestAlerts(replaySnapshots), [replaySnapshots])
  const replayCaseStudy = buildReplayCaseStudy(replaySnapshots, backtestAlerts)
  const coreMigrationStats = getCoreMigrationStats()
  const realRotationLeader = realRotation?.sectors?.[0]
  const realRotationBySector = useMemo(() => {
    return new Map((realRotation?.sectors ?? []).map((sector) => [sector.sector, sector]))
  }, [realRotation])
  const selectedRealSector = selectedLiquiditySector ? realRotationBySector.get(selectedLiquiditySector) : realRotationLeader
  const realRotationStatus = realRotationLoading
    ? "loading"
    : realRotationError
      ? "error"
      : realRotation?.ok
        ? realRotation.mode
        : "idle"
  const dataQuality = realRotation?.dataQuality
  const coverageAudit = realRotation?.coverageAudit ?? []
  const weakestCoverage = [...coverageAudit].sort((a, b) => a.coverageRatio - b.coverageRatio).slice(0, 3)
  const selectedBreakdownEntries = getBreakdownEntries(selectedRealSector?.scoreBreakdown)
  const simulatedLeader = snapshot.liquidityRotations[0]
  const activeRotationLabel = rotationDataMode === "real"
    ? selectedRealSector?.sector ?? realRotationLeader?.sector ?? "Waiting"
    : simulatedLeader?.sector ?? "Waiting"

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPreviousSectorRanks(Object.fromEntries(snapshot.liquidityRotations.map((item) => [item.sector, item.rank])))
    }, 1800)
    return () => window.clearTimeout(id)
  }, [snapshot.regime, snapshot.liquidityRotations.map((item) => `${item.sector}:${item.rank}:${item.score}`).join("|")])



  useEffect(() => {
    setReplayCursor((current) => Math.min(current, Math.max(0, replaySnapshots.length - 1)))
  }, [replaySnapshots.length])

  useEffect(() => {
    if (!replayPlaying || replaySnapshots.length <= 1) return
    const timer = window.setInterval(() => {
      setReplayCursor((current) => (current + 1) % replaySnapshots.length)
    }, 900)
    return () => window.clearInterval(timer)
  }, [replayPlaying, replaySnapshots.length])

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pr-1">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-900 bg-zinc-950/60 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
          <TestTube2 className="h-4 w-4" />
          Safe Sandbox / Main Dashboard Untouched
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(scenarioLabels) as ScenarioId[]).map((id) => (
            <button
              key={id}
              onClick={() => setScenario(id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                scenario === id
                  ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-200"
                  : "border-zinc-800 bg-black/30 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
              }`}
            >
              {scenarioLabels[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-cyan-400/20 bg-black/50 p-4 shadow-xl shadow-cyan-950/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              <Layers3 className="h-4 w-4" /> Terminal Core
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Regime Lab remains the visual sandbox, while reusable intelligence contracts are being extracted into /core.
            </p>
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-3 py-2">
              <div className="text-lg font-black text-white">{coreMigrationStats.total}</div>
              <div className="uppercase tracking-widest text-zinc-600">Modules</div>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2">
              <div className="text-lg font-black text-emerald-200">{coreMigrationStats.extracted}</div>
              <div className="uppercase tracking-widest text-emerald-500/80">Extracted</div>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2">
              <div className="text-lg font-black text-amber-200">{coreMigrationStats.scaffold}</div>
              <div className="uppercase tracking-widest text-amber-500/80">Scaffold</div>
            </div>
            <div className="rounded-2xl border border-zinc-700 bg-zinc-950 px-3 py-2">
              <div className="text-lg font-black text-zinc-300">{coreMigrationStats.pending}</div>
              <div className="uppercase tracking-widest text-zinc-600">Pending</div>
            </div>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {terminalCoreManifest.map((module) => (
            <div
              key={module.key}
              className={`rounded-2xl border p-3 ${
                module.status === "extracted"
                  ? "border-emerald-400/20 bg-emerald-500/10"
                  : module.status === "scaffold"
                    ? "border-amber-400/20 bg-amber-500/10"
                    : "border-zinc-800 bg-zinc-950"
              }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase tracking-widest text-zinc-200">{module.label}</div>
                <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                  {module.status}
                </span>
              </div>
              <div className="mb-2 font-mono text-[10px] text-cyan-300/80">{module.path}</div>
              <p className="text-[11px] leading-5 text-zinc-500">{module.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-emerald-400/20 bg-black/50 p-4 shadow-xl shadow-emerald-950/10">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-300">
              <RadioTower className="h-4 w-4" /> Real Market Integration
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              Binance global ticker aggregation + Upbit KRW overlay. This panel is live-data first and keeps the main dashboard untouched.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={refreshRealRotation}
              className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 font-semibold uppercase tracking-widest text-emerald-200 hover:bg-emerald-400/20"
            >
              Refresh Real Rotation
            </button>
            <span className={`rounded-full border px-3 py-1.5 font-semibold uppercase tracking-widest ${
              realRotationStatus === "real-market" || realRotationStatus === "partial"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : realRotationStatus === "loading"
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                  : realRotationStatus === "error"
                    ? "border-red-400/30 bg-red-500/10 text-red-200"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400"
            }`}>
              {String(realRotationStatus).toUpperCase()}
            </span>
          </div>
        </div>

        {realRotationError && (
          <div className="mb-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-xs text-red-200">
            {realRotationError}
          </div>
        )}

        <div className="mb-3 grid gap-2 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Mapped Assets</div>
            <div className="mt-1 text-2xl font-black text-white">{realRotation?.coverage.mappedAssets ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Sectors</div>
            <div className="mt-1 text-2xl font-black text-white">{realRotation?.coverage.sectors ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Binance Feed</div>
            <div className="mt-1 text-2xl font-black text-white">{realRotation?.coverage.binanceSymbols ?? "—"}</div>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Upbit Overlay</div>
            <div className="mt-1 text-2xl font-black text-white">{realRotation?.coverage.upbitSymbols ?? "—"}</div>
          </div>
        </div>

        <div className="mb-3 grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-cyan-200">Data Quality Panel</div>
                <div className="mt-1 text-[11px] text-cyan-100/60">Connector health, stale/partial data, and response quality for live sector rotation.</div>
              </div>
              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-widest ${getQualityTone(dataQuality?.status)}`}>
                {dataQuality?.status ?? "idle"}
              </span>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              {(dataQuality?.connectors ?? [
                { name: "binance", status: "idle" },
                { name: "upbit-markets", status: "idle" },
                { name: "upbit-ticker", status: "idle" },
                { name: "datalab", status: "idle" },
              ]).map((connector) => (
                <div key={connector.name} className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{connector.name}</div>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getQualityTone(connector.status)}`}>{connector.status}</span>
                  </div>
                  <div className="font-mono text-xs text-zinc-300">
                    {typeof connector.records === "number" ? `${connector.records} records` : "records —"}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-zinc-600">
                    {typeof connector.latencyMs === "number" ? `${connector.latencyMs}ms` : "latency —"}
                    {connector.message ? ` · ${connector.message}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <div className="text-xs font-black uppercase tracking-widest text-amber-200">Real vs Simulated Toggle</div>
                <div className="mt-1 text-[11px] text-amber-100/60">Compare live sector data against the sandbox liquidity model.</div>
              </div>
              <div className="flex rounded-full border border-white/10 bg-black/40 p-1 text-[10px] font-bold uppercase tracking-widest">
                {["real", "simulated"].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setRotationDataMode(mode as "real" | "simulated")}
                    className={`rounded-full px-3 py-1 ${rotationDataMode === mode ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-200"}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-600">Active Focus</div>
                <div className="mt-1 font-mono text-zinc-100">{activeRotationLabel}</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                <div className="text-zinc-600">Fallback Read</div>
                <div className="mt-1 font-mono text-zinc-100">{simulatedLeader ? `${simulatedLeader.sector} / ${simulatedLeader.direction}` : "—"}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3 grid gap-3 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-300">Sector Coverage Audit</div>
            <div className="space-y-2">
              {coverageAudit.slice(0, 8).map((item) => (
                <div key={item.sector} className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-zinc-200">{item.sector}</div>
                    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${getQualityTone(item.quality)}`}>{item.quality}</span>
                  </div>
                  <div className="mb-1 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full rounded-full bg-cyan-300" style={{ width: getFlowWidth(item.coverageRatio) }} />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[10px] uppercase tracking-widest text-zinc-600">
                    <div>{formatScore(item.coverageRatio)}%</div>
                    <div>{item.activeAssets}/{item.registrySymbols}</div>
                    <div>BN {item.binanceAssets}</div>
                    <div>UP {item.upbitAssets}</div>
                  </div>
                </div>
              ))}
              {!coverageAudit.length && <div className="text-xs text-zinc-600">Waiting for coverage audit.</div>}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-300">Score Explainability</div>
            {selectedRealSector ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-300/80">Selected Sector</div>
                  <div className="mt-1 text-xl font-black text-white">{selectedRealSector.sector}</div>
                  <div className="text-xs text-emerald-100/70">Rotation Score {formatScore(selectedRealSector.rotationScore)}</div>
                </div>
                {selectedBreakdownEntries.map((entry) => (
                  <div key={entry.key} className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                    <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-widest">
                      <span className="text-zinc-500">{entry.label}</span>
                      <span className="font-mono text-zinc-200">{formatScore(entry.value)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-emerald-300" style={{ width: getFlowWidth(entry.value) }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-zinc-600">Select a live sector to inspect score factors.</div>
            )}
          </div>
        </div>

        {weakestCoverage.length ? (
          <div className="mb-3 rounded-2xl border border-orange-400/20 bg-orange-500/10 p-3 text-xs text-orange-100">
            Weak coverage watch: {weakestCoverage.map((item) => `${item.sector} ${formatScore(item.coverageRatio)}%`).join(" · ")}
          </div>
        ) : null}

        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-widest text-zinc-300">Live Sector Rotation Ranking</div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-600">
                {realRotation?.updatedAt ? new Date(realRotation.updatedAt).toLocaleTimeString() : "waiting"}
              </div>
            </div>
            <div className="space-y-2">
              {(realRotation?.sectors ?? []).slice(0, 8).map((sector) => (
                <button
                  key={sector.sector}
                  onClick={() => setSelectedLiquiditySector(sector.sector)}
                  className={`w-full rounded-2xl border p-3 text-left transition hover:border-emerald-400/40 ${
                    selectedLiquiditySector === sector.sector
                      ? "border-emerald-400/40 bg-emerald-500/10"
                      : "border-zinc-800 bg-black/30"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-black text-zinc-300">#{sector.rank}</span>
                      <span className="text-sm font-black text-white">{sector.sector}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getLiquidityTone(sector.direction)}`}>{sector.direction}</span>
                    </div>
                    <div className="font-mono text-xs text-emerald-200">{formatScore(sector.rotationScore)}</div>
                  </div>
                  <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                    <div className="h-full rounded-full bg-emerald-300" style={{ width: getFlowWidth(sector.rotationScore) }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-[10px] uppercase tracking-widest text-zinc-500">
                    <div>Vol {formatScore(sector.volumePressure)}</div>
                    <div>Volty {formatScore(sector.volatility)}</div>
                    <div>Price {formatScore(sector.avgPriceChange)}%</div>
                    <div>Breadth {formatScore(sector.breadth)}</div>
                  </div>
                </button>
              ))}
              {!realRotation?.sectors?.length && (
                <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                  Waiting for live Binance/Upbit sector data. The sandbox scenario panels below still work independently.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-300">Real Rotation Drilldown</div>
            {selectedRealSector ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">Command Focus</div>
                  <div className="mt-1 text-2xl font-black text-white">{selectedRealSector.sector}</div>
                  <div className="mt-1 text-xs text-emerald-100">{selectedRealSector.story}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                    <div className="text-zinc-600">Confidence</div>
                    <div className="font-mono text-zinc-100">{formatScore(selectedRealSector.confidence)}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                    <div className="text-zinc-600">Regime Fit</div>
                    <div className="font-mono text-zinc-100">{formatScore(selectedRealSector.regimeFit)}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                    <div className="text-zinc-600">Top Symbols</div>
                    <div className="font-mono text-zinc-100">{selectedRealSector.topSymbols.join(", ") || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-black/30 p-2">
                    <div className="text-zinc-600">Assets</div>
                    <div className="font-mono text-zinc-100">{selectedRealSector.positiveCount}/{selectedRealSector.assetCount} positive</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {selectedRealSector.evidence.map((item) => (
                    <div key={item} className="rounded-xl border border-zinc-800 bg-black/30 px-3 py-2 text-xs text-zinc-300">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4 text-sm text-zinc-500">
                Select a live sector candidate to inspect evidence.
              </div>
            )}
          </div>
        </div>

        {realRotation?.notes?.length ? (
          <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-xs text-amber-100">
            {realRotation.notes.join(" · ")}
          </div>
        ) : null}
      </div>

      <div className={`relative overflow-hidden rounded-3xl border bg-gradient-to-br ${accent} p-5 shadow-2xl shadow-black/40`}>
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">
              <Sparkles className="h-4 w-4" />
              Regime Lab / Experimental Workspace
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <h2 className="text-4xl font-black tracking-tight text-white md:text-5xl">
                {snapshot.title}
              </h2>
              <span className="mb-2 rounded-full border border-white/10 bg-black/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-zinc-300">
                {snapshot.regime}
              </span>
              {isScenarioMode && (
                <span className="mb-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-200">
                  Scenario Mode
                </span>
              )}
            </div>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-300">
              {snapshot.summary}
            </p>
          </div>

          <div className="grid min-w-[280px] grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                <Gauge className="h-4 w-4" /> Confidence
              </div>
              <div className="text-4xl font-black text-white">{snapshot.confidence}%</div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-500">
                <Activity className="h-4 w-4" /> Temperature
              </div>
              <div className="text-4xl font-black text-white">{snapshot.temperature}</div>
            </div>
          </div>
        </div>
      </div>

      {!hasLiveData && scenario === "live" && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
          Live ticker data has not populated yet. Use the scenario buttons above to preview how the visual layer reacts before promoting anything to the main dashboard.
        </div>
      )}

      <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
              <Database className="h-4 w-4" />
              Upbit DataLab Live Connector
            </div>
            <div className="mt-1 text-xs text-zinc-600">
Live mode now uses Upbit DataLab indicator overview as the primary snapshot source. Fear/Greed history and market index are only fallback/helper endpoints.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest ${
              dataLabStatus === "connected"
                ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                : dataLabStatus === "proxy"
                  ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                  : dataLabStatus === "partial"
                    ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                    : dataLabStatus === "loading"
                    ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-200"
                    : "border-red-400/30 bg-red-500/10 text-red-200"
            }`}>
              {dataLabStatus}
            </span>
            <button
              onClick={refreshDataLab}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition hover:border-cyan-400/50 hover:text-cyan-200"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">Fear / Greed</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.fearGreed)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">Altseason</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.altSeason)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">BTC Dominance</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.btcDominance, "%")}</div>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">Premium</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.premium, "%")}</div>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">Volume Trend</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.tradeVolumeTrend)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-3">
            <div className="text-[10px] uppercase tracking-widest text-zinc-600">Volatility</div>
            <div className="mt-1 text-xl font-black text-white">{formatDataLabValue(dataLab?.volatility)}</div>
          </div>
        </div>

        {(dataLabError || dataLab?.notes?.length) && (
          <div className="mt-3 rounded-2xl border border-amber-400/10 bg-amber-400/5 p-3 text-xs leading-5 text-amber-100/80">
            {dataLabError || dataLab?.notes?.slice(0, 2).join(" · ")}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">
          <Target className="h-4 w-4" />
          Next Best Action
        </div>
        <div className="text-sm leading-6 text-cyan-50/90">{snapshot.nextBestAction}</div>
      </div>



      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-black/75 p-4 shadow-2xl shadow-cyan-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.18),transparent_28%),radial-gradient(circle_at_75%_40%,rgba(168,85,247,0.16),transparent_30%),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(34,211,238,0.04)_1px,transparent_1px)] bg-[length:auto,auto,42px_42px,42px_42px]" />
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <Layers3 className="h-4 w-4" />
              Animated Flow Board
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Visual-only sandbox: converts regime, liquidity, volatility, and Korea premium into a readable market sequence.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setFlowPlaying((value) => !value)}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-cyan-100 transition hover:bg-cyan-400/20"
            >
              {flowPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {flowPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => setFlowStep((current) => (current + 1) % flowNodes.length)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-zinc-300 transition hover:border-fuchsia-400/40 hover:text-fuchsia-100"
            >
              <Zap className="h-3.5 w-3.5" />
              Step
            </button>
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="pointer-events-none absolute left-8 right-8 top-1/2 hidden h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-cyan-300/40 to-transparent xl:block" />
            <div className="grid gap-3 md:grid-cols-5">
              {flowNodes.map((node, index) => {
                const isActive = getNodeIsActive(node, snapshot, flowStep)
                const isCurrent = flowStep === index
                return (
                  <div key={node.id} className="relative">
                    <div
                      className={`relative z-10 min-h-[142px] rounded-2xl border p-4 transition duration-500 ${node.tone} ${
                        isActive ? "opacity-100 shadow-2xl" : "opacity-45 grayscale"
                      } ${isCurrent ? "scale-[1.03] shadow-cyan-400/20 ring-1 ring-cyan-300/50" : ""}`}
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        {isCurrent && (
                          <span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.95)]" />
                        )}
                      </div>
                      <div className="text-lg font-black tracking-tight text-white">{node.label}</div>
                      <div className="mt-2 text-xs leading-5 opacity-75">{node.detail}</div>
                      <div className="mt-4 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs font-black uppercase tracking-widest">
                        {node.metric}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                <RadioTower className="h-3.5 w-3.5" />
                Current Market Sequence
              </div>
              <div className="text-2xl font-black text-white">{flowNodes[flowStep]?.label ?? "SCAN"}</div>
              <div className="mt-2 text-xs leading-5 text-zinc-400">
                {flowNodes[flowStep]?.detail ?? snapshot.summary}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Leader</div>
                <div className="mt-1 text-xl font-black text-white">{leadingLiquidity?.sector ?? "—"}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">{leadingLiquidity?.direction ?? "SCAN"}</div>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Flow Step</div>
                <div className="mt-1 text-xl font-black text-white">{flowStep + 1}/{flowNodes.length}</div>
                <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">{flowPlaying ? "AUTO" : "MANUAL"}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-black/75 p-4 shadow-2xl shadow-emerald-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_85%_35%,rgba(34,211,238,0.12),transparent_32%)]" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              <GitBranch className="h-4 w-4" />
              Rotation Command Map
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Visual ranking board for which sectors deserve attention first. This is still sandbox-only and does not touch the main dashboard.
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            {actionableLiquidity.length} active flows
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Command Focus</div>
            <div className="text-3xl font-black text-white">{leadingLiquidity?.sector ?? "SCAN"}</div>
            <div className="mt-2 text-xs font-bold uppercase tracking-widest text-zinc-500">
              {leadingLiquidity ? getFlowLabel(leadingLiquidity.direction) : "Waiting for flow"}
            </div>
            <div className={`mt-4 rounded-2xl border p-4 ${getLiquidityTone(leadingLiquidity?.direction ?? "QUIET")}`}>
              <div className="text-[10px] uppercase tracking-widest opacity-70">Command Score</div>
              <div className="mt-1 text-4xl font-black text-white">{leadingLiquidity ? formatScore(leadingLiquidity.score) : "—"}</div>
              <div className="mt-2 text-xs leading-5 opacity-80">{leadingLiquidity?.interpretation ?? "No confirmed sector flow yet."}</div>
            </div>
          </div>

          <div className="space-y-3">
            {snapshot.liquidityRotations.slice(0, 5).map((item) => (
              <button
                key={`command-${item.sector}`}
                onClick={() => setSelectedLiquiditySector(item.sector)}
                className={`w-full rounded-2xl border bg-zinc-950/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-cyan-300/40 ${selectedLiquidity?.sector === item.sector ? "border-cyan-300/50 shadow-lg shadow-cyan-950/30" : "border-zinc-800"}`}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-black text-zinc-400">#{item.rank}</span>
                    <div>
                      <div className="text-sm font-black text-white">{item.sector}</div>
                      <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">{item.direction}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-zinc-100">{formatScore(item.score)}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-600">score</div>
                  </div>
                </div>

                <div className="relative h-3 overflow-hidden rounded-full bg-zinc-900">
                  <div className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${getFlowArrowTone(item.direction)} transition-all duration-700`} style={{ width: getFlowWidth(item.score) }} />
                  <div className="absolute inset-y-0 left-0 w-12 animate-pulse rounded-full bg-white/15 blur-md" style={{ marginLeft: getFlowWidth(Math.max(0, item.score - 18)) }} />
                </div>

                <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] text-zinc-500">
                  <div>Vol {formatScore(item.volumePressure)}</div>
                  <div>Vola {formatScore(item.volatility)}</div>
                  <div>Px {formatScore(item.priceChange)}%</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-blue-400/20 bg-black/75 p-4 shadow-2xl shadow-blue-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(59,130,246,0.18),transparent_30%),radial-gradient(circle_at_85%_70%,rgba(16,185,129,0.12),transparent_30%)]" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-blue-200">
              <BadgeInfo className="h-4 w-4" />
              Sector Drilldown / Evidence Stack
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Click any sector in the Rotation Command Map to inspect why it is ranked there. Sandbox-only visual layer.
            </div>
          </div>
          <div className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-200">
            {selectedLiquidity?.sector ?? "NO SECTOR"}
          </div>
        </div>

        {selectedLiquidity ? (
          <div className="relative grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className={`rounded-2xl border p-4 ${getLiquidityTone(selectedLiquidity.direction)}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">Selected Sector</div>
                  <div className="mt-2 text-4xl font-black tracking-tight text-white">{selectedLiquidity.sector}</div>
                  <div className="mt-1 text-xs font-black uppercase tracking-widest opacity-80">#{selectedLiquidity.rank} · {selectedLiquidity.direction}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Confidence</div>
                  <div className="text-3xl font-black text-white">{formatScore(selectedLiquidity.confidence)}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Liquidity</div>
                  <div className="mt-1 text-2xl font-black text-white">{formatScore(selectedLiquidity.score)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-3">
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Triggers</div>
                  <div className="mt-1 text-2xl font-black text-white">{selectedLiquidity.triggerCount}</div>
                </div>
              </div>

              <div className="mt-4 text-xs leading-5 opacity-85">{selectedLiquidity.interpretation}</div>
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 text-xs font-semibold uppercase tracking-widest text-white/80">
                Action: {selectedLiquidity.action}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                {[
                  ["Volume Pressure", selectedLiquidity.volumePressure],
                  ["Volatility", selectedLiquidity.volatility],
                  ["Price Change", selectedLiquidity.priceChange],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">{label}</div>
                    <div className="mt-2 text-2xl font-black text-white">
                      {formatScore(Number(value))}{label === "Price Change" ? "%" : ""}
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div className={`h-full rounded-full bg-gradient-to-r ${getFlowArrowTone(selectedLiquidity.direction)}`} style={{ width: getFlowWidth(Math.abs(Number(value))) }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Evidence Stack
                </div>
                <div className="grid gap-2">
                  {selectedLiquidity.evidence.map((line, index) => (
                    <div key={`${selectedLiquidity.sector}-evidence-${index}`} className="flex items-start gap-3 rounded-xl border border-zinc-900 bg-black/35 p-3 text-xs leading-5 text-zinc-300">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10 text-[10px] font-black text-cyan-200">{index + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-500">
            Waiting for a liquidity candidate. Try a scenario mode to preview the drilldown.
          </div>
        )}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-black/75 p-4 shadow-2xl shadow-amber-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(251,191,36,0.16),transparent_28%),radial-gradient(circle_at_85%_65%,rgba(34,211,238,0.12),transparent_30%)]" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
              <Target className="h-4 w-4" />
              Action Playbook / Promotion Gate
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Converts the selected sector drilldown into a clear watch / validate / promote workflow before it reaches the real alert engine.
            </div>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${promotionReady ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"}`}>
            {promotionReady ? "Ready to Promote" : "Lab Watch"}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Selected Signal</div>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <div className="text-3xl font-black text-white">{selectedLiquidity?.sector ?? "SCAN"}</div>
                <div className="mt-1 text-xs font-black uppercase tracking-widest text-zinc-500">
                  {selectedLiquidity ? `${selectedLiquidity.direction} · rank #${selectedLiquidity.rank}` : "No sector selected"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-white">{selectedLiquidity ? formatScore(selectedLiquidity.confidence) : "—"}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Confidence</div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-zinc-900 bg-black/40 p-3 text-xs leading-5 text-zinc-400">
              {selectedLiquidity?.action ?? "Pick a sector from Rotation Command Map to generate an action playbook."}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-zinc-900 bg-black/40 p-3">
                <div className="text-lg font-black text-white">{selectedLiquidity ? formatScore(selectedLiquidity.volumePressure) : "—"}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Volume</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black/40 p-3">
                <div className="text-lg font-black text-white">{selectedLiquidity ? formatScore(selectedLiquidity.volatility) : "—"}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Volatility</div>
              </div>
              <div className="rounded-xl border border-zinc-900 bg-black/40 p-3">
                <div className="text-lg font-black text-white">{selectedLiquidity ? formatScore(selectedLiquidity.priceChange) : "—"}</div>
                <div className="text-[10px] uppercase tracking-widest text-zinc-600">Price</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Execution Checklist</div>
              <BellRing className={`h-4 w-4 ${promotionReady ? "text-emerald-300" : "text-zinc-600"}`} />
            </div>

            <div className="space-y-3">
              {actionPlaybook.map((step, index) => (
                <div key={`${step.label}-${index}`} className={`relative rounded-2xl border p-3 ${getPlaybookTone(step.state)}`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getPlaybookDot(step.state)}`} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-widest text-white">{step.label}</div>
                      <div className="mt-1 text-xs leading-5 opacity-80">{step.detail}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-black/75 p-4 shadow-2xl shadow-emerald-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(16,185,129,0.18),transparent_30%),radial-gradient(circle_at_85%_45%,rgba(34,211,238,0.12),transparent_28%)]" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              <BellRing className="h-4 w-4" />
              Alert Simulation Console
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Visual preview of how the selected sector signal would be routed before touching the production alert engine.
            </div>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getAlertSimulationTone(alertSimulation.status)}`}>
            {alertSimulation.status}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className={`rounded-2xl border p-4 ${getAlertSimulationTone(alertSimulation.status)}`}>
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">Outbound Preview</div>
                <div className="mt-2 text-2xl font-black text-white">{alertSimulation.headline}</div>
              </div>
              <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getPriorityTone(alertSimulation.priority)}`}>
                {alertSimulation.priority}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-white/85">
              {alertSimulation.body}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-lg font-black text-white">{alertSimulation.route.split("→")[0].trim()}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60">Route</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-lg font-black text-white">{alertSimulation.cooldown}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60">Cooldown</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-3">
                <div className="text-lg font-black text-white">{selectedLiquidity ? selectedLiquidity.triggerCount : "—"}</div>
                <div className="text-[10px] uppercase tracking-widest opacity-60">Triggers</div>
              </div>
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Promotion Rail</div>
              <div className="grid gap-2 sm:grid-cols-3">
                {["LAB", "WATCH", "ALERT"].map((stage, index) => {
                  const active = alertSimulation.status === "READY" ? true : alertSimulation.status === "WATCH" ? index < 2 : index === 0
                  return (
                    <div key={stage} className={`rounded-2xl border p-3 text-center ${active ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" : "border-zinc-800 bg-black/30 text-zinc-600"}`}>
                      <div className="text-lg font-black">{stage}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-widest opacity-70">Stage {index + 1}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Confirmations / Blockers</div>
              <div className="grid gap-2">
                {alertSimulation.confirmations.map((line) => (
                  <div key={line} className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                    ✓ {line}
                  </div>
                ))}
                {alertSimulation.blockers.length ? alertSimulation.blockers.map((line) => (
                  <div key={line} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                    ! {line}
                  </div>
                )) : (
                  <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                    ✓ No promotion blockers detected
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="relative mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Alert Payload Preview</div>
          <pre className="max-h-56 overflow-auto rounded-xl border border-zinc-900 bg-black/60 p-4 text-xs leading-5 text-cyan-100">
{alertSimulation.payload}
          </pre>
        </div>
      </div>

      <div className={`relative overflow-hidden rounded-3xl border p-4 shadow-2xl ${phase4AlertOS.hudFlash ? "border-red-300/30 bg-red-950/25 shadow-red-950/30" : "border-cyan-400/20 bg-black/75 shadow-cyan-950/20"}`}>
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_20%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_88%_25%,rgba(244,63,94,0.12),transparent_28%),radial-gradient(circle_at_50%_100%,rgba(16,185,129,0.10),transparent_35%)]" />
        {phase4AlertOS.hudFlash && <div className="pointer-events-none absolute inset-x-0 top-0 h-px animate-pulse bg-red-300/70" />}

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <RadioTower className={`h-4 w-4 ${phase4AlertOS.hudFlash ? "animate-pulse text-red-200" : "text-cyan-200"}`} />
              Alert Operating System
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Real alert promotion layer: severity, cooldown, dedupe, event bus, priority queue, and operator sync. Sandbox only.
            </div>
          </div>
          <div className={`rounded-full border px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] ${phase4AlertOS.osStatus === "ARMED" ? "border-red-300/40 bg-red-500/15 text-red-100" : phase4AlertOS.osStatus === "QUEUEING" ? "border-cyan-300/35 bg-cyan-500/12 text-cyan-100" : "border-zinc-700 bg-zinc-950 text-zinc-400"}`}>
            {phase4AlertOS.osStatus}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="grid gap-4">
            <div className={`rounded-3xl border p-5 ${getPhase4SeverityTone(phase4AlertOS.topAlert.severity)}`}>
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">Top Priority Alert</div>
                  <div className="mt-2 text-3xl font-black text-white">{phase4AlertOS.topAlert.title}</div>
                </div>
                <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getPhase4StatusTone(phase4AlertOS.topAlert.status)}`}>
                  {phase4AlertOS.topAlert.status}
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-2xl font-black text-white">{phase4AlertOS.topAlert.severity}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Severity</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-2xl font-black text-white">{formatScore(phase4AlertOS.topAlert.confidence)}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Confidence</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-2xl font-black text-white">{phase4AlertOS.topAlert.cooldown}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Cooldown</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/30 p-3">
                  <div className="text-2xl font-black text-white">{phase4AlertOS.alerts.length}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-60">Queue</div>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {phase4AlertOS.topAlert.reasons.map((reason) => (
                  <div key={reason} className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-xs leading-5 text-white/80">
                    ✓ {reason}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                <Shield className="h-4 w-4" /> Cooldown / Deduplication Slots
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {phase4AlertOS.cooldownSlots.map((slot) => (
                  <div key={slot.key} className={`rounded-2xl border p-3 ${getCooldownTone(slot.state)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-black uppercase tracking-widest text-white">{slot.label}</div>
                      <div className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">{slot.state}</div>
                    </div>
                    <div className="mt-2 text-lg font-black text-white">{slot.remaining}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-widest opacity-60">duplicate suppression window</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                <GitBranch className="h-4 w-4" /> Event Bus Stream
              </div>
              <div className="space-y-3">
                {phase4AlertOS.eventBus.map((event, index) => (
                  <div key={event.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[36px_1fr_auto] md:items-center ${getPhase4SeverityTone(event.severity)}`}>
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-xs font-black">{index + 1}</div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-black text-white">{event.title}</div>
                        <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">{event.bus}</span>
                      </div>
                      <div className="mt-1 text-xs leading-5 opacity-75">{event.detail}</div>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest ${getPhase4StatusTone(event.status)}`}>
                      {event.status}<br />
                      <span className="opacity-60">{event.severity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                <Target className="h-4 w-4" /> Priority Queue Payloads
              </div>
              <div className="grid gap-2">
                {phase4AlertOS.alerts.slice(0, 4).map((alertItem) => (
                  <div key={alertItem.id} className={`rounded-2xl border p-3 ${getPhase4StatusTone(alertItem.status)}`}>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-black uppercase tracking-widest text-white">{alertItem.type} · {alertItem.sector}</div>
                      <div className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${getPhase4SeverityTone(alertItem.severity)}`}>{alertItem.severity}</div>
                    </div>
                    <code className="block rounded-xl border border-white/10 bg-black/35 p-2 text-[11px] leading-5 text-cyan-100">{alertItem.payload}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-black/75 p-4 shadow-2xl shadow-emerald-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,rgba(16,185,129,0.16),transparent_30%),radial-gradient(circle_at_90%_20%,rgba(34,211,238,0.14),transparent_28%)]" />
        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              <BrainCircuit className="h-4 w-4" />
              Operator Intelligence Console
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              A visual command layer that turns the selected sector, alert rail, and DataLab context into operator-ready instructions.
            </div>
          </div>
          <div className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${getAlertSimulationTone(alertSimulation.status)}`}>
            {alertSimulation.status} MODE
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
              <Radar className="h-4 w-4" /> Signal Stack Monitor
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {signalStack.map((signal) => (
                <div key={signal.label} className={`rounded-2xl border p-3 ${getStackTone(signal.tone)}`}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{signal.label}</div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-black">
                      {formatScore(signal.score)}
                    </div>
                  </div>
                  <div className="text-sm font-black text-white">{signal.value}</div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/40">
                    <div className="h-full rounded-full bg-current transition-all" style={{ width: getFlowWidth(signal.score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
              <Shield className="h-4 w-4" /> Command Queue
            </div>
            <div className="grid gap-3">
              {operatorCommands.map((command, index) => (
                <div key={command.id} className={`grid gap-3 rounded-2xl border p-4 md:grid-cols-[44px_1fr_auto] md:items-center ${getCommandTone(command.state)}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/30 text-sm font-black">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-black text-white">{command.label}</div>
                      <span className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                        {command.target}
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-5 opacity-75">{command.reason}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest">
                    {command.state}<br />
                    <span className="opacity-60">{command.eta}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-black/70 p-4 shadow-2xl shadow-fuchsia-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.16),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,211,238,0.12),transparent_30%)]" />
        <div className="pointer-events-none absolute left-8 top-16 h-[calc(100%-6rem)] w-px bg-gradient-to-b from-fuchsia-400/60 via-cyan-400/30 to-transparent" />

        <div className="relative mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-200">
              <RadioTower className="h-4 w-4 animate-pulse" />
              Terminal Intelligence Timeline
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Visual event stream for regime shifts, liquidity candidates, volatility context, and alert promotion readiness.
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.9)]" />
            Visual Preview
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            {visualTimeline.map((event, index) => (
              <div key={event.id} className="group relative grid grid-cols-[64px_1fr] gap-3">
                <div className="flex flex-col items-center pt-1">
                  <div className={`z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-black text-[10px] font-black shadow-lg ${getTimelineTone(event.severity)}`}>
                    {index + 1}
                  </div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-600">{event.time}</div>
                </div>

                <div className={`rounded-2xl border p-4 shadow-xl transition duration-300 group-hover:-translate-y-0.5 group-hover:border-cyan-300/40 ${getTimelineTone(event.severity)}`}>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest opacity-80">
                        {event.type}
                      </span>
                      <span className="text-sm font-black text-white">{event.title}</span>
                    </div>
                    <div className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                      {event.metric}
                    </div>
                  </div>
                  <div className="text-xs leading-5 opacity-80">{event.description}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Sequence Map</div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-widest">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">SCAN</span>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
                <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-amber-200">CHURN</span>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
                <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-emerald-200">INFLOW</span>
                <ArrowRight className="h-4 w-4 text-zinc-600" />
                <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-3 py-1 text-fuchsia-200">EXPANSION</span>
              </div>
              <div className="mt-4 rounded-xl border border-zinc-900 bg-black/40 p-3 text-xs leading-5 text-zinc-400">
                Current path: <span className="font-bold text-white">{leadingLiquidity?.direction ?? "SCAN"}</span> inside <span className="font-bold text-white">{snapshot.regime}</span>. This is intentionally visual-first and remains sandboxed.
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Live Pulse</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-3 text-center">
                  <div className="text-2xl font-black text-white">{actionableLiquidity.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Actionable</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-3 text-center">
                  <div className="text-2xl font-black text-white">{snapshot.alertCandidates.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Alerts</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-3 text-center">
                  <div className="text-2xl font-black text-white">{snapshot.temperature}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Temp</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
              <Activity className="h-4 w-4" />
              Liquidity Rotation Matrix
            </div>
            <div className="mt-1 text-xs text-zinc-600">
              Experimental sector flow proxy: volume pressure + volatility + price momentum. This stays in Regime Lab until sector history is stored.
            </div>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
            Sandbox
          </div>
        </div>

        {leadingLiquidity && (
          <div className="mb-4 grid gap-3 lg:grid-cols-[0.85fr_1.15fr]">
            <div className={`rounded-2xl border p-4 ${getLiquidityTone(leadingLiquidity.direction)}`}>
              <div className="text-[10px] font-bold uppercase tracking-[0.25em] opacity-70">Top Liquidity Candidate</div>
              <div className="mt-2 flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-black text-white">#{leadingLiquidity.rank} {leadingLiquidity.sector}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-widest">{leadingLiquidity.direction}</div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-white">{formatScore(leadingLiquidity.confidence)}</div>
                  <div className="text-[10px] uppercase tracking-widest opacity-70">Confidence</div>
                </div>
              </div>
              <div className="mt-3 text-xs leading-5 opacity-80">{leadingLiquidity.action}</div>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Trigger Stack</div>
              <div className="grid gap-2 md:grid-cols-2">
                {leadingLiquidity.evidence.map((line) => (
                  <div key={line} className="rounded-xl border border-zinc-900 bg-black/40 px-3 py-2 text-xs text-zinc-300">
                    {line}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs text-zinc-600">
                Actionable sectors: {actionableLiquidity.length} / {snapshot.liquidityRotations.length}
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-3">
          {snapshot.liquidityRotations.map((item) => (
            <div key={item.sector} className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg border border-zinc-800 bg-black/50 px-2 py-0.5 text-[10px] font-black text-zinc-500">#{item.rank}</span>
                    <div className="text-sm font-black text-white">{item.sector}</div>
                  </div>
                  <div className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${getLiquidityTone(item.direction)}`}>
                    {item.direction}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-white">{formatScore(item.score)}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Liquidity</div>
                </div>
              </div>

              <div className="mb-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div className={`h-full rounded-full ${getBarTone(item.score)}`} style={{ width: `${item.score}%` }} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-[11px]">
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                  <div className="text-zinc-600">Volume</div>
                  <div className="font-bold text-zinc-200">{formatScore(item.volumePressure)}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                  <div className="text-zinc-600">Volatility</div>
                  <div className="font-bold text-zinc-200">{formatScore(item.volatility)}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                  <div className="text-zinc-600">Price</div>
                  <div className="font-bold text-zinc-200">{formatScore(item.priceChange)}%</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/40 p-2">
                  <div className="text-zinc-600">Triggers</div>
                  <div className="font-bold text-zinc-200">{item.triggerCount}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-zinc-900 bg-black/30 p-2 text-xs font-semibold text-zinc-300">
                {item.action}
              </div>
              <div className="mt-3 text-xs leading-5 text-zinc-500">{item.interpretation}</div>
            </div>
          ))}
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-violet-400/20 bg-black/75 p-4 shadow-2xl shadow-violet-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(139,92,246,0.18),transparent_30%),radial-gradient(circle_at_80%_45%,rgba(34,211,238,0.10),transparent_30%)]" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-violet-200">
              <Layers3 className="h-4 w-4" />
              Regime Transition Map
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Visual state machine for how the market can move from defensive mode into rotation, expansion, or risk-off. Sandbox-only.
            </div>
          </div>
          <div className="rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-violet-200">
            {getRegimePathSummary(regimeStateNodes)}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="grid gap-3 md:grid-cols-7">
              {regimeStateNodes.map((node, index) => (
                <div key={node.id} className="relative">
                  <div className={`min-h-[180px] rounded-2xl border p-3 transition ${node.active ? `${node.tone} shadow-lg shadow-violet-950/30 scale-[1.02]` : "border-zinc-800 bg-black/35 text-zinc-500"}`}>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="rounded-full border border-white/10 bg-black/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {node.active && <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.9)]" />}
                    </div>
                    <div className="text-[11px] font-black uppercase tracking-widest text-white">{node.label}</div>
                    <div className="mt-3 text-3xl font-black text-white">{formatScore(node.score)}</div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div className={`h-full rounded-full ${getBarTone(node.score)}`} style={{ width: `${node.score}%` }} />
                    </div>
                    <div className="mt-3 text-[11px] leading-4 opacity-75">{node.description}</div>
                  </div>
                  {index < regimeStateNodes.length - 1 && (
                    <div className="pointer-events-none absolute left-full top-1/2 z-10 hidden -translate-x-1/2 -translate-y-1/2 md:block">
                      <ArrowRight className={`h-5 w-5 ${node.active ? "text-violet-200" : "text-zinc-700"}`} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-3">
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-violet-200">
                <Target className="h-3.5 w-3.5" />
                Current State Lock
              </div>
              <div className="mt-3 text-3xl font-black text-white">{snapshot.regime}</div>
              <div className="mt-2 text-xs leading-5 text-violet-100/80">
                {activeRegimeNodes.length
                  ? activeRegimeNodes.map((node) => node.label).join(" → ")
                  : "SCAN mode. Waiting for stronger factor confirmation."}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Transition Rules</div>
              <div className="space-y-2 text-xs text-zinc-400">
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">DEFENSIVE → COMPRESSION: BTC/stable preference with low volatility.</div>
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">COMPRESSION → CHURN: volume/volatility wakes up without clear direction.</div>
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">CHURN → INFLOW: leader sector confirms positive price + liquidity pressure.</div>
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">EXPANSION → EUPHORIA: alt strength, volatility, premium, and risk appetite stack together.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Regime Factors
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                Composite state machine: breadth, relative strength, risk appetite, BTC defense.
              </div>
            </div>
            <Shield className="h-5 w-5 text-zinc-600" />
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {snapshot.factors.map((factor) => (
              <div key={factor.label} className="rounded-2xl border border-zinc-900 bg-black/40 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-zinc-200">{factor.label}</div>
                    <div className="text-xs text-zinc-600">{factor.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-white">{factor.value}</div>
                    <div className="text-[10px] uppercase tracking-widest text-zinc-500">{getStatusText(factor.value)}</div>
                  </div>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className={`h-full rounded-full ${getBarTone(factor.value)}`} style={{ width: `${factor.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-900 bg-zinc-950/70 p-4">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Sector Radar
              </div>
              <div className="mt-1 text-xs text-zinc-600">
                First visual draft for rotation heat before touching Sankey.
              </div>
            </div>
            <Radar className="h-5 w-5 text-zinc-600" />
          </div>

          <div className="space-y-3">
            {snapshot.sectors.map((sector) => (
              <div key={sector.sector} className="rounded-2xl border border-zinc-900 bg-black/40 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{sector.sector}</span>
                    {sector.direction === "up" && <ArrowUpRight className="h-4 w-4 text-emerald-400" />}
                    {sector.direction === "down" && <ArrowDownRight className="h-4 w-4 text-red-400" />}
                  </div>
                  <div className="text-sm font-black text-zinc-200">{sector.score}</div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-zinc-900">
                  <div className={`h-full rounded-full ${getBarTone(sector.score)}`} style={{ width: `${sector.score}%` }} />
                </div>
                <div className="text-xs text-zinc-600">{sector.reason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            <BrainCircuit className="h-4 w-4" />
            Decision Trace
          </div>

          <div className="space-y-3">
            {snapshot.decisionSteps.map((step) => (
              <div key={step.label} className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-zinc-100">{step.label}</div>
                  <div className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${getImpactClass(step.impact)}`}>
                    {step.impact}
                  </div>
                </div>
                <div className="text-lg font-black text-white">{step.value}</div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">{step.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            <BellRing className="h-4 w-4" />
            Alert Candidates
          </div>

          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
            {snapshot.alertCandidates.map((alert) => (
              <div key={alert.title} className={`rounded-2xl border p-4 ${getSeverityClass(alert.severity)}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">{alert.severity}</div>
                  <div className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs font-black">
                    {alert.confidence}%
                  </div>
                </div>
                <div className="text-sm font-black text-white">{alert.title}</div>
                <div className="mt-2 text-xs leading-5 opacity-80">{alert.reason}</div>
                <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-2 text-[11px] leading-4 opacity-75">
                  {alert.promoteWhen}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4 xl:col-span-2">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            <Waves className="h-4 w-4" />
            Rotation Storyboard
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {snapshot.storyboard.map((item, index) => (
              <div key={item.title} className="rounded-2xl border border-zinc-900 bg-zinc-950/80 p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-zinc-600">
                  <span>STEP {index + 1}</span>
                  {index < snapshot.storyboard.length - 1 ? <ArrowRight className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div className="text-sm font-bold text-zinc-100">{item.title}</div>
                <div className="mt-2 text-xs leading-5 text-zinc-500">{item.detail}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            <GitBranch className="h-4 w-4" />
            Promotion Checklist
          </div>

          <div className="space-y-3 text-xs text-zinc-400">
            {snapshot.checklist.map((item) => (
              <div key={item} className="flex gap-2 rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-black/75 p-4 shadow-2xl shadow-emerald-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(16,185,129,0.14),transparent_28%),radial-gradient(circle_at_85%_28%,rgba(34,211,238,0.10),transparent_32%)]" />
        <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-emerald-200">
              <Database className="h-4 w-4" />
              Historical Intelligence
            </div>
            <div className="mt-1 max-w-4xl text-xs leading-5 text-zinc-500">
              5Y candles for Fear, Volatility, Altseason, BTC Dominance, Upbit Trade Volume, and Premium coverage since 2024. Current value now has history, momentum, percentile, and divergence context.
            </div>
          </div>
          <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-200">
            {historicalMetrics.length}/6 historical feeds
          </div>
        </div>

        <div className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {historicalMetrics.map((metric) => (
            <div key={metric.key} className="rounded-2xl border border-zinc-800 bg-zinc-950/85 p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-widest text-white">{metric.label}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-zinc-600">Coverage {metric.coverage}</div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${getMomentumTone(metric.change7d)}`}>
                  {metric.direction}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Current</div>
                  <div className="mt-1 text-2xl font-black text-white">{metric2(metric.current)}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/35 p-3">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-600">Percentile</div>
                  <div className="mt-1 text-2xl font-black text-white">{metric2(metric.percentile, "%")}</div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-zinc-900 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600">7D</div>
                  <div className={`mt-1 text-sm font-black ${metric.change7d != null && metric.change7d < 0 ? "text-red-200" : "text-emerald-200"}`}>{metric2(metric.change7d)}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600">30D</div>
                  <div className={`mt-1 text-sm font-black ${metric.change30d != null && metric.change30d < 0 ? "text-red-200" : "text-emerald-200"}`}>{metric2(metric.change30d)}</div>
                </div>
                <div className="rounded-xl border border-zinc-900 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest text-zinc-600">Accel</div>
                  <div className={`mt-1 text-sm font-black ${metric.acceleration != null && metric.acceleration < 0 ? "text-red-200" : "text-cyan-200"}`}>{metric2(metric.acceleration)}</div>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
                <div className={`h-full rounded-full ${getPercentileTone(metric.percentile)}`} style={{ width: `${Math.max(3, Math.min(100, metric.percentile ?? 0))}%` }} />
              </div>

              <div className="mt-3 flex h-12 items-end gap-1 overflow-hidden rounded-xl border border-zinc-900 bg-black/30 p-2">
                {metric.points.slice(0, 24).reverse().map((point, index) => {
                  const values = metric.points.slice(0, 24).map((item) => item.value)
                  const min = Math.min(...values)
                  const max = Math.max(...values)
                  const height = max === min ? 32 : 8 + ((point.value - min) / (max - min)) * 32
                  return <div key={`${metric.key}-${index}`} className="flex-1 rounded-t bg-emerald-300/70" style={{ height }} />
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200">
              <GitBranch className="h-3.5 w-3.5" />
              Historical Regime Matrix
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {historicalMatrix.map((row) => (
                <div key={row.title} className={`rounded-2xl border p-4 ${row.tone}`}>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{row.title}</div>
                  <div className="mt-3 text-sm font-black text-white">{row.value}</div>
                  <div className="mt-2 text-[11px] leading-5 opacity-80">{row.detail}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-200">
              <Activity className="h-3.5 w-3.5" />
              History Timeline Events
            </div>
            <div className="space-y-2">
              {historyTimeline.map((event) => (
                <div key={`${event.title}-${event.detail}`} className={`rounded-2xl border p-3 ${getTimelineTone(event.severity)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-widest text-white">{event.title}</div>
                    <div className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{event.severity}</div>
                  </div>
                  <div className="mt-1 text-[11px] leading-5 opacity-80">{event.detail}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-fuchsia-400/20 bg-black/75 p-4 shadow-2xl shadow-fuchsia-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_18%,rgba(217,70,239,0.16),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(16,185,129,0.12),transparent_30%),linear-gradient(90deg,rgba(217,70,239,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(16,185,129,0.04)_1px,transparent_1px)] bg-[length:auto,auto,46px_46px,46px_46px]" />
        <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-200">
              <Radar className="h-4 w-4" />
              Rotation Intelligence
            </div>
            <div className="mt-1 max-w-4xl text-xs leading-5 text-zinc-500">
              Sector score is now interpreted as a rotation state machine: rank change, lifecycle, regime fit, premium boost, and generated rotation story. Still sandbox-only inside Regime Lab.
            </div>
          </div>
          <div className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-fuchsia-200">
            {phase3Leader ? `${phase3Leader.sector} ${phase3Leader.lifecycle}` : "SCANNING"}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-200">
                <BrainCircuit className="h-3.5 w-3.5" />
                Rotation Story Generator
              </div>
              <div className="text-lg font-black leading-7 text-white">{phase3Summary}</div>
              <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-3 text-xs leading-5 text-fuchsia-50/80">
                {phase3Leader?.rotationStory ?? "No leader story is available yet."}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Fastest Mover</div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-2xl font-black text-white">{phase3Mover?.sector ?? "—"}</div>
                    <div className="mt-1 text-xs text-zinc-500">Rank momentum tracker</div>
                  </div>
                  <div className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-widest ${getRankDeltaTone(phase3Mover?.rankDelta ?? 0)}`}>
                    {getRankDeltaLabel(phase3Mover?.rankDelta ?? 0)}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Lifecycle Rail</div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-black uppercase tracking-widest md:grid-cols-6 xl:grid-cols-3 2xl:grid-cols-6">
                  {(["QUIET", "CHURN", "INFLOW", "EXPANSION", "EXHAUSTION", "OUTFLOW"] as RotationLifecycleState[]).map((state) => {
                    const active = rotationIntelligence.some((row) => row.lifecycle === state)
                    return (
                      <div key={state} className={`rounded-xl border px-2 py-2 ${active ? getLifecycleTone(state) : "border-zinc-900 bg-black/30 text-zinc-600"}`}>
                        {state}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <div className="mb-3 flex items-center justify-between gap-3 px-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
                <Layers3 className="h-3.5 w-3.5" />
                Rotation Intelligence Board
              </div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">Rank / State / Fit</div>
            </div>

            <div className="space-y-2">
              {rotationIntelligence.slice(0, 6).map((row) => (
                <button
                  key={`${row.sector}-${row.rank}`}
                  onClick={() => setSelectedLiquiditySector(row.sector)}
                  className={`w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${selectedLiquidity?.sector === row.sector ? "border-fuchsia-300/50 bg-fuchsia-400/10" : "border-zinc-800 bg-black/35 hover:border-zinc-600"}`}
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/35 text-sm font-black text-white">#{row.rank}</div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-widest text-white">{row.sector}</div>
                        <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">prev {row.previousRank ? `#${row.previousRank}` : "—"} · {row.timelineEvent}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${getRankDeltaTone(row.rankDelta)}`}>{getRankDeltaLabel(row.rankDelta)}</span>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-widest ${getLifecycleTone(row.lifecycle)}`}>{row.lifecycle}</span>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-5">
                    {[
                      ["Score", row.score],
                      ["Regime Fit", row.regimeFit],
                      ["Volume", row.volumePressure],
                      ["Vol", row.volatility],
                      ["Premium", row.premiumBoost],
                    ].map(([label, value]) => (
                      <div key={`${row.sector}-${label}`} className="rounded-xl border border-zinc-900 bg-zinc-950/80 p-2">
                        <div className="text-[9px] uppercase tracking-widest text-zinc-600">{label}</div>
                        <div className="mt-1 text-sm font-black text-white">{formatScore(Number(value))}</div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-900">
                          <div className="h-full rounded-full bg-fuchsia-300" style={{ width: `${Math.max(3, Math.min(100, Number(value)))}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-xl border border-white/10 bg-black/25 p-2 text-[11px] leading-5 text-zinc-300">
                    {row.rotationStory}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-200">
              <Activity className="h-3.5 w-3.5" />
              Rotation Timeline Events
            </div>
            <div className="space-y-2">
              {rotationIntelligence.slice(0, 5).map((row) => (
                <div key={`timeline-${row.sector}`} className={`rounded-2xl border p-3 ${getLifecycleTone(row.lifecycle)}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-black uppercase tracking-widest text-white">{row.timelineEvent}</div>
                    <div className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{formatScore(row.confidence)}%</div>
                  </div>
                  <div className="mt-1 text-[11px] leading-5 opacity-80">{row.rotationStory}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-200">
              <Target className="h-3.5 w-3.5" />
              Promotion Rules
            </div>
            <div className="space-y-2 text-xs leading-5 text-amber-50/85">
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">Promote INFLOW only when lifecycle is INFLOW/EXPANSION, regime fit ≥ 70, and rank is stable or improving.</div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">Promote OUTFLOW immediately in RISK_OFF when confidence ≥ 65 or volatility is elevated.</div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">Keep CHURN watch-only until price confirmation or second snapshot persistence.</div>
              <div className="rounded-xl border border-white/10 bg-black/25 p-3">Use rank delta as early attention, not as a standalone alert trigger.</div>
            </div>
          </div>
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-black/75 p-4 shadow-2xl shadow-cyan-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(139,92,246,0.12),transparent_28%)]" />
        <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <BrainCircuit className="h-4 w-4" />
              Intelligence Pack
            </div>
            <div className="mt-1 max-w-4xl text-xs leading-5 text-zinc-500">
              Regime glossary, formula inspector, enhanced scenarios, conflict detector, and operator summary. This is sandbox-only and ready to migrate into README/Wiki later.
            </div>
          </div>
          <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan-200">
            {scenarioLabels[scenario]} / {snapshot.regime}
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
              <BadgeInfo className="h-3.5 w-3.5" />
              Terminal Glossary
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {regimeGlossary.map((term) => (
                <div key={term.term} className={`rounded-2xl border p-3 ${term.tone}`}>
                  <div className="text-xs font-black uppercase tracking-widest text-white">{term.term}</div>
                  <div className="mt-2 text-[11px] leading-5 opacity-85">{term.meaning}</div>
                  <div className="mt-2 rounded-xl border border-white/10 bg-black/25 p-2 text-[10px] leading-4 opacity-75">{term.usage}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">
              <Gauge className="h-3.5 w-3.5" />
              Operator Summary
            </div>
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-lg font-black leading-7 text-cyan-50">
              {operatorSummary}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {enhancedScenarioPresets.map((preset) => {
                const active = scenario === preset.id
                return (
                  <button
                    key={preset.label}
                    onClick={() => setScenario(preset.id as ScenarioId)}
                    className={`rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 ${active ? "border-cyan-300/50 bg-cyan-400/10 text-cyan-100" : "border-zinc-800 bg-black/35 text-zinc-400 hover:border-zinc-600"}`}
                  >
                    <div className="mb-1 text-xs font-black uppercase tracking-widest text-white">{preset.label}</div>
                    <div className="text-[11px] leading-4 opacity-80">{preset.recipe}</div>
                    <div className="mt-2 rounded-xl border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-bold uppercase tracking-widest opacity-75">{preset.output}</div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-fuchsia-400/20 bg-black/70 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-fuchsia-200">
            <Target className="h-4 w-4" />
            Metric Formula Inspector
          </div>
          <div className="space-y-3">
            {formulaInspector.map((row) => (
              <div key={row.label} className={`rounded-2xl border p-4 ${getFormulaTone(row.status)}`}>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-black text-white">{row.label}</div>
                  <div className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-widest">{row.status}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-2 font-mono text-[11px] leading-5 opacity-80">{row.formula}</div>
                <div className="mt-3 text-lg font-black text-white">{row.current}</div>
                <div className="mt-1 text-xs leading-5 opacity-75">{row.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-amber-400/20 bg-black/70 p-4">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-amber-200">
            <Shield className="h-4 w-4" />
            Signal Conflict Detector
          </div>
          <div className="space-y-3">
            {signalConflicts.map((conflict) => (
              <div key={conflict.title} className={`rounded-2xl border p-4 ${getConflictTone(conflict.severity)}`}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="text-sm font-black text-white">{conflict.title}</div>
                  <div className="rounded-full border border-white/10 bg-black/25 px-2 py-1 text-[10px] font-black uppercase tracking-widest">{conflict.severity}</div>
                </div>
                <div className="text-xs leading-5 opacity-80">{conflict.detail}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Output</div>
            <div className="text-sm leading-6 text-zinc-300">
              Use this pack to decide whether a signal stays in lab, moves to watch, or becomes an alert candidate. Redundant cards are intentional for now; cleanup can happen after the terminal language feels right.
            </div>
          </div>
        </div>
      </div>


      <div className="relative overflow-hidden rounded-3xl border border-cyan-400/20 bg-black/75 p-4 shadow-2xl shadow-cyan-950/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(34,211,238,0.16),transparent_28%),radial-gradient(circle_at_82%_32%,rgba(168,85,247,0.12),transparent_30%),linear-gradient(90deg,rgba(34,211,238,0.05)_1px,transparent_1px),linear-gradient(0deg,rgba(168,85,247,0.04)_1px,transparent_1px)] bg-[length:auto,auto,44px_44px,44px_44px]" />
        <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-200">
              <Play className="h-4 w-4" />
              Replay & Backtest Intelligence
            </div>
            <div className="mt-1 max-w-4xl text-xs leading-5 text-zinc-500">
              Historical DataLab candles are merged into replayable daily frames. Alert OS alert rules are applied backward to preview regime transitions, alert clusters, and signal quality before any rule graduates from the lab.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["30D", "90D", "180D"] as ReplayWindow[]).map((windowId) => (
              <button
                key={windowId}
                onClick={() => {
                  setReplayWindow(windowId)
                  setReplayCursor(0)
                }}
                className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                  replayWindow === windowId
                    ? "border-cyan-300/60 bg-cyan-400/10 text-cyan-100"
                    : "border-zinc-800 bg-black/40 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                }`}
              >
                {windowId}
              </button>
            ))}
            <button
              onClick={() => setReplayPlaying((value) => !value)}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-cyan-100"
            >
              {replayPlaying ? "Pause" : "Play"}
            </button>
            <button
              onClick={() => setReplayCursor((current) => (current + 1) % Math.max(1, replaySnapshots.length))}
              className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-300"
            >
              Step
            </button>
          </div>
        </div>

        <div className="relative grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className={`rounded-3xl border p-5 ${getReplayRegimeTone(replayFrame?.regime ?? "MIXED")}`}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] opacity-70">Replay Frame</div>
                <div className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                  {replayFrame?.date ?? "NO DATA"}
                </div>
              </div>
              <div className="text-3xl font-black text-white">{replayFrame?.regime ?? "HISTORY PENDING"}</div>
              <div className="mt-2 text-xs leading-5 opacity-80">{replayFrame?.headline ?? "DataLab history is not available yet."}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest opacity-60">Temp</div>
                  <div className="mt-1 text-lg font-black text-white">{metric2(replayFrame?.temperature)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest opacity-60">Alerts</div>
                  <div className="mt-1 text-lg font-black text-white">{replayFrame?.alertCount ?? 0}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/25 p-2">
                  <div className="text-[9px] uppercase tracking-widest opacity-60">Frame</div>
                  <div className="mt-1 text-lg font-black text-white">{replaySnapshots.length ? replayCursor + 1 : 0}/{replaySnapshots.length}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Replay Metrics</div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {[
                  ["Fear", replayFrame?.fearGreed],
                  ["Vol", replayFrame?.volatility],
                  ["Alt", replayFrame?.altSeason],
                  ["BTC Dom", replayFrame?.btcDominance],
                  ["Volume", replayFrame?.tradeVolumeTrend],
                  ["Premium", replayFrame?.premium],
                ].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-zinc-900 bg-black/35 p-3">
                    <div className="text-[9px] font-bold uppercase tracking-widest text-zinc-600">{label}</div>
                    <div className="mt-1 text-lg font-black text-white">{metric2(value as number | null)}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-200">Case Study Generator</div>
              <div className="text-sm leading-6 text-cyan-50/85">{replayCaseStudy}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-600">Replay Timeline</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{replayWindow}</div>
              </div>
              <div className="flex h-28 items-end gap-1 overflow-hidden rounded-2xl border border-zinc-900 bg-black/40 p-3">
                {replaySnapshots.map((frame, index) => {
                  const active = index === replayCursor
                  const height = 12 + (frame.temperature / 100) * 76
                  return (
                    <button
                      key={`${frame.date}-${index}`}
                      onClick={() => setReplayCursor(index)}
                      className={`relative flex-1 rounded-t transition ${active ? "bg-cyan-200 shadow-[0_0_18px_rgba(34,211,238,0.8)]" : frame.alertCount ? "bg-fuchsia-300/80" : "bg-zinc-600/80 hover:bg-zinc-400"}`}
                      style={{ height }}
                      title={`${frame.date} ${frame.regime}`}
                    >
                      {frame.alertCount > 0 && <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-red-300 shadow-[0_0_10px_rgba(248,113,113,0.8)]" />}
                    </button>
                  )
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                <span>Oldest</span>
                <span>Alert markers = pink bars / red dots</span>
                <span>Latest</span>
              </div>
            </div>

            <div className="rounded-2xl border border-fuchsia-400/20 bg-fuchsia-500/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-fuchsia-200">
                <BellRing className="h-3.5 w-3.5" />
                Alert Backtest Panel
              </div>
              <div className="space-y-2">
                {backtestAlerts.slice(0, 6).map((alert) => (
                  <div key={alert.id} className={`rounded-2xl border p-3 ${getBacktestSeverityTone(alert.severity)}`}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="text-xs font-black uppercase tracking-widest text-white">{alert.title}</div>
                      <div className="rounded-full border border-white/10 bg-black/25 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest">{alert.severity}</div>
                    </div>
                    <div className="text-[11px] leading-5 opacity-80">{alert.date} · {alert.detail}</div>
                    <div className="mt-2 text-[10px] font-bold uppercase tracking-widest opacity-70">
                      Next 7D temp delta: {metric2(alert.next7dScore)}
                    </div>
                  </div>
                ))}
                {!backtestAlerts.length && (
                  <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4 text-xs leading-5 text-zinc-500">
                    No backtest alerts fired in this window. Try 180D or wait for full DataLab history parsing.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-900 bg-black/60 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
          <RadioTower className="h-4 w-4" />
          Debug Signals
        </div>
        <div className="grid gap-2 md:grid-cols-4">
          {snapshot.signals.map((signal) => (
            <div key={signal} className="rounded-xl border border-zinc-900 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
              {signal}
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-cyan-400/10 bg-cyan-400/5 p-3 text-xs leading-5 text-cyan-100/80">
          <BadgeInfo className="mt-0.5 h-4 w-4 shrink-0" />
          Next integration target: store DataLab snapshots over time, then calculate 1h/4h velocity for premium, volume, and altseason before promoting any alert to the main dashboard.
        </div>
      </div>
    </div>
  )
}
