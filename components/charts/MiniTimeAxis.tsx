"use client"

export default function MiniTimeAxis() {
  const now = Date.now()
  const labels = [60, 45, 30, 15, 0].map((minutesAgo) => {
    const date = new Date(now - minutesAgo * 60_000)
    return new Intl.DateTimeFormat("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date)
  })

  return (
    <div className="pointer-events-none absolute bottom-2 left-12 right-8 z-20 grid grid-cols-5 text-center text-[10px] font-medium text-zinc-500">
      {labels.map((label) => (
        <span key={label}>{label}</span>
      ))}
    </div>
  )
}
