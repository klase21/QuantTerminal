"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

export type TacticalWorkspacePreset =
  | "SCALP"
  | "SWING"
  | "RISK_OFF"
  | "AI_ROTATION"
  | "CUSTOM"

export type TacticalFocusTarget =
  | "NONE"
  | "BTC"
  | "ETH"
  | "AI"
  | "RWA"
  | "MEME"
  | "L2"
  | "STABLE"

export type AdvancedFlowSectionId =
  | "decision"
  | "playbook"
  | "inspector"
  | "copilot"
  | "scenario"
  | "predictive"
  | "adaptive"

export interface TacticalWorkspaceState {
  preset: TacticalWorkspacePreset
  focusTarget: TacticalFocusTarget
  flowAdvanced: boolean
  advancedPreset: "trading" | "analysis" | "full"
  openAdvancedSections: AdvancedFlowSectionId[]
  attentionMode: boolean
  hotkeysEnabled: boolean

  setPreset: (preset: TacticalWorkspacePreset) => void
  setFocusTarget: (target: TacticalFocusTarget) => void
  setFlowAdvanced: (value: boolean) => void
  setAdvancedPreset: (preset: "trading" | "analysis" | "full") => void
  toggleAdvancedSection: (section: AdvancedFlowSectionId) => void
  setOpenAdvancedSections: (sections: AdvancedFlowSectionId[]) => void
  setAttentionMode: (value: boolean) => void
  setHotkeysEnabled: (value: boolean) => void
  resetWorkspace: () => void
}

export const presetSections: Record<TacticalWorkspacePreset, AdvancedFlowSectionId[]> = {
  SCALP: ["decision", "playbook", "inspector"],
  SWING: ["copilot", "scenario", "predictive"],
  RISK_OFF: ["decision", "inspector", "scenario"],
  AI_ROTATION: ["copilot", "scenario", "adaptive", "predictive"],
  CUSTOM: ["decision", "playbook", "inspector"],
}

const defaultState = {
  preset: "SCALP" as TacticalWorkspacePreset,
  focusTarget: "NONE" as TacticalFocusTarget,
  flowAdvanced: false,
  advancedPreset: "trading" as const,
  openAdvancedSections: ["decision", "playbook"] as AdvancedFlowSectionId[],
  attentionMode: true,
  hotkeysEnabled: true,
}

export const useTacticalWorkspaceStore = create<TacticalWorkspaceState>()(
  persist(
    (set, get) => ({
      ...defaultState,

      setPreset: (preset) =>
        set({
          preset,
          openAdvancedSections: presetSections[preset],
          advancedPreset:
            preset === "SWING" || preset === "AI_ROTATION"
              ? "analysis"
              : preset === "CUSTOM"
                ? get().advancedPreset
                : "trading",
        }),

      setFocusTarget: (focusTarget) => set({ focusTarget }),
      setFlowAdvanced: (flowAdvanced) => set({ flowAdvanced }),
      setAdvancedPreset: (advancedPreset) => set({ advancedPreset }),
      setAttentionMode: (attentionMode) => set({ attentionMode }),
      setHotkeysEnabled: (hotkeysEnabled) => set({ hotkeysEnabled }),

      toggleAdvancedSection: (section) => {
        const current = get().openAdvancedSections
        const exists = current.includes(section)
        set({
          preset: "CUSTOM",
          openAdvancedSections: exists
            ? current.filter((item) => item !== section)
            : [...current, section],
        })
      },

      setOpenAdvancedSections: (openAdvancedSections) =>
        set({
          preset: "CUSTOM",
          openAdvancedSections,
        }),

      resetWorkspace: () => set(defaultState),
    }),
    {
      name: "quantterminal-tactical-workspace-os",
      partialize: (state) => ({
        preset: state.preset,
        focusTarget: state.focusTarget,
        flowAdvanced: state.flowAdvanced,
        advancedPreset: state.advancedPreset,
        openAdvancedSections: state.openAdvancedSections,
        attentionMode: state.attentionMode,
        hotkeysEnabled: state.hotkeysEnabled,
      }),
    },
  ),
)
