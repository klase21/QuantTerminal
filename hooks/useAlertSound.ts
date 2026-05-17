// ======================================================
// hooks/useAlertSound.ts
// ======================================================

"use client"

const audioCache:
  Record<string, HTMLAudioElement> = {}

export default function useAlertSound() {

  // ======================================================
  // PLAY SOUND
  // ======================================================

  function playSound(
    file: string,
    volume = 0.7
  ) {

    if (
      typeof window === "undefined"
    )
      return

    try {

      if (!audioCache[file]) {

        const audio =
          new Audio(
            `/sounds/${file}.mp3`
          )

        audio.volume = volume

        audioCache[file] = audio

      }

      const sound =
        audioCache[file]

      sound.currentTime = 0

      sound.volume = volume

      sound.play().catch(() => {})

    } catch (err) {

      console.error(
        "Sound Error:",
        err
      )

    }

  }

  // ======================================================
  // UNLOCK AUDIO
  // ======================================================

  function unlockAudio() {

    const unlock = () => {

      const audio =
        new Audio()

      audio.play().catch(() => {})

      window.removeEventListener(
        "click",
        unlock
      )

    }

    window.addEventListener(
      "click",
      unlock
    )

  }

  return {

    playSound,

    unlockAudio,

  }

}