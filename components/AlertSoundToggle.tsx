"use client"

import { Volume2, VolumeX } from "lucide-react"

interface Props {
  enabled: boolean
  onToggle: () => void
}

export default function AlertSoundToggle({
  enabled,
  onToggle,
}: Props) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-800"
    >
      {enabled ? (
        <Volume2 className="h-4 w-4 text-green-400" />
      ) : (
        <VolumeX className="h-4 w-4 text-red-400" />
      )}

      <span>{enabled ? "Sound ON" : "Sound OFF"}</span>
    </button>
  )
}