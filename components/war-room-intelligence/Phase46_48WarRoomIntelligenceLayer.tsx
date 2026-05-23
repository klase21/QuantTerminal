"use client"

import type { ReactNode } from "react"
import { Activity, Crosshair, Orbit, Radar, RadioTower, Satellite, ShieldAlert, Sparkles, Zap } from "lucide-react"

import { useWarRoomIntelligenceLayer } from "@/hooks/useWarRoomIntelligenceLayer"
import type { AutonomousHuntSignal, LiveOperatorBrief, NarrativeUniverseLink, NarrativeUniverseNode } from "@/core/war-room-intelligence/warRoomTypes"

function metric(value: unknown, digits = 0) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return "--"
  return parsed.toFixed(digits)
}

function tone(value?: string) {
  switch (value) {
    case "ACTIONABLE":
    case "ACTION":
    case "OPPORTUNITY":
    case "ESCALATE":
      return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200 shadow-[0_0_24px_rgba(52,211,153,0.16)]"
    case "DEFENSIVE":
    case "RISK":
    case "FRACTURE":
      return "border-red-400/40 bg-red-400/10 text-red-200 shadow-[0_0_24px_rgba(248,113,113,0.16)]"
    case "WATCH":
    case "INVESTIGATE":
    case "DIVERGENCE":
    case "ROTATION":
      return "border-amber-400/40 bg-amber-400/10 text-amber-200 shadow-[0_0_24px_rgba(251,191,36,0.13)]"
    case "LIVE":
    case "CORE":
      return "border-cyan-400/40 bg-cyan-400/10 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
    default:
      return "border-zinc-800 bg-zinc-950 text-zinc-400"
  }
}

