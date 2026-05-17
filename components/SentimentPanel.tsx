
const trends = [
  { keyword: "ETH", score: 82 },
  { keyword: "SOL", score: 77 },
  { keyword: "AI", score: 91 },
  { keyword: "RWA", score: 73 },
]

export default function SentimentPanel() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="text-lg font-semibold mb-4">Sentiment Radar</h2>

      <div className="space-y-3">
        {trends.map((item) => (
          <div key={item.keyword}>
            <div className="flex justify-between text-sm mb-1">
              <span>{item.keyword}</span>
              <span>{item.score}</span>
            </div>

            <div className="h-2 rounded bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
