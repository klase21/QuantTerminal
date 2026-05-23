import Phase36_40AIIntelligenceLayer from "@/components/ai-intelligence/Phase36_40AIIntelligenceLayer"
import NewsFeed from "@/components/news/NewsFeed"

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-black p-6 text-white">
      <div className="grid grid-cols-1 gap-6">
        <Phase36_40AIIntelligenceLayer />
        <NewsFeed />
      </div>
    </main>
  )
}
