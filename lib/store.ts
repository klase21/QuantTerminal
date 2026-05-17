
import { create } from "zustand"

interface AppState {
  selectedAsset: string
  setSelectedAsset: (asset: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  selectedAsset: "BTC",
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),
}))
