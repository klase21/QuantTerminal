// ======================================================
// /components/FloatingChartModal.tsx
// ======================================================

"use client"

import {
  X,
  Maximize2,
} from "lucide-react"

interface Props {
  open: boolean
  onClose: () => void
  children: React.ReactNode
}

export default function FloatingChartModal({
  open,
  onClose,
  children,
}: Props) {

  if (!open) return null

  return (

    <div
      className="
        fixed
        inset-0
        z-[999]
        bg-black/70
        backdrop-blur-sm
        flex
        items-center
        justify-center
        p-6
      "
    >

      <div
        className="
          w-full
          h-full
          rounded-2xl
          border
          border-zinc-800
          bg-zinc-950
          overflow-hidden
          flex
          flex-col
        "
      >

        {/* HEADER */}
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-zinc-800
            px-4
            py-3
          "
        >

          <div
            className="
              flex
              items-center
              gap-2
              text-sm
              font-semibold
            "
          >

            <Maximize2 size={16} />

            Floating Chart

          </div>

          <button
            onClick={onClose}
            className="
              rounded-lg
              border
              border-zinc-700
              p-2
              hover:bg-zinc-800
            "
          >

            <X size={16} />

          </button>

        </div>

        {/* BODY */}
        <div
          className="
            flex-1
            p-4
          "
        >

          {children}

        </div>

      </div>

    </div>
  )
}