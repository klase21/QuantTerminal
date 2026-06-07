import type { SignalQualityItem } from "@/core/signal-quality/signalQualityTypes"

export interface SignalInboxItem extends SignalQualityItem {
  title: string
  subtitle: string
  priority: "P1" | "P2" | "P3"
  savedView: string
}

export interface SavedTerminalView {
  id: string
  label: string
  description: string
  focus: string[]
  active: boolean
}

export interface WatchlistMode {
  label: string
  sectors: string[]
  matchCount: number
  status: "ACTIVE" | "QUIET" | "MIXED"
}

export interface ProductizationSurface {
  signalInbox: SignalInboxItem[]
  savedViews: SavedTerminalView[]
  watchlists: WatchlistMode[]
  settingsHint: {
    alertThreshold: number
    cooldownMinutes: number
    preferredSectors: string[]
  }
}
