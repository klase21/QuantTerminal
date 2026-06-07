"use client"

import { Activity, AlertTriangle, BrainCircuit, Crosshair, Radio, Radar, Satellite, ShieldAlert, Sparkles, Zap } from "lucide-react"

import { useWarRoomIntelligenceLayer } from "@/hooks/useWarRoomIntelligenceLayer"
import type { AutonomousHuntSignal, LiveOperatorBrief, NarrativeUniverseLink, NarrativeUniverseNode } from "@/core/war-room-intelligence/warRoomTypes"

type Tone = "LIVE" | "ACTION" | "RISK" | "WATCH" | "INFO"

const demoNodes: NarrativeUniverseNode[] = [
  { id: "core", label: "MARKET CORE", type: "CORE", orbit: "INNER", x: 50, y: 50, z: 96, radius: 22, gravity: 96, heat: 91, pulse: 96, priority: "ACTIONABLE", summary: "Central liquidity gravity and cross-market pressure node." },
  { id: "btc", label: "BTC DOM", type: "SECTOR", orbit: "INNER", x: 36, y: 43, z: 82, radius: 14, gravity: 77, heat: 72, pulse: 68, priority: "WATCH", summary: "BTC dominance is acting as the primary beta anchor." },
  { id: "ai", label: "AI", type: "NARRATIVE", orbit: "INNER", x: 60, y: 35, z: 89, radius: 16, gravity: 86, heat: 88, pulse: 92, priority: "ACTIONABLE", summary: "AI narrative acceleration is pulling adjacent beta sectors." },
  { id: "meme", label: "MEME", type: "RISK", orbit: "MIDDLE", x: 73, y: 54, z: 74, radius: 14, gravity: 69, heat: 84, pulse: 88, priority: "DEFENSIVE", summary: "Meme crowding and liquidity stress are entering defensive range." },
  { id: "gaming", label: "GAMING", type: "SECTOR", orbit: "MIDDLE", x: 61, y: 72, z: 62, radius: 12, gravity: 58, heat: 63, pulse: 56, priority: "WATCH", summary: "Gaming beta is receiving narrative spillover from AI." },
  { id: "rwa", label: "RWA", type: "NARRATIVE", orbit: "OUTER", x: 27, y: 66, z: 54, radius: 12, gravity: 49, heat: 57, pulse: 48, priority: "WATCH", summary: "RWA remains persistent but needs stronger flow confirmation." },
  { id: "liq", label: "LIQUIDITY", type: "SIGNAL", orbit: "OUTER", x: 23, y: 30, z: 68, radius: 13, gravity: 70, heat: 69, pulse: 73, priority: "DEFENSIVE", summary: "Liquidity quality is the main risk control variable." },
]

const demoLinks: NarrativeUniverseLink[] = [
  { id: "core-ai", from: "core", to: "ai", strength: 92, latency: 8, contagion: 88, summary: "Market core is validating AI narrative expansion." },
  { id: "ai-gaming", from: "ai", to: "gaming", strength: 74, latency: 14, contagion: 69, summary: "AI narrative is spilling into gaming beta." },
  { id: "ai-meme", from: "ai", to: "meme", strength: 80, latency: 11, contagion: 91, summary: "High beta narrative is leaking into meme risk." },
  { id: "core-btc", from: "core", to: "btc", strength: 69, latency: 16, contagion: 55, summary: "BTC dominance remains the main regime anchor." },
  { id: "liq-meme", from: "liq", to: "meme", strength: 84, latency: 9, contagion: 78, summary: "Liquidity stress is directly affecting meme sector risk." },
  { id: "btc-rwa", from: "btc", to: "rwa", strength: 46, latency: 28, contagion: 36, summary: "RWA remains peripheral to current beta path." },
]

function demoBriefs(): LiveOperatorBrief[] {
  const now = new Date().toISOString()
  return [
    { id: "brief-ai", timestamp: now, severity: "ACTION", priority: "ACTIONABLE", title: "AI narrative acceleration confirmed", read: "AI is the current gravity leader. Spillover is visible into Gaming and speculative beta while confirmation remains above tactical threshold.", evidence: ["velocity 88", "contagion 91", "sector pull 74"], ttlSeconds: 180 },
    { id: "brief-risk", timestamp: now, severity: "RISK", priority: "DEFENSIVE", title: "Meme crowding entering defensive range", read: "Meme beta is rising faster than liquidity quality. Treat further expansion as reflexive and fragile unless depth improves.", evidence: ["crowding high", "liquidity quality weak", "stress rising"], ttlSeconds: 140 },
    { id: "brief-btc", timestamp: now, severity: "WATCH", priority: "WATCH", title: "BTC dominance remains regime anchor", read: "BTC dominance is still controlling the risk-on pathway. Alt beta confirmation requires BTC gravity to soften.", evidence: ["dominance anchor", "beta gate", "watch"], ttlSeconds: 120 },
  ]
}

