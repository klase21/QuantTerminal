import type { SectorRotationSnapshot } from "@/core/marketDataTypes"
import { clamp } from "@/core/shared/metrics"
import type { NewsFusionSurface } from "@/core/narrative/narrativeTypes"
import type { GeoDiffusionState, GeoNarrativeRegion, GeoNarrativeState, GeoNarrativeSurface } from "./geoNarrativeTypes"

function metric(value: number | undefined, digits = 0) {
  if (!Number.isFinite(value)) return "--"
  return Number(value).toFixed(digits)
}

function regionCount(newsFusion: NewsFusionSurface | undefined, region: string) {
  return newsFusion?.regionalBuzz.find((item) => item.region.toLowerCase() === region.toLowerCase())?.count ?? 0
}

function regionTags(newsFusion: NewsFusionSurface | undefined, region: string) {
  return newsFusion?.regionalBuzz.find((item) => item.region.toLowerCase() === region.toLowerCase())?.topNarratives ?? []
}

function topSector(sectors: SectorRotationSnapshot[]) {
  return sectors[0]
}

function topForKorea(sectors: SectorRotationSnapshot[]) {
  return [...sectors].sort((a, b) => (b.premiumBoost + b.volumePressure * 0.55) - (a.premiumBoost + a.volumePressure * 0.55))[0]
}

function inferRegionState(args: {
  region: "US" | "KR" | "CN" | "GLOBAL"
  intensity: number
  leadNarrative: string
  koreaPremium?: number
  globalVolume?: number
}): GeoNarrativeState {
  const { region, intensity, koreaPremium = 0, globalVolume = 0 } = args
  if (intensity < 18) return "Quiet"
  if (region === "KR" && koreaPremium >= 58) return "Retail Speculation"
  if (region === "CN") return intensity >= 35 ? "Policy Watch" : "Quiet"
  if (region === "US") return intensity >= 34 ? "Institutional" : "Quiet"
  if (globalVolume >= 62) return "Global Liquidity"
  return intensity >= 45 ? "Global Liquidity" : "Quiet"
}

function buildRegion(args: {
  region: "US" | "KR" | "CN" | "GLOBAL"
  label: string
  leadNarrative: string
  intensity: number
  confidence: number
  state: GeoNarrativeState
}): GeoNarrativeRegion {
  const { region, label, leadNarrative, intensity, confidence, state } = args
  const description = state === "Retail Speculation"
    ? `${label} is reacting like a fast retail overlay around ${leadNarrative}.`
    : state === "Institutional"
      ? `${label} framing looks more institutional or macro-oriented around ${leadNarrative}.`
      : state === "Policy Watch"
        ? `${label} is best treated as a policy or offshore narrative proxy around ${leadNarrative}.`
        : state === "Global Liquidity"
          ? `${label} liquidity is leading the narrative pressure in ${leadNarrative}.`
          : `${label} has no dominant regional narrative yet.`

  return {
    region,
    label,
    state,
    leadNarrative,
    intensity: clamp(intensity),
    confidence: clamp(confidence),
    description,
  }
}

function diffusionLabel(diffusion: GeoDiffusionState) {
  switch (diffusion) {
    case "US_TO_KR":
      return "US → KR"
    case "KR_TO_GLOBAL":
      return "KR → Global"
    case "GLOBAL_SYNC":
      return "Global Sync"
    case "KOREA_OVERHEAT":
      return "Korea Overheat"
    case "GLOBAL_LEADS":
      return "Global Leads"
    default:
      return "No Clear Flow"
  }
}

