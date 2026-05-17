"use client"

import AlertSoundToggle from "@/components/AlertSoundToggle"
import { useAlertStore } from "@/stores/useAlertStore"

export default function Topbar() {
  const soundEnabled = useAlertStore(
    (state) => state.soundEnabled
  )

	const toggleSound =
	  useAlertStore(
		(state) => state.toggleSound
	  )  

  return (
    <div className="flex items-center justify-between border-b border-zinc-800 bg-black px-4 py-3">
      <div className="text-sm font-semibold text-zinc-100">
        QuantTerminal
      </div>

      <div className="flex items-center gap-2">
        <AlertSoundToggle
          enabled={soundEnabled}
          onToggle={() =>
            toggleSound()
          }
        />
      </div>
    </div>
  )
}