import NewsFeed from "@/components/news/NewsFeed"

export default function DashboardPage() {
  return (
    <main className="p-6">
      <div className="grid grid-cols-1 gap-6">
        <NewsFeed />
      </div>
    </main>
  )
}