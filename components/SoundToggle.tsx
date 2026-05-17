"use client"

import { Volume2, VolumeX } from "lucide-react"

import { Button } from "@/components/ui/button"

import { useAlertStore }
  from "@/stores/useAlertStore"

export default function SoundToggle() {

  const {
    soundEnabled,
    toggleSound,
  } = useAlertStore()

  return (

    <Button
      variant="outline"
      size="icon"
      onClick={toggleSound}
    >

      {soundEnabled ? (
        <Volume2 className="w-4 h-4" />
      ) : (
        <VolumeX className="w-4 h-4" />
      )}

    </Button>

  )

}