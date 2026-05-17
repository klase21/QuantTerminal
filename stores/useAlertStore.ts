// ======================================================
// stores/useAlertStore.ts
// ======================================================

"use client"

import { create } from "zustand"

import type {
  AlertItem,
} from "@/types/alert"

interface AlertStore {

  alerts: AlertItem[]

  soundEnabled: boolean

  addAlert:
    (alert: AlertItem) => void

  removeAlert:
    (id: string) => void

  toggleSound:
    () => void

}

export const useAlertStore =
  create<AlertStore>((set) => ({

    alerts: [],

    soundEnabled: true,

    addAlert: (alert) =>

      set((state) => ({

        alerts: [
          alert,
          ...state.alerts,
        ],

      })),

    removeAlert: (id) =>

      set((state) => ({

        alerts:
          state.alerts.filter(
            (a) => a.id !== id
          ),

      })),

    toggleSound: () =>

      set((state) => ({

        soundEnabled:
          !state.soundEnabled,

      })),

  }))