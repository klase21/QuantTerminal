// ======================================================
// PHASE 6 — AI NARRATIVE ENGINE
// store/useNarrativeStore.ts
// ======================================================

"use client"

import { create } from "zustand"

interface Narrative {
  sector: string
  score: number
  sentiment: string
}

interface NarrativeState {
  narratives: Narrative[]

  setNarratives: (
    narratives: Narrative[]
  ) => void
}

export const useNarrativeStore =
  create<NarrativeState>((set) => ({
    narratives: [],

    setNarratives: (narratives) =>
      set({
        narratives,
      }),
  }))