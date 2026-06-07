import type { InstitutionalIntelligenceSurface, RankedSignal } from "@/core/institutional-intelligence/institutionalTypes"
import type { OperatorPriority } from "@/core/ai-intelligence/aiIntelligenceTypes"

export type WarRoomSource = "phase-46-48-war-room-intelligence-layer"
export type WarRoomMode = "derived" | "empty"
export type UniverseNodeType = "CORE" | "SECTOR" | "NARRATIVE" | "RISK" | "SIGNAL"
export type OrbitBand = "INNER" | "MIDDLE" | "OUTER" | "ESCAPE"
export type LiveBriefSeverity = "INFO" | "WATCH" | "ACTION" | "RISK"
export type HunterClass = "ANOMALY" | "DIVERGENCE" | "ROTATION" | "FRACTURE" | "OPPORTUNITY"

export interface NarrativeUniverseNode {
  id: string
  label: string
  type: UniverseNodeType
  orbit: OrbitBand
  x: number
  y: number
  z: number
  radius: number
  gravity: number
  heat: number
  pulse: number
  priority: OperatorPriority
  summary: string
}

export interface NarrativeUniverseLink {
  id: string
  from: string
  to: string
  strength: number
  latency: number
  contagion: number
  summary: string
}

export interface NarrativeUniverseSurface {
  ok: boolean
  leadNode?: NarrativeUniverseNode
  nodes: NarrativeUniverseNode[]
  links: NarrativeUniverseLink[]
  gravityScore: number
  contagionScore: number
  orbitRead: string
}

export interface LiveOperatorBrief {
  id: string
  timestamp: string
  severity: LiveBriefSeverity
  priority: OperatorPriority
  title: string
  read: string
  evidence: string[]
  ttlSeconds: number
}

export interface AIOperatorLiveSurface {
  ok: boolean
  status: "LIVE" | "WARMING" | "IDLE"
  headline: string
  briefs: LiveOperatorBrief[]
  speechQueue: string[]
  urgencyScore: number
  operatorRead: string
}

export interface AutonomousHuntSignal {
  id: string
  class: HunterClass
  sourceSignal?: RankedSignal
  label: string
  target: string
  score: number
  anomalyScore: number
  stealthScore: number
  confirmationScore: number
  priority: OperatorPriority
  action: "MONITOR" | "INVESTIGATE" | "ESCALATE" | "IGNORE"
  read: string
}

export interface AutonomousSignalHunterSurface {
  ok: boolean
  activeHunts: AutonomousHuntSignal[]
  huntScore: number
  topHunt?: AutonomousHuntSignal
  operatorRead: string
}

export interface WarRoomIntelligenceSurface {
  ok: boolean
  source: WarRoomSource
  updatedAt: string
  mode: WarRoomMode
  universe: NarrativeUniverseSurface
  liveOperator: AIOperatorLiveSurface
  signalHunter: AutonomousSignalHunterSurface
  inputs: {
    sectors: number
    rankedSignals: number
    sourceMode?: InstitutionalIntelligenceSurface["mode"]
  }
  notes: string[]
}
