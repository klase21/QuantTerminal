import type { NarrativeSurface } from "@/core/narrative/narrativeTypes"
import type { SignalQualityReport } from "@/core/signal-quality/signalQualityTypes"
import type { ProductizationSurface, SavedTerminalView, SignalInboxItem, WatchlistMode } from "./productizationTypes"

function priority(score: number): SignalInboxItem["priority"] {
  if (score >= 82) return "P1"
  if (score >= 68) return "P2"
  return "P3"
}

function savedViewForNarrative(narrative: string) {
  const key = narrative.toUpperCase()
  if (["AI", "MEME", "RWA", "GAMING"].includes(key)) return `${key} Narrative`
  if (["BTC", "ETH", "SOL"].includes(key)) return `${key} Market`
  return "Rotation Desk"
}

export function buildProductizationSurface(
  narrative: NarrativeSurface,
  quality: SignalQualityReport
): ProductizationSurface {
  const inboxSource = [...quality.promoted, ...quality.watch]
    .filter((item) => item.trustLabel !== "LOW_QUALITY" && item.falsePositiveRisk !== "HIGH")
    .slice(0, 6)
  const signalInbox: SignalInboxItem[] = inboxSource.map((item) => ({
    ...item,
    title: `${item.narrative} ${item.validationStatus}`,
    subtitle: item.operatorAction || item.reasons[0] || "Signal is waiting for additional confirmation.",
    priority: priority(item.qualityScore),
    savedView: savedViewForNarrative(item.narrative),
  }))

  const topNarratives = narrative.heatmap.slice(0, 6).map((item) => item.narrative)
  const savedViews: SavedTerminalView[] = [
    {
      id: "korea-retail",
      label: "Korea Retail",
      description: "Premium, Upbit flow, and Korea-led divergences.",
      focus: ["PREMIUM", "UPBIT", "KR"],
      active: narrative.regionalDivergence.status === "KOREA_STRONG" || narrative.regionalDivergence.status === "MIXED",
    },
    {
      id: "alt-rotation",
      label: "Alt Rotation",
      description: "Altseason, sector breadth, and liquidity leadership.",
      focus: ["ALT", "INFLOW", "BREADTH"],
      active: narrative.regime.includes("ALT") || topNarratives.some((item) => !["BTC", "ETH"].includes(item)),
    },
    {
      id: "ai-narrative",
      label: "AI Narrative",
      description: "AI heat, news validation, and flow confirmation.",
      focus: ["AI"],
      active: topNarratives.includes("AI"),
    },
    {
      id: "risk-off",
      label: "Risk-Off",
      description: "Outflow, stress, defensive rotation, and alert quality.",
      focus: ["OUTFLOW", "RISK_OFF", "BTC"],
      active: narrative.tone === "RISK_OFF",
    },
  ]

  const watchlists: WatchlistMode[] = [
    {
      label: "High Beta",
      sectors: ["MEME", "AI", "GAMING"],
      matchCount: topNarratives.filter((item) => ["MEME", "AI", "GAMING"].includes(item)).length,
      status: topNarratives.some((item) => ["MEME", "AI", "GAMING"].includes(item)) ? "ACTIVE" : "QUIET",
    },
    {
      label: "Institutional Themes",
      sectors: ["RWA", "DEFI", "INFRA"],
      matchCount: topNarratives.filter((item) => ["RWA", "DEFI", "INFRA"].includes(item)).length,
      status: topNarratives.some((item) => ["RWA", "DEFI", "INFRA"].includes(item)) ? "ACTIVE" : "QUIET",
    },
    {
      label: "Korea Retail",
      sectors: ["UPBIT", "PREMIUM", "MEME", "AI"],
      matchCount: narrative.regionalDivergence.sectors.length,
      status: narrative.regionalDivergence.status === "NONE" ? "QUIET" : narrative.regionalDivergence.status === "MIXED" ? "MIXED" : "ACTIVE",
    },
  ]

  return {
    signalInbox,
    savedViews,
    watchlists,
    settingsHint: {
      alertThreshold: 78,
      cooldownMinutes: 15,
      preferredSectors: topNarratives.slice(0, 4),
    },
  }
}
