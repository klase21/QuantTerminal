"use client"

import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

interface Props {
  left: ReactNode
  center: ReactNode
  right: ReactNode
}

export default function ResizablePanelGroup({
  left,
  center,
  right,
}: Props) {

  const containerRef =
    useRef<HTMLDivElement>(null)

  const [leftWidth, setLeftWidth] =
    useState(22)

  const [rightWidth, setRightWidth] =
    useState(24)

  const dragging =
    useRef<"left" | "right" | null>(
      null
    )

  useEffect(() => {

    function onMove(
      e: MouseEvent
    ) {

      if (
        !containerRef.current ||
        !dragging.current
      ) {
        return
      }

      const rect =
        containerRef.current.getBoundingClientRect()

      const x =
        e.clientX - rect.left

      const total =
        rect.width

      // LEFT HANDLE
      if (
        dragging.current === "left"
      ) {

        const next =
          (x / total) * 100

        if (
          next >= 15 &&
          next <= 35
        ) {
          setLeftWidth(next)
        }
      }

      // RIGHT HANDLE
      if (
        dragging.current === "right"
      ) {

        const next =
          ((total - x) /
            total) *
          100

        if (
          next >= 18 &&
          next <= 40
        ) {
          setRightWidth(next)
        }
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
        gap-2
        w-full
        h-full
      "
    >

      {/* LEFT */}
      <div
        style={{
          width: `${leftWidth}%`,
        }}
        className="
          min-w-0
        "
      >
        {left}
      </div>

      {/* LEFT RESIZER */}
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
          transition-colors
        "
      />

      {/* CENTER */}
      <div
        className="
          flex-1
          min-w-0
        "
      >
        {center}
      </div>

      {/* RIGHT RESIZER */}
      <div
        onMouseDown={() => {
          dragging.current =
            "right"
        }}
        className="
          w-1
          cursor-col-resize
          rounded-full
          bg-zinc-800
          hover:bg-zinc-600
          transition-colors
        "
      />

      {/* RIGHT */}
      <div
        style={{
          width: `${rightWidth}%`,
        }}
        className="
          min-w-0
        "
      >
        {right}
      </div>

    </div>
  )
}