export function deriveGeoNarrativeSurface(
  sectors: SectorRotationSnapshot[],
  newsFusion?: NewsFusionSurface
): GeoNarrativeSurface {
  const lead = topSector(sectors)
  const koreaLead = topForKorea(sectors)
  const usNews = regionCount(newsFusion, "en")
  const krNews = regionCount(newsFusion, "kr")
  const cnNews = regionCount(newsFusion, "cn")
  const usTags = regionTags(newsFusion, "en")
  const krTags = regionTags(newsFusion, "kr")
  const cnTags = regionTags(newsFusion, "cn")

  if (!lead) {
    return {
      ok: false,
      leadRegion: "NONE",
      diffusion: "NO_CLEAR_FLOW",
      diffusionLabel: diffusionLabel("NO_CLEAR_FLOW"),
      summary: "Geo narrative layer is waiting for live market and news inputs.",
      regions: [],
      divergenceScore: 0,
      operatorNote: "Keep this compressed until a regional leader emerges.",
    }
  }

  const globalIntensity = clamp(lead.volumePressure * 0.40 + lead.rotationScore * 0.35 + lead.confidence * 0.25)
  const koreaIntensity = clamp((koreaLead?.premiumBoost ?? 0) * 0.42 + (koreaLead?.volumePressure ?? 0) * 0.26 + krNews * 2.1 + (koreaLead?.breadth ?? 0) * 0.16)
  const usIntensity = clamp(lead.volumePressure * 0.28 + lead.confidence * 0.22 + usNews * 2.4 + (usTags.includes(lead.sector) ? 18 : 0))
  const cnIntensity = clamp(cnNews * 3.0 + (cnTags.includes(lead.sector) ? 22 : 0) + lead.volatility * 0.15)

  const regions = [
    buildRegion({
      region: "GLOBAL",
      label: "Global",
      leadNarrative: lead.sector,
      intensity: globalIntensity,
      confidence: lead.confidence,
      state: inferRegionState({ region: "GLOBAL", intensity: globalIntensity, leadNarrative: lead.sector, globalVolume: lead.volumePressure }),
    }),
    buildRegion({
      region: "KR",
      label: "Korea",
      leadNarrative: koreaLead?.sector ?? lead.sector,
      intensity: koreaIntensity,
      confidence: koreaLead?.confidence ?? lead.confidence,
      state: inferRegionState({ region: "KR", intensity: koreaIntensity, leadNarrative: koreaLead?.sector ?? lead.sector, koreaPremium: koreaLead?.premiumBoost ?? 0 }),
    }),
    buildRegion({
      region: "US",
      label: "US / English CT",
      leadNarrative: usTags[0] ?? lead.sector,
      intensity: usIntensity,
      confidence: clamp(lead.confidence * 0.72 + usNews * 2.2),
      state: inferRegionState({ region: "US", intensity: usIntensity, leadNarrative: usTags[0] ?? lead.sector }),
    }),
    buildRegion({
      region: "CN",
      label: "China / CN Feed",
      leadNarrative: cnTags[0] ?? lead.sector,
      intensity: cnIntensity,
      confidence: clamp(lead.confidence * 0.45 + cnNews * 3.2),
      state: inferRegionState({ region: "CN", intensity: cnIntensity, leadNarrative: cnTags[0] ?? lead.sector }),
    }),
  ].sort((a, b) => b.intensity - a.intensity)

  const max = regions[0]
  const second = regions[1]
  const divergenceScore = clamp(Math.abs(max.intensity - second.intensity) + Math.max(0, koreaIntensity - globalIntensity) * 0.35)

  let diffusion: GeoDiffusionState = "NO_CLEAR_FLOW"
  if (globalIntensity >= 62 && koreaIntensity >= 58 && usIntensity >= 40) diffusion = "GLOBAL_SYNC"
  else if (koreaIntensity >= 72 && globalIntensity < 58) diffusion = "KOREA_OVERHEAT"
  else if (usIntensity >= 55 && koreaIntensity >= 45) diffusion = "US_TO_KR"
  else if (koreaIntensity >= 60 && globalIntensity >= 55) diffusion = "KR_TO_GLOBAL"
  else if (globalIntensity >= 65) diffusion = "GLOBAL_LEADS"

  const summary = diffusion === "GLOBAL_SYNC"
    ? `${lead.sector} is synchronized across global liquidity and regional news layers.`
    : diffusion === "KOREA_OVERHEAT"
      ? `${koreaLead?.sector ?? lead.sector} is running hotter in Korea than global liquidity confirmation.`
      : diffusion === "US_TO_KR"
        ? `${lead.sector} appears to be propagating from English/global attention into Korea.`
        : diffusion === "KR_TO_GLOBAL"
          ? `${koreaLead?.sector ?? lead.sector} is showing a Korea-led impulse with global follow-through forming.`
          : diffusion === "GLOBAL_LEADS"
            ? `${lead.sector} is led by global liquidity; regional confirmation is still secondary.`
            : "No clear regional propagation path is confirmed yet."

  const operatorNote = diffusion === "KOREA_OVERHEAT"
    ? "Treat Korea-led heat as fast retail risk unless breadth and global liquidity confirm."
    : diffusion === "GLOBAL_SYNC"
      ? "Global synchronization raises conviction, but also watch for crowding if funding or volatility expands."
      : diffusion === "US_TO_KR" || diffusion === "KR_TO_GLOBAL"
        ? "Propagation is active; watch whether the next region confirms or rejects the move."
        : "Keep regional signals compressed until one region clearly leads."

  return {
    ok: true,
    leadRegion: max.region,
    diffusion,
    diffusionLabel: diffusionLabel(diffusion),
    summary,
    regions,
    divergenceScore,
    operatorNote,
  }
}
