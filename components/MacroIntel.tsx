// ======================================================
// components/MacroIntel.tsx
// ======================================================

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MacroIntel() {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-zinc-500 mt-1">
          Macro Intel
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-zinc-400">DXY</span>
          <span className="text-green-400">104.21</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">US10Y</span>
          <span className="text-red-400">4.42%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">NASDAQ</span>
          <span className="text-green-400">+1.24%</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-400">BTC Dominance</span>
          <span className="text-zinc-200">56.8%</span>
        </div>
      </CardContent>
    </Card>
  )
}