const demoHunts: AutonomousHuntSignal[] = [
  { id: "hunt-1", class: "ROTATION", label: "Stealth AI → Gaming rotation", target: "GAMING", score: 86, anomalyScore: 82, stealthScore: 79, confirmationScore: 88, priority: "ACTIONABLE", action: "INVESTIGATE", read: "Gaming is reacting before broad sector confirmation. This looks like early beta migration from AI." },
  { id: "hunt-2", class: "FRACTURE", label: "Meme liquidity fracture watch", target: "MEME", score: 78, anomalyScore: 87, stealthScore: 61, confirmationScore: 74, priority: "DEFENSIVE", action: "ESCALATE", read: "Meme crowding is expanding while depth quality is not confirming. Watch for leverage unwind." },
  { id: "hunt-3", class: "DIVERGENCE", label: "RWA news-flow divergence", target: "RWA", score: 61, anomalyScore: 55, stealthScore: 68, confirmationScore: 57, priority: "WATCH", action: "MONITOR", read: "RWA narrative remains persistent but liquidity confirmation is lagging." },
]

function toneClass(tone: Tone | string) {
  if (tone === "ACTION" || tone === "ACTIONABLE") return "border-emerald-300/50 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,.20)]"
  if (tone === "RISK" || tone === "DEFENSIVE" || tone === "FRACTURE") return "border-red-300/50 bg-red-400/10 text-red-200 shadow-[0_0_24px_rgba(248,113,113,.20)]"
  if (tone === "WATCH" || tone === "ROTATION" || tone === "DIVERGENCE") return "border-amber-300/50 bg-amber-400/10 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,.14)]"
  return "border-cyan-300/50 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.18)]"
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function n(value: unknown, digits = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(digits) : "--"
}

function Badge({ children, tone = "INFO" }: { children: React.ReactNode; tone?: Tone | string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${toneClass(tone)}`}>{children}</span>
}

function NodeBeam({ link, nodes }: { link: NarrativeUniverseLink; nodes: NarrativeUniverseNode[] }) {
  const from = nodes.find((item) => item.id === link.from)
  const to = nodes.find((item) => item.id === link.to)
  if (!from || !to) return null
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  const alpha = clamp(link.strength, 22, 92) / 100
  return (
    <div
      className="qt-beam absolute left-0 top-0 h-[2px] origin-left rounded-full bg-gradient-to-r from-cyan-300/0 via-cyan-200 to-emerald-300/0"
      style={{ width: `${length}%`, transform: `translate(${from.x}%, ${from.y}%) rotate(${angle}deg)`, opacity: alpha, animationDelay: `${link.latency / 16}s` }}
      title={link.summary}
    />
  )
}

function UniverseNode({ node, index }: { node: NarrativeUniverseNode; index: number }) {
  const size = Math.max(52, node.radius * 5)
  const heat = clamp(node.heat)
  const isCore = node.type === "CORE"
  const isRisk = node.type === "RISK" || node.priority === "DEFENSIVE"
  const palette = isCore
    ? "border-cyan-100 bg-cyan-300/25 text-cyan-50 shadow-[0_0_70px_rgba(103,232,249,.68)]"
    : isRisk
      ? "border-red-100 bg-red-400/20 text-red-50 shadow-[0_0_50px_rgba(248,113,113,.45)]"
      : node.priority === "ACTIONABLE"
        ? "border-emerald-100 bg-emerald-400/20 text-emerald-50 shadow-[0_0_50px_rgba(52,211,153,.45)]"
        : "border-amber-100 bg-amber-400/16 text-amber-50 shadow-[0_0_36px_rgba(251,191,36,.30)]"

  return (
    <div
      className="qt-float absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${node.x}%`, top: `${node.y}%`, animationDelay: `${index * 0.18}s`, zIndex: Math.round(node.z) }}
    >
      <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-10 qt-node-ring" />
      <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-current opacity-20 qt-node-ring-reverse" />
      <div className={`grid place-items-center rounded-full border backdrop-blur-xl ${palette}`} style={{ width: size, height: size }}>
        <div className="text-center">
          <div className="text-[10px] font-black uppercase tracking-[0.12em]">{node.label}</div>
          <div className="mt-1 text-[9px] font-black opacity-70">{n(heat)}</div>
        </div>
      </div>
    </div>
  )
}

