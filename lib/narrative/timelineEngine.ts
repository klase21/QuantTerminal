
export interface NarrativeTimelineEvent {
  id: string
  timestamp: number
  narrative: string
  region: "kr" | "cn" | "en"
  type: "narrative_spike" | "whale_flow" | "sector_rotation"
  score: number
  description: string
}

export function buildTimeline(events: NarrativeTimelineEvent[]) {
  return events.sort((a,b)=>b.timestamp-a.timestamp)
}

export function summarizeReplay(events: NarrativeTimelineEvent[]) {
  return events.slice(0,20)
}
