// ======================================================
// /components/ui/Panel.tsx
// ======================================================

"use client"

import {
  ChevronDown,
  ChevronUp,
} from "lucide-react"

interface Props {
  title: string
  right?: string
  children: React.ReactNode
  collapsible?: boolean
  collapsed?: boolean
  onToggle?: () => void
}

export default function Panel({
  title,
  right,
  children,
  collapsible,
  collapsed,
  onToggle,
}: Props) {

  return (

    <div
      className="
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-950
        overflow-hidden
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
          "
        >

          {collapsible && (

            <button
              onClick={onToggle}
              className="
                text-zinc-400
                hover:text-white
              "
            >

              {collapsed
                ? <ChevronDown size={16} />
                : <ChevronUp size={16} />
              }

            </button>

          )}

          <div
            className="
              text-sm
              font-semibold
            "
          >
            {title}
          </div>

        </div>

        {right && (

          <div
            className="
              text-xs
              text-zinc-500
            "
          >
            {right}
          </div>

        )}

      </div>

      {/* BODY */}
      {!collapsed && (

        <div className="p-4">

          {children}

        </div>

      )}

    </div>
  )
}