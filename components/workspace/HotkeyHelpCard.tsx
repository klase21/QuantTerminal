"use client"

const hotkeys = [
  ["A", "Advanced Flow"],
  ["B", "Basic Flow"],
  ["1", "Scalp preset"],
  ["2", "Swing preset"],
  ["3", "Risk-off preset"],
  ["4", "AI rotation preset"],
  ["R", "Focus RWA"],
  ["I", "Focus AI"],
  ["M", "Focus MEME"],
  ["0", "Clear focus"],
]

export default function HotkeyHelpCard() {
  return (
    <div className="rounded-3xl border border-zinc-900 bg-black/70 p-4">
      <div className="mb-3 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-300">
        Hotkeys
      </div>

      <div className="grid grid-cols-2 gap-2">
        {hotkeys.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between rounded-xl border border-zinc-900 bg-zinc-950/70 px-3 py-2">
            <span className="grid h-6 min-w-6 place-items-center rounded-md border border-zinc-700 bg-black px-1.5 text-[10px] font-black text-white">
              {key}
            </span>
            <span className="text-[10px] text-zinc-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
