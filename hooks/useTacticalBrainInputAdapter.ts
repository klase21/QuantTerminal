"use client"

import { useTacticalSnapshotStore } from "@/stores/useTacticalSnapshotStore"

export default function useTacticalBrainInputAdapter() {
  const snapshot = useTacticalSnapshotStore((state) => state.snapshot)

  return {
    brainInput: snapshot.input,
    macroInput: snapshot.macroInput,
    opportunityCandidates: snapshot.opportunityCandidates,
    freshness: snapshot.freshness,
    dataQuality: snapshot.dataQuality,
  }
}
