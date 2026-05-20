"use client"

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

interface Props {
  left: ReactNode
  center?: ReactNode
  right: ReactNode
}

export default function ResizablePanelGroup({
  left,
  center,
  right,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement>(null)

  const dragging =
    useRef<"left" | null>(null)

  const [leftWidth, setLeftWidth] =
    useState(68)

  useEffect(() => {

    function onMove(
      e: MouseEvent
    ) {

      if (
        !containerRef.current ||
        !dragging.current
      ) return

      const rect =
        containerRef.current.getBoundingClientRect()

      const next =
        (
          (e.clientX - rect.left) /
          rect.width
        ) * 100

      if (
        next >= 25 &&
        next <= 75
      ) {

        setLeftWidth(next)

      }

    }

    function onUp() {

      dragging.current = null

    }

    window.addEventListener(
      "mousemove",
      onMove
    )

    window.addEventListener(
      "mouseup",
      onUp
    )

    return () => {

      window.removeEventListener(
        "mousemove",
        onMove
      )

      window.removeEventListener(
        "mouseup",
        onUp
      )

    }

  }, [])

  return (

    <div
      ref={containerRef}
      className="
        flex
        w-full
        items-start
        gap-3
      "
    >

      {/* LEFT */}

      <div
        style={{
          width: `${leftWidth}%`,
        }}
        className="
          min-w-0
          flex-shrink-0
        "
      >

        {left}

      </div>

      {/* RESIZER */}

      <div
        onMouseDown={() => {

          dragging.current =
            "left"

        }}
        className="
          w-1
          cursor-col-resize
          rounded-full
          bg-zinc-800
          hover:bg-zinc-600
        "
      />

      {!!center && (
        <div className="hidden">
          {center}
        </div>
      )}

      {/* RIGHT */}

      <div
        style={{
          width: `${100 - leftWidth}%`,
        }}
        className="
          min-w-0
          flex-1
        "
      >

        {right}

      </div>

    </div>

  )

}