
"use client";
const exchanges = [
  { name: "Binance", flow: "+12.4M" },
  { name: "Bybit", flow: "+8.1M" },
  { name: "Hyperliquid", flow: "+15.7M" },
];
export default function CrossExchangeRotation() {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4">
      <div className="mb-4 text-sm font-semibold text-white">
        Cross Exchange Rotation
      </div>
      <div className="space-y-3">
        {exchanges.map((e)=>(
          <div key={e.name} className="flex items-center justify-between rounded-xl bg-zinc-900/60 p-3">
            <span className="text-sm text-zinc-300">{e.name}</span>
            <span className="font-semibold text-emerald-400">{e.flow}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
