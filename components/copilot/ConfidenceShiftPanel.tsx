"use client"

export default function ConfidenceShiftPanel({
  shift,
}: {
  shift: string
}) {
  return (
    <div className="rounded-3xl border border-yellow-300/20 bg-yellow-400/5 p-4">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200">
        Confidence Shift Detection
      </div>

      <div className="text-sm leading-6 text-zinc-300">
        {shift}
      </div>
    </div>
  )
}
