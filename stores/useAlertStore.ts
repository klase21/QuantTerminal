// ======================================================
// stores/useAlertStore.ts
// ======================================================

import { create } from "zustand"

export interface AlertItem {

  id: string

  type: string

  message: string
  
  severity?: string

  timestamp: number

}

interface AlertStore {

  alerts: AlertItem[]

  soundEnabled: boolean

  setSoundEnabled: (enabled: boolean) => void

  addAlert: (alert: AlertItem) => void

  removeAlert: (id: string) => void

  clearAlerts: () => void

  toggleSound: () => void

}

export const useAlertStore =
  create<AlertStore>((set) => ({

    alerts: [],

    soundEnabled: true,

    setSoundEnabled: (
      enabled
    ) =>
      set({
        soundEnabled: enabled,
      }),

    addAlert: (alert) =>
      set((state) => ({

        alerts: [
          alert,
          ...state.alerts,
        ].slice(0, 50),

      })),

    removeAlert: (id) =>
      set((state) => ({

        alerts:
          state.alerts.filter(
            (a) => a.id !== id
          ),

      })),

    clearAlerts: () =>
      set({

        alerts: [],

      }),

    toggleSound: () =>
      set((state) => ({

        soundEnabled:
          !state.soundEnabled,

      })),

  }))