// ======================================================
// stores/useAlertRuleStore.ts
// ======================================================

"use client"

import { create } from "zustand"

import type {
  AlertRule,
} from "@/types/alert"

interface AlertRuleStore {

  rules: AlertRule[]

  addRule:
    (rule: AlertRule) => void

  removeRule:
    (id: string) => void

  toggleRule:
    (id: string) => void

  updateLastTriggered:
    (
      id: string,
      timestamp: number
    ) => void

}

export const useAlertRuleStore =
  create<AlertRuleStore>((set) => ({

    rules: [],

    addRule: (rule) =>

      set((state) => ({

        rules: [
          rule,
          ...state.rules,
        ],

      })),

    removeRule: (id) =>

      set((state) => ({

        rules:
          state.rules.filter(
            (r) => r.id !== id
          ),

      })),

    toggleRule: (id) =>

      set((state) => ({

        rules:
          state.rules.map((r) =>

            r.id === id
              ? {
                  ...r,
                  enabled:
                    !r.enabled,
                }
              : r

          ),

      })),

    updateLastTriggered: (
      id,
      timestamp
    ) =>

      set((state) => ({

        rules:
          state.rules.map((r) =>

            r.id === id
              ? {
                  ...r,
                  lastTriggered:
                    timestamp,
                }
              : r

          ),

      })),

  }))