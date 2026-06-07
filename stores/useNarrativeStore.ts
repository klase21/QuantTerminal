// ======================================================
// PHASE 6 — AI NARRATIVE ENGINE
// stores/useNarrativeStore.ts
// ======================================================

"use client"

import { create } from "zustand"

export interface Narrative {
  sector: string
  score: number
  sentiment: string
}

export interface NarrativeHeatmapRow {
  narrative: string
  kr: number
  cn: number
  en: number
  total: number
  divergence: number
}

interface NarrativeState {
  narratives: Narrative[]
  heatmap: NarrativeHeatmapRow[]
  divergenceScore: number
  regionalLeaders: {
    kr: string
    cn: string
    en: string
  }

  setNarratives: (
    narratives: Narrative[]
  ) => void

  setNarrativeIntel: (payload: {
    heatmap?: NarrativeHeatmapRow[]
    divergenceScore?: number
    regionalLeaders?: {
      kr: string
      cn: string
      en: string
    }
  }) => void
}

export const useNarrativeStore =
  create<NarrativeState>((set) => ({
    narratives: [],
    heatmap: [],
    divergenceScore: 0,
    regionalLeaders: {
      kr: "None",
      cn: "None",
      en: "None",
    },

    setNarratives: (narratives) =>
      set({
        narratives,
      }),

    setNarrativeIntel: (payload) =>
      set((state) => ({
        heatmap:
          payload.heatmap ?? state.heatmap,
        divergenceScore:
          payload.divergenceScore ??
          state.divergenceScore,
        regionalLeaders:
          payload.regionalLeaders ??
          state.regionalLeaders,
      })),
  }))
