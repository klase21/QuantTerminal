
import { create } from "zustand"
import type { NarrativeTimelineEvent } from "@/lib/narrative/timelineEngine"

interface TimelineState {
  events: NarrativeTimelineEvent[]
  replayMode: boolean
  addEvent: (event: NarrativeTimelineEvent) => void
  toggleReplay: () => void
}

export const useTimelineStore = create<TimelineState>((set)=>({
  events: [],
  replayMode: false,
  addEvent: (event) =>
    set((state)=>({
      events:[event,...state.events].slice(0,500)
    })),
  toggleReplay: () =>
    set((state)=>({
      replayMode: !state.replayMode
    }))
}))