function Pill({ children, value }: { children: ReactNode; value?: string }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${tone(value)}`}>{children}</span>
}

function Bar({ value }: { value: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
      <div className="h-full rounded-full bg-cyan-300/80 shadow-[0_0_16px_rgba(34,211,238,0.45)]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

const fallbackNodes: NarrativeUniverseNode[] = [
  { id: "core", label: "CORE", type: "CORE", orbit: "INNER", x: 50, y: 50, z: 92, radius: 18, gravity: 96, heat: 88, pulse: 92, priority: "ACTIONABLE", summary: "Central market gravity node." },
  { id: "ai", label: "AI", type: "NARRATIVE", orbit: "INNER", x: 38, y: 34, z: 84, radius: 13, gravity: 82, heat: 80, pulse: 84, priority: "ACTIONABLE", summary: "AI narrative acceleration placeholder." },
  { id: "meme", label: "MEME", type: "RISK", orbit: "MIDDLE", x: 68, y: 37, z: 72, radius: 12, gravity: 69, heat: 76, pulse: 74, priority: "DEFENSIVE", summary: "Crowding and liquidity stress placeholder." },
  { id: "rwa", label: "RWA", type: "SECTOR", orbit: "MIDDLE", x: 62, y: 64, z: 61, radius: 11, gravity: 64, heat: 58, pulse: 52, priority: "WATCH", summary: "RWA sector watch placeholder." },
  { id: "gaming", label: "GAMING", type: "SECTOR", orbit: "OUTER", x: 28, y: 64, z: 48, radius: 10, gravity: 45, heat: 49, pulse: 42, priority: "WATCH", summary: "Gaming beta orbit placeholder." },
]

const fallbackLinks: NarrativeUniverseLink[] = [
  { id: "core-ai", from: "core", to: "ai", strength: 84, latency: 12, contagion: 76, summary: "Core gravity pulling AI narrative." },
  { id: "ai-meme", from: "ai", to: "meme", strength: 69, latency: 18, contagion: 82, summary: "AI beta spilling into meme risk." },
  { id: "core-rwa", from: "core", to: "rwa", strength: 58, latency: 24, contagion: 46, summary: "Core market regime watching RWA." },
  { id: "rwa-gaming", from: "rwa", to: "gaming", strength: 42, latency: 31, contagion: 38, summary: "Peripheral sector link." },
]

function nodeColor(node: NarrativeUniverseNode) {
  if (node.type === "CORE") return "border-cyan-200 bg-cyan-300/25 shadow-[0_0_42px_rgba(103,232,249,0.72)]"
  if (node.type === "RISK") return "border-red-200 bg-red-400/25 shadow-[0_0_36px_rgba(248,113,113,0.48)]"
  if (node.priority === "ACTIONABLE") return "border-emerald-200 bg-emerald-400/25 shadow-[0_0_36px_rgba(52,211,153,0.48)]"
  if (node.priority === "WATCH") return "border-amber-200 bg-amber-400/25 shadow-[0_0_28px_rgba(251,191,36,0.36)]"
  return "border-violet-200 bg-violet-400/20 shadow-[0_0_24px_rgba(167,139,250,0.28)]"
}

function UniverseLink({ link, nodes }: { link: NarrativeUniverseLink; nodes: NarrativeUniverseNode[] }) {
  const from = nodes.find((node) => node.id === link.from)
  const to = nodes.find((node) => node.id === link.to)
  if (!from || !to) return null
  const x1 = from.x
  const y1 = from.y
  const x2 = to.x
  const y2 = to.y
  const dx = x2 - x1
  const dy = y2 - y1
  const length = Math.sqrt(dx * dx + dy * dy)
  const angle = Math.atan2(dy, dx) * 180 / Math.PI
  return (
    <div
      className="qt-link absolute left-0 top-0 h-px origin-left rounded-full bg-gradient-to-r from-cyan-200/0 via-cyan-200/70 to-emerald-200/0"
      style={{
        width: `${length}%`,
        transform: `translate(${x1}%, ${y1}%) rotate(${angle}deg)`,
        opacity: Math.max(0.22, Math.min(0.72, link.strength / 115)),
        animationDelay: `${link.latency / 18}s`,
      }}
      title={link.summary}
    />
  )
}

function UniverseNode({ node, index }: { node: NarrativeUniverseNode; index: number }) {
  return (
    <div
      className={`qt-node absolute rounded-full border backdrop-blur ${nodeColor(node)}`}
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `${node.radius * 2}px`,
        height: `${node.radius * 2}px`,
        transform: `translate(-50%, -50%) scale(${1 + node.z / 720})`,
        animationDelay: `${index * 0.22}s`,
      }}
      title={node.summary}
    >
      <div className="absolute inset-[-7px] rounded-full border border-current opacity-20" />
      <div className="absolute inset-[-15px] rounded-full border border-current opacity-10" />
      <div className="absolute left-1/2 top-full mt-2 w-32 -translate-x-1/2 truncate text-center text-[9px] font-black uppercase tracking-[0.16em] text-zinc-200 drop-shadow">
        {node.label}
      </div>
    </div>
  )
}

function ParticleField() {
  return (
    <>
      {Array.from({ length: 26 }).map((_, index) => (
        <span
          key={index}
          className="qt-particle absolute h-1 w-1 rounded-full bg-cyan-200/45"
          style={{
            left: `${8 + ((index * 37) % 84)}%`,
            top: `${10 + ((index * 53) % 78)}%`,
            animationDelay: `${index * 0.29}s`,
            animationDuration: `${3.8 + (index % 5) * 0.7}s`,
          }}
        />
      ))}
    </>
  )
}

function NarrativeUniverse({ nodes, links }: { nodes: NarrativeUniverseNode[]; links: NarrativeUniverseLink[] }) {
  return (
    <div className="relative h-[520px] overflow-hidden rounded-[2rem] border border-cyan-400/20 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.20),rgba(12,12,18,0.88)_42%,rgba(0,0,0,1)_100%)] shadow-[inset_0_0_80px_rgba(34,211,238,0.10)]">
      <div className="qt-scan absolute inset-0 opacity-25" />
      <ParticleField />
      <div className="qt-radar absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10" />
      <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/20" />
      <div className="absolute left-1/2 top-1/2 h-60 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/15" />
      <div className="absolute left-1/2 top-1/2 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-violet-300/15" />
      <div className="absolute left-1/2 top-1/2 h-[27rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/10" />
      {links.slice(0, 22).map((link) => <UniverseLink key={link.id} link={link} nodes={nodes} />)}
      {nodes.map((node, index) => <UniverseNode key={node.id} node={node} index={index} />)}
      <div className="absolute left-6 top-6 rounded-2xl border border-cyan-400/20 bg-black/55 p-4 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-cyan-200"><Orbit className="h-3.5 w-3.5" /> Narrative Universe</div>
        <div className="mt-2 text-3xl font-black text-white">LIVE ORBIT</div>
        <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">Phase 46A · gravity / contagion / pulse</div>
      </div>
      <div className="absolute bottom-5 right-5 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.14em] text-zinc-500">
        <div className="rounded-xl border border-zinc-800 bg-black/55 p-2"><div className="text-cyan-200">{nodes.length}</div><div>nodes</div></div>
        <div className="rounded-xl border border-zinc-800 bg-black/55 p-2"><div className="text-emerald-200">{links.length}</div><div>links</div></div>
        <div className="rounded-xl border border-zinc-800 bg-black/55 p-2"><div className="text-amber-200">pulse</div><div>active</div></div>
      </div>
    </div>
  )
}

function BriefCard({ item, index }: { item: LiveOperatorBrief; index: number }) {
  return (
    <div className="qt-brief rounded-2xl border border-zinc-800 bg-black/45 p-3 backdrop-blur" style={{ animationDelay: `${index * 0.12}s` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-black uppercase text-zinc-100">{item.title}</div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">ttl {item.ttlSeconds}s · {new Date(item.timestamp).toLocaleTimeString()}</div>
        </div>
        <Pill value={item.severity}>{item.severity}</Pill>
      </div>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{item.read}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {item.evidence.slice(0, 3).map((evidence) => <span key={evidence} className="rounded-full bg-zinc-900 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-zinc-500">{evidence}</span>)}
      </div>
    </div>
  )
}

function HuntCard({ item, index }: { item: AutonomousHuntSignal; index: number }) {
  return (
    <div className="qt-brief rounded-2xl border border-zinc-800 bg-black/45 p-3 backdrop-blur" style={{ animationDelay: `${index * 0.14}s` }}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-xs font-black uppercase text-zinc-100">{item.label}</div>
            <Pill value={item.class}>{item.class}</Pill>
          </div>
          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-zinc-500">{item.target} · {item.action}</div>
        </div>
        <div className="text-right text-sm font-black text-emerald-200">{metric(item.score)}</div>
      </div>
      <div className="mt-3"><Bar value={item.score} /></div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.12em] text-zinc-500">
        <div>Anom <span className="text-zinc-200">{metric(item.anomalyScore)}</span></div>
        <div>Stealth <span className="text-zinc-200">{metric(item.stealthScore)}</span></div>
        <div>Confirm <span className="text-zinc-200">{metric(item.confirmationScore)}</span></div>
      </div>
    </div>
  )
}

function fallbackBriefs(): LiveOperatorBrief[] {
  const now = new Date().toISOString()
  return [
    { id: "demo-brief-1", timestamp: now, severity: "ACTION", priority: "ACTIONABLE", title: "AI narrative acceleration detected", read: "Narrative velocity is clustering around high-beta AI and adjacent gaming flows.", evidence: ["velocity 76", "confidence 71", "persistence 68"], ttlSeconds: 180 },
    { id: "demo-brief-2", timestamp: now, severity: "RISK", priority: "DEFENSIVE", title: "Meme crowding risk rising", read: "Crowding pressure is high while liquidity quality is fading around speculative beta.", evidence: ["crowding 82", "stress 74", "quality 39"], ttlSeconds: 140 },
    { id: "demo-brief-3", timestamp: now, severity: "WATCH", priority: "WATCH", title: "RWA orbit entering middle band", read: "RWA signals are persistent but still waiting for stronger flow confirmation.", evidence: ["persistence 61", "flow 44", "watch"], ttlSeconds: 120 },
  ]
}

function fallbackHunts(): AutonomousHuntSignal[] {
  return [
    { id: "demo-hunt-1", class: "ROTATION", label: "Hidden AI to Gaming rotation", target: "SECTOR", score: 78, anomalyScore: 74, stealthScore: 62, confirmationScore: 81, priority: "ACTIONABLE", action: "INVESTIGATE", read: "Gaming beta is reacting to AI narrative persistence before broad confirmation." },
    { id: "demo-hunt-2", class: "FRACTURE", label: "Meme liquidity fracture watch", target: "RISK", score: 73, anomalyScore: 80, stealthScore: 55, confirmationScore: 70, priority: "DEFENSIVE", action: "ESCALATE", read: "Meme risk has high anomaly and defensive signal weight." },
    { id: "demo-hunt-3", class: "DIVERGENCE", label: "RWA flow/news divergence", target: "NARRATIVE", score: 58, anomalyScore: 52, stealthScore: 66, confirmationScore: 55, priority: "WATCH", action: "MONITOR", read: "News persistence is ahead of liquidity confirmation." },
  ]
}

export default function Phase46_48WarRoomIntelligenceLayer() {
  const { data, error, loading } = useWarRoomIntelligenceLayer()
  const nodes = data?.universe.nodes.length ? data.universe.nodes : fallbackNodes
  const links = data?.universe.links.length ? data.universe.links : fallbackLinks
  const briefs = data?.liveOperator.briefs.length ? data.liveOperator.briefs : fallbackBriefs()
  const hunts = data?.signalHunter.activeHunts.length ? data.signalHunter.activeHunts : fallbackHunts()
  const status = data?.liveOperator.status ?? (loading ? "WARMING" : "LIVE")

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-cyan-500/25 bg-zinc-950/95 p-5 shadow-[0_0_90px_rgba(34,211,238,0.10)]">
      <style jsx>{`
        .qt-scan { background: repeating-linear-gradient(to bottom, rgba(34,211,238,.10), rgba(34,211,238,.10) 1px, transparent 1px, transparent 7px); animation: scan 7s linear infinite; }
        .qt-radar::after { content: ""; position: absolute; inset: 50% 50% auto auto; width: 50%; height: 1px; transform-origin: left center; background: linear-gradient(90deg, rgba(34,211,238,.8), transparent); animation: sweep 5s linear infinite; }
        .qt-node { animation: floatNode 4.4s ease-in-out infinite; }
        .qt-link { animation: linkPulse 2.6s ease-in-out infinite; }
        .qt-particle { animation: particleDrift 5s ease-in-out infinite; }
        .qt-brief { animation: briefIn .55s ease-out both; }
        @keyframes scan { from { transform: translateY(-18px); } to { transform: translateY(18px); } }
        @keyframes sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes floatNode { 0%,100% { margin-top: 0; filter: brightness(1); } 50% { margin-top: -8px; filter: brightness(1.22); } }
        @keyframes linkPulse { 0%,100% { filter: brightness(.85); } 50% { filter: brightness(1.7); } }
        @keyframes particleDrift { 0%,100% { transform: translate3d(0,0,0); opacity: .2; } 50% { transform: translate3d(18px,-16px,0); opacity: .75; } }
        @keyframes briefIn { from { transform: translateY(10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(34,211,238,0.13),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(52,211,153,0.10),transparent_28%),radial-gradient(circle_at_70%_85%,rgba(168,85,247,0.10),transparent_30%)]" />
      <div className="relative z-10 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.36em] text-cyan-300/80"><Sparkles className="h-3.5 w-3.5" /> Phase 46A-48A Visual Impact Pack</div>
          <h2 className="mt-2 text-3xl font-black uppercase tracking-tight text-white md:text-4xl">War Room Visual Layer</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
            Cinematic narrative universe, live AI operator overlay, and autonomous hunter UI. This section includes demo fallback visuals so the war-room remains visible even before live signals arrive.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill value={status}>{status}</Pill>
          <Pill value={data?.mode ?? "derived"}>{data?.mode ?? "visual"}</Pill>
          <Pill value="CORE">VISUAL</Pill>
        </div>
      </div>

      {error ? <div className="relative z-10 mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">API fallback active: {error}</div> : null}

      <div className="relative z-10 mt-5 grid gap-4 2xl:grid-cols-[1.28fr_0.72fr]">
        <div className="rounded-[2rem] border border-zinc-800 bg-zinc-950/75 p-4 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500"><Radar className="h-3.5 w-3.5" /> Phase 46A</div>
              <div className="mt-1 text-sm font-black uppercase text-zinc-100">3D Narrative Universe Visual</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-right text-[10px] uppercase tracking-[0.12em] text-zinc-500">
              <div>Gravity <span className="ml-1 text-cyan-200">{metric(data?.universe.gravityScore ?? 82)}</span></div>
              <div>Contagion <span className="ml-1 text-cyan-200">{metric(data?.universe.contagionScore ?? 67)}</span></div>
            </div>
          </div>
          <NarrativeUniverse nodes={nodes} links={links} />
          <p className="mt-3 text-xs leading-5 text-zinc-500">{data?.universe.orbitRead ?? "Demo universe active: replace fallback with live ranked signals from the institutional layer."}</p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[2rem] border border-cyan-400/20 bg-black/50 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500"><RadioTower className="h-3.5 w-3.5" /> Phase 47A</div>
                <div className="mt-1 text-sm font-black uppercase text-zinc-100">AI Operator Live Overlay</div>
              </div>
              <div className="text-right text-2xl font-black text-cyan-200">{metric(data?.liveOperator.urgencyScore ?? 76)}</div>
            </div>
            <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-200"><Satellite className="h-3.5 w-3.5" /> LIVE BRIEFING</div>
              <p className="mt-3 text-sm font-semibold leading-6 text-zinc-100">{data?.liveOperator.headline ?? briefs[0]?.title}</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.liveOperator.operatorRead ?? "Operator overlay is running on fallback briefing mode."}</p>
            </div>
            <div className="mt-4 space-y-2">
              {briefs.slice(0, 4).map((item, index) => <BriefCard key={item.id} item={item} index={index} />)}
            </div>
          </div>

          <div className="rounded-[2rem] border border-emerald-400/20 bg-black/50 p-4 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500"><Crosshair className="h-3.5 w-3.5" /> Phase 48A</div>
                <div className="mt-1 text-sm font-black uppercase text-zinc-100">Autonomous Signal Hunter UI</div>
              </div>
              <div className="text-right text-2xl font-black text-emerald-200">{metric(data?.signalHunter.huntScore ?? 70)}</div>
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">{data?.signalHunter.operatorRead ?? "Hunter UI is using demo anomaly/rotation/fracture cards until live signals arrive."}</p>
            <div className="mt-4 space-y-2">
              {hunts.slice(0, 4).map((item, index) => <HuntCard key={item.id} item={item} index={index} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500"><Activity className="h-3.5 w-3.5" /> Speech Queue</div>
          <div className="mt-3 space-y-2">
            {(data?.liveOperator.speechQueue.length ? data.liveOperator.speechQueue : briefs.map((brief) => `${brief.title}. ${brief.read}`)).slice(0, 3).map((line, index) => <div key={`${line}-${index}`} className="line-clamp-2 text-xs leading-5 text-zinc-400">{line}</div>)}
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500"><Zap className="h-3.5 w-3.5" /> Tactical Matrix</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-400">
            <div>Signals <span className="font-black text-zinc-100">{metric(data?.inputs.rankedSignals ?? hunts.length)}</span></div>
            <div>Sectors <span className="font-black text-zinc-100">{metric(data?.inputs.sectors ?? nodes.length)}</span></div>
            <div>Hunts <span className="font-black text-emerald-200">{hunts.length}</span></div>
            <div>Briefs <span className="font-black text-cyan-200">{briefs.length}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500"><ShieldAlert className="h-3.5 w-3.5" /> Threat Radar</div>
          <div className="mt-3 space-y-2 text-xs text-zinc-400">
            <div>Risk nodes <span className="font-black text-red-200">{nodes.filter((node) => node.type === "RISK" || node.priority === "DEFENSIVE").length}</span></div>
            <Bar value={Math.max(25, Math.min(100, (data?.liveOperator.urgencyScore ?? 76)))} />
          </div>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-black/45 p-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">Notes</div>
          <div className="mt-3 line-clamp-4 text-xs leading-5 text-zinc-400">{(data?.notes.length ? data.notes : ["Phase 46A-48A visual pack installed", "Fallback cinematic mode active", "Connect institutional layer for live data"]).join(" · ")}</div>
        </div>
      </div>
    </section>
  )
}
