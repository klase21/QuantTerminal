"use client"

import { create } from "zustand"

interface ChartWindow {
  id: string
  symbol: string
  timeframe: string
}

interface WorkspaceState {
  charts: ChartWindow[]

  addChart: (
    symbol: string,
    timeframe?: string
  ) => void

  removeChart: (
    id: string
  ) => void

  updateChart: (
    id: string,
    data: Partial<ChartWindow>
  ) => void
}

export const useWorkspaceStore =
  create<WorkspaceState>((set) => ({

    charts: [
      {
        id: "main",
        symbol: "btcusdt",
        timeframe: "1m",
      },
    ],

    addChart: (
      symbol,
      timeframe = "1m"
    ) =>
      set((state) => ({
        charts: [
          ...state.charts,
          {
            id: crypto.randomUUID(),
            symbol,
            timeframe,
          },
        ],
      })),

    removeChart: (id) =>
      set((state) => ({
        charts:
          state.charts.filter(
            (c) => c.id !== id
          ),
      })),

    updateChart: (
      id,
      data
    ) =>
      set((state) => ({
        charts:
          state.charts.map((chart) =>
            chart.id === id
              ? {
                  ...chart,
                  ...data,
                }
              : chart
          ),
      })),
  }))