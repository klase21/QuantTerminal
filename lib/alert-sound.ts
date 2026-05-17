import { AlertSound  } from "@/types/alert"

const soundMap: Record<AlertSound , string> = {

  default: "/sounds/alert.mp3",

  absorption: "/sounds/absorption.mp3",

  liquidation: "/sounds/liquidation.mp3",

}

export function playAlertSound(type: AlertSound ) {

  try {

    const audio = new Audio(soundMap[type])

    audio.volume = 0.7

    audio.play()

  } catch (err) {

    console.error("Sound play failed", err)

  }

}