function ParticleField() {
  return (
    <>
      {Array.from({ length: 42 }).map((_, index) => (
        <span
          key={index}
          className="qt-particle absolute h-1 w-1 rounded-full bg-cyan-200/60 shadow-[0_0_12px_rgba(103,232,249,.70)]"
          style={{ left: `${(index * 29) % 97}%`, top: `${(index * 47) % 91}%`, animationDelay: `${index * 0.09}s` }}
        />
      ))}
    </>
  )
}

function NarrativeUniverse({ nodes, links }: { nodes: NarrativeUniverseNode[]; links: NarrativeUniverseLink[] }) {
  const gravity = nodes.length ? nodes.reduce((sum, node) => sum + node.gravity, 0) / nodes.length : 0
  const heat = nodes.length ? nodes.reduce((sum, node) => sum + node.heat, 0) / nodes.length : 0

  return (
    <div className="relative min-h-[680px] overflow-hidden rounded-[2rem] border border-cyan-400/25 bg-[radial-gradient(circle_at_50%_52%,rgba(34,211,238,.22),rgba(10,15,24,.92)_38%,#020305_78%)] shadow-[inset_0_0_120px_rgba(34,211,238,.10),0_0_90px_rgba(34,211,238,.12)]">
      <div className="absolute inset-0 qt-grid opacity-45" />
      <div className="absolute inset-0 qt-scan opacity-20" />
      <ParticleField />

      <div className="qt-radar absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/15" />
      <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
      <div className="absolute left-1/2 top-1/2 h-72 w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/15" />
      <div className="absolute left-1/2 top-1/2 h-[30rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/15" />
      <div className="absolute left-1/2 top-1/2 h-[39rem] w-[58rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />

      {links.map((link) => <NodeBeam key={link.id} link={link} nodes={nodes} />)}
      {nodes.map((node, index) => <UniverseNode key={node.id} node={node} index={index} />)}

      <div className="absolute left-6 top-6 rounded-2xl border border-cyan-300/20 bg-black/55 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200"><Sparkles className="h-4 w-4" /> Narrative Universe</div>
        <div className="mt-2 text-4xl font-black uppercase tracking-tight text-white">LIVE ORBIT</div>
        <div className="mt-2 max-w-[24rem] text-xs leading-5 text-zinc-400">Capital gravity, narrative pulse and contagion beams are now the center of the dashboard.</div>
      </div>

      <div className="absolute bottom-6 left-6 right-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[['Gravity', gravity], ['Heat', heat], ['Nodes', nodes.length], ['Beams', links.length]].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-zinc-800 bg-black/60 p-3 backdrop-blur-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">{label}</div>
            <div className="mt-1 text-2xl font-black text-cyan-100">{typeof value === 'number' ? n(value) : value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function OperatorFeed({ briefs, status }: { briefs: LiveOperatorBrief[]; status: string }) {
  return (
    <aside className="flex h-full min-h-[680px] flex-col rounded-[2rem] border border-cyan-400/20 bg-zinc-950/90 p-4 shadow-[0_0_60px_rgba(34,211,238,.08)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200"><Radio className="h-4 w-4" /> AI Operator</div>
          <div className="mt-2 text-2xl font-black uppercase text-white">Live Briefing</div>
        </div>
        <Badge tone="LIVE">{status}</Badge>
      </div>
      <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-emerald-100"><Zap className="h-4 w-4" /> Tactical Read</div>
        <p className="mt-2 text-sm leading-6 text-emerald-50/80">AI narrative remains the primary gravity source. Watch meme crowding and liquidity quality before chasing late beta.</p>
      </div>
      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-hidden">
        {briefs.slice(0, 6).map((brief, index) => (
          <div key={brief.id} className="qt-card-in rounded-2xl border border-zinc-800 bg-black/55 p-4 backdrop-blur" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black uppercase text-white">{brief.title}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">ttl {brief.ttlSeconds}s · {new Date(brief.timestamp).toLocaleTimeString()}</div>
              </div>
              <Badge tone={brief.severity}>{brief.severity}</Badge>
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-400">{brief.read}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {brief.evidence.slice(0, 3).map((item) => <span key={item} className="rounded-full bg-zinc-900 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-zinc-500">{item}</span>)}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function ThreatRadar({ hunts }: { hunts: AutonomousHuntSignal[] }) {
  const top = hunts[0]
  return (
    <aside className="flex h-full min-h-[680px] flex-col gap-4 rounded-[2rem] border border-red-400/20 bg-zinc-950/90 p-4 shadow-[0_0_60px_rgba(248,113,113,.08)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-red-200"><Radar className="h-4 w-4" /> Threat Radar</div>
          <div className="mt-2 text-2xl font-black uppercase text-white">Hunter UI</div>
        </div>
        <Badge tone={top?.priority ?? "WATCH"}>{n(top?.score)}</Badge>
      </div>
      <div className="relative h-64 overflow-hidden rounded-2xl border border-red-400/20 bg-[radial-gradient(circle,rgba(248,113,113,.18),rgba(0,0,0,.78)_55%,#020305_100%)]">
        <div className="qt-radar-red absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-red-200/20" />
        <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-200/15" />
        <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/15" />
        {hunts.slice(0, 5).map((hunt, index) => (
          <div key={hunt.id} className="absolute rounded-full border border-red-200 bg-red-400/25 shadow-[0_0_22px_rgba(248,113,113,.45)]" style={{ left: `${22 + ((index * 17) % 62)}%`, top: `${24 + ((index * 23) % 48)}%`, width: 10 + hunt.score / 10, height: 10 + hunt.score / 10 }} title={hunt.label} />
        ))}
        <div className="absolute bottom-3 left-3 rounded-xl border border-red-300/20 bg-black/60 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-100">Autonomous Scan Active</div>
      </div>
      <div className="flex flex-col gap-3">
        {hunts.slice(0, 5).map((hunt, index) => (
          <div key={hunt.id} className="qt-card-in rounded-2xl border border-zinc-800 bg-black/55 p-3" style={{ animationDelay: `${index * 0.1}s` }}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-black uppercase text-white">{hunt.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.15em] text-zinc-500">{hunt.target} · {hunt.action}</div>
              </div>
              <Badge tone={hunt.class}>{hunt.class}</Badge>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div className="h-full rounded-full bg-red-300 shadow-[0_0_14px_rgba(248,113,113,.55)]" style={{ width: `${clamp(hunt.score)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

function SignalMatrix({ hunts, nodes }: { hunts: AutonomousHuntSignal[]; nodes: NarrativeUniverseNode[] }) {
  const rows = hunts.map((hunt) => ({ signal: hunt.label, target: hunt.target, confidence: hunt.confirmationScore, risk: hunt.anomalyScore, action: hunt.action }))
  const nodeRows = nodes.slice(0, 4).map((node) => ({ signal: `${node.label} gravity`, target: node.type, confidence: node.gravity, risk: node.heat, action: node.priority }))
  return (
    <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/90 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200"><Crosshair className="h-4 w-4" /> Signal Command Matrix</div>
        <Badge tone="LIVE">Realtime Tactical Sort</Badge>
      </div>
      <div className="overflow-hidden rounded-2xl border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/80 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
            <tr><th className="p-3">Signal</th><th className="p-3">Target</th><th className="p-3">Conf</th><th className="p-3">Risk</th><th className="p-3">Action</th></tr>
          </thead>
          <tbody>
            {[...rows, ...nodeRows].slice(0, 8).map((row) => (
              <tr key={`${row.signal}-${row.target}`} className="border-t border-zinc-900 bg-black/30">
                <td className="p-3 font-bold text-zinc-100">{row.signal}</td>
                <td className="p-3 text-zinc-400">{row.target}</td>
                <td className="p-3 text-emerald-200">{n(row.confidence)}</td>
                <td className="p-3 text-red-200">{n(row.risk)}</td>
                <td className="p-3"><Badge tone={String(row.action)}>{row.action}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function WarRoomVisualOverhaul() {
  const { data, error, loading } = useWarRoomIntelligenceLayer(25000)
  const nodes = data?.universe.nodes.length ? data.universe.nodes : demoNodes
  const links = data?.universe.links.length ? data.universe.links : demoLinks
  const briefs = data?.liveOperator.briefs.length ? data.liveOperator.briefs : demoBriefs()
  const hunts = data?.signalHunter.activeHunts.length ? data.signalHunter.activeHunts : demoHunts
  const status = loading ? "WARMING" : data?.liveOperator.status ?? "LIVE"

  return (
    <main className="min-h-screen overflow-hidden bg-[#030406] text-white">
      <style jsx global>{`
        body { background: #030406; }
        .qt-grid { background-image: linear-gradient(rgba(34,211,238,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.07) 1px, transparent 1px); background-size: 42px 42px; }
        .qt-scan { background: repeating-linear-gradient(to bottom, rgba(103,232,249,.10), rgba(103,232,249,.10) 1px, transparent 1px, transparent 8px); animation: qtScan 8s linear infinite; }
        .qt-radar::after, .qt-radar-red::after { content: ""; position: absolute; inset: 50% 50% auto auto; height: 2px; width: 50%; transform-origin: left center; animation: qtSweep 4.8s linear infinite; }
        .qt-radar::after { background: linear-gradient(90deg, rgba(103,232,249,.9), transparent); }
        .qt-radar-red::after { background: linear-gradient(90deg, rgba(248,113,113,.9), transparent); }
        .qt-beam { animation: qtBeam 2.4s ease-in-out infinite; }
        .qt-float { animation: qtFloat 4.3s ease-in-out infinite; }
        .qt-node-ring { animation: qtRing 5s linear infinite; }
        .qt-node-ring-reverse { animation: qtRingReverse 7s linear infinite; }
        .qt-particle { animation: qtParticle 5.2s ease-in-out infinite; }
        .qt-card-in { animation: qtCardIn .5s ease-out both; }
        @keyframes qtScan { from { transform: translateY(-24px); } to { transform: translateY(24px); } }
        @keyframes qtSweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes qtBeam { 0%,100% { filter: brightness(.9); transform-origin: left center; } 50% { filter: brightness(1.9); } }
        @keyframes qtFloat { 0%,100% { margin-top: 0; filter: brightness(1); } 50% { margin-top: -10px; filter: brightness(1.25); } }
        @keyframes qtRing { from { transform: translate(-50%,-50%) rotate(0deg) scale(1); } to { transform: translate(-50%,-50%) rotate(360deg) scale(1.08); } }
        @keyframes qtRingReverse { from { transform: translate(-50%,-50%) rotate(360deg) scale(1.08); } to { transform: translate(-50%,-50%) rotate(0deg) scale(1); } }
        @keyframes qtParticle { 0%,100% { opacity: .18; transform: translate3d(0,0,0); } 50% { opacity: .9; transform: translate3d(22px,-18px,0); } }
        @keyframes qtCardIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="relative p-4 lg:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,.16),transparent_30%),radial-gradient(circle_at_75%_10%,rgba(248,113,113,.12),transparent_28%),radial-gradient(circle_at_50%_90%,rgba(52,211,153,.10),transparent_32%)]" />

        <header className="relative z-10 mb-4 flex flex-col gap-3 rounded-[2rem] border border-cyan-400/20 bg-black/60 p-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.32em] text-cyan-200"><Satellite className="h-4 w-4" /> QuantTerminal War Room</div>
            <h1 className="mt-2 text-3xl font-black uppercase tracking-tight md:text-5xl">Institutional Tactical View</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">Charts are no longer the center. Narrative gravity, operator intelligence and autonomous threat hunting own the screen.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.16em] text-zinc-500">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"><div className="text-lg font-black text-cyan-200">46A</div><div>Universe</div></div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"><div className="text-lg font-black text-emerald-200">47A</div><div>Operator</div></div>
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"><div className="text-lg font-black text-red-200">48A</div><div>Hunter</div></div>
          </div>
        </header>

        {error ? <div className="relative z-10 mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-100"><AlertTriangle className="mr-2 inline h-4 w-4" /> Live API fallback active: {error}</div> : null}

        <section className="relative z-10 grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)_360px]">
          <OperatorFeed briefs={briefs} status={status} />
          <NarrativeUniverse nodes={nodes} links={links} />
          <ThreatRadar hunts={hunts} />
        </section>

        <section className="relative z-10 mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_420px]">
          <SignalMatrix hunts={hunts} nodes={nodes} />
          <div className="rounded-[2rem] border border-emerald-400/20 bg-zinc-950/90 p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200"><BrainCircuit className="h-4 w-4" /> Operator Command</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4"><Activity className="h-5 w-5 text-cyan-200" /><div className="mt-3 text-2xl font-black text-white">{nodes.length}</div><div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Active objects</div></div>
              <div className="rounded-2xl border border-zinc-800 bg-black/50 p-4"><ShieldAlert className="h-5 w-5 text-red-200" /><div className="mt-3 text-2xl font-black text-white">{hunts.length}</div><div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">Threat hunts</div></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-400">This view intentionally replaces the chart-first dashboard with a command center: AI operator on the left, narrative universe in the center, autonomous hunter on the right, and a tactical signal matrix below.</p>
          </div>
        </section>
      </div>
    </main>
  )
}
