"use client"

import { create } from "zustand"

import {
  FALLBACK_TACTICAL_SNAPSHOT,
  sameTacticalSnapshot,
  type StableTacticalInputSnapshot,
} from "@/lib/tactical/stableTacticalInput"

type TacticalSnapshotStore = {
  snapshot: StableTacticalInputSnapshot
  setSnapshot: (snapshot: StableTacticalInputSnapshot) => void
  resetSnapshot: () => void
}

export const useTacticalSnapshotStore = create<TacticalSnapshotStore>((set, get) => ({
  snapshot: FALLBACK_TACTICAL_SNAPSHOT,
  setSnapshot: (snapshot) => {
    const prev = get().snapshot
    if (sameTacticalSnapshot(prev, snapshot)) return
    set({ snapshot })
  },
  resetSnapshot: () => set({ snapshot: FALLBACK_TACTICAL_SNAPSHOT }),
}))

export function getTacticalSnapshot() {
  return useTacticalSnapshotStore.getState().snapshot
}
