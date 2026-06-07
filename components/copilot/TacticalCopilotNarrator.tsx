"use client"

export default function TacticalCopilotNarrator({
  text,
}: {
  text: string
}) {
  return (
    <div className="rounded-[2rem] border border-cyan-400/15 bg-black/55 p-4 backdrop-blur-xl">
      <div className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-300">
        Co-Pilot Feed
      </div>

      <div className="mt-2 text-sm leading-6 text-zinc-300">
        {text}
      </div>
    </div>
  )
}
