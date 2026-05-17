
"use client"

import MacroPanel from "./MacroPanel"
import SentimentPanel from "./SentimentPanel"
import OrderflowPanel from "./OrderflowPanel"
import NarrativePanel from "./NarrativePanel"

export default function DashboardLayout() {
  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3">
          <MacroPanel />
        </div>

        <div className="col-span-6">
          <OrderflowPanel />
        </div>

        <div className="col-span-3 flex flex-col gap-4">
          <SentimentPanel />
          <NarrativePanel />
        </div>
      </div>
    </main>
  )
}
