export type SectorState = "ACCUMULATING" | "ACCELERATING" | "EXHAUSTED" | "DEFENSIVE" | "NEUTRAL"
export type ThreatSeverity = "LOW" | "MEDIUM" | "HIGH"

export interface TacticalSectorNode {
  id: string
  label: string
  x: number
  y: number
  dominance: number
  inflow: number
  pressure: number
  smartMoney: number
  narrativeTemp: number
  exhaustion: number
  state: SectorState
}

export interface RotationRoute {
  id: string
  from: string
  to: string
  strength: number
  acceleration: number
  confidence: number
  status: "ACTIVE" | "PREDICTED" | "FADING"
}

export interface LiquidityGravityZone {
  id: string
  label: string
  x: number
  y: number
  gravity: number
  side: "upside" | "downside" | "neutral"
  note: string
}

export interface MarketThreatOverlay {
  id: string
  label: string
  sector?: string
  severity: ThreatSeverity
  x: number
  y: number
  note: string
}

export interface TacticalMarketMapState {
  sectors: TacticalSectorNode[]
  routes: RotationRoute[]
  gravityZones: LiquidityGravityZone[]
  threats: MarketThreatOverlay[]
  radar: RotationRoute[]
  narrator: string
}

export function buildTacticalMarketMapState(): TacticalMarketMapState {
  const sectors: TacticalSectorNode[] = [
    {
      id: "AI",
      label: "AI",
      x: 23,
      y: 18,
      dominance: 82,
      inflow: 68,
      pressure: 74,
      smartMoney: 72,
      narrativeTemp: 88,
      exhaustion: 69,
      state: "EXHAUSTED",
    },
    {
      id: "RWA",
      label: "RWA",
      x: 50,
      y: 45,
      dominance: 67,
      inflow: 84,
      pressure: 79,
      smartMoney: 81,
      narrativeTemp: 73,
      exhaustion: 34,
      state: "ACCELERATING",
    },
    {
      id: "BTC",
      label: "BTC",
      x: 38,
      y: 73,
      dominance: 76,
      inflow: 61,
      pressure: 64,
      smartMoney: 77,
      narrativeTemp: 58,
      exhaustion: 42,
      state: "ACCUMULATING",
    },
    {
      id: "MEME",
      label: "MEME",
      x: 50,
      y: 18,
      dominance: 54,
      inflow: 41,
      pressure: 49,
      smartMoney: 38,
      narrativeTemp: 81,
      exhaustion: 78,
      state: "DEFENSIVE",
    },
    {
      id: "L2",
      label: "L2",
      x: 77,
      y: 18,
      dominance: 49,
      inflow: 45,
      pressure: 47,
      smartMoney: 53,
      narrativeTemp: 46,
      exhaustion: 39,
      state: "NEUTRAL",
    },
    {
      id: "STABLE",
      label: "STABLE",
      x: 62,
      y: 73,
      dominance: 44,
      inflow: 58,
      pressure: 62,
      smartMoney: 64,
      narrativeTemp: 31,
      exhaustion: 24,
      state: "ACCUMULATING",
    },
  ]

  const routes: RotationRoute[] = [
    {
      id: "AI-RWA",
      from: "AI",
      to: "RWA",
      strength: 84,
      acceleration: 18,
      confidence: 81,
      status: "ACTIVE",
    },
    {
      id: "MEME-BTC",
      from: "MEME",
      to: "BTC",
      strength: 63,
      acceleration: 9,
      confidence: 72,
      status: "PREDICTED",
    },
    {
      id: "L2-STABLE",
      from: "L2",
      to: "STABLE",
      strength: 52,
      acceleration: 4,
      confidence: 61,
      status: "FADING",
    },
  ]

  const gravityZones: LiquidityGravityZone[] = [
    {
      id: "upside-liq",
      label: "Upside Liquidity",
      x: 82,
      y: 38,
      gravity: 74,
      side: "upside",
      note: "Likely magnet if buy pressure reclaims the tape.",
    },
    {
      id: "downside-sweep",
      label: "Downside Sweep",
      x: 22,
      y: 88,
      gravity: 69,
      side: "downside",
      note: "Stop cluster can be swept before continuation.",
    },
  ]

  const threats: MarketThreatOverlay[] = [
    {
      id: "eth-weakness",
      label: "ETH/BTC Weakness",
      sector: "L2",
      severity: "HIGH",
      x: 82,
      y: 76,
      note: "Beta sectors may lag while ETH/BTC pressure persists.",
    },
    {
      id: "meme-exhaustion",
      label: "MEME Exhaustion",
      sector: "MEME",
      severity: "MEDIUM",
      x: 50,
      y: 25,
      note: "Narrative heat is high but smart money validation is weak.",
    },
    {
      id: "ai-overheat",
      label: "AI Overheat",
      sector: "AI",
      severity: "MEDIUM",
      x: 23,
      y: 25,
      note: "AI remains strong but saturation is rising.",
    },
  ]

  const narrator =
    "RWA is accelerating while AI shows late-stage heat. Rotation route AI → RWA remains the primary tactical map read. Liquidity is mixed: upside magnet exists, but downside sweep risk can invalidate early entries."

  return {
    sectors,
    routes,
    gravityZones,
    threats,
    radar: routes.slice().sort((a, b) => b.confidence - a.confidence),
    narrator,
  }
}

export function getNodeById(state: TacticalMarketMapState, id: string) {
  return state.sectors.find((sector) => sector.id === id)
}
