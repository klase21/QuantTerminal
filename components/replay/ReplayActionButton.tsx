import type { ButtonHTMLAttributes, ReactNode } from "react"

export function ReplayActionButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className={`rounded-lg border border-zinc-800 bg-black/45 px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-300 transition hover:border-cyan-300/35 hover:bg-cyan-400/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

