"use client"

export default function CapitalFlowCanvas() {
  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl border border-cyan-500/20 bg-black">
      <div className="absolute inset-0 animate-pulse opacity-20 bg-cyan-500 blur-3xl" />
      <div className="absolute left-20 top-20 text-cyan-400">AI → RWA</div>
      <div className="absolute right-20 bottom-20 text-pink-400">MEME → BTC</div>
    </div>
  )
}