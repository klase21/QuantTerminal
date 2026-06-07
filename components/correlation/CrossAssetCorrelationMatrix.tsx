"use client"

const rows = [
  ["BTC", "+0.82", "-0.48", "-0.42", "+0.36"],
  ["ETH", "+0.76", "-0.44", "-0.37", "+0.31"],
  ["ETH/BTC", "+0.58", "-0.32", "-0.28", "+0.24"],
  ["TOTAL3", "+0.80", "-0.41", "-0.35", "+0.22"],
]

const cols = ["NASDAQ", "DXY", "US10Y", "GOLD"]

export default function CrossAssetCorrelationMatrix() {
  return (
    <section className="rounded-3xl border border-cyan-400/20 bg-cyan-400/5 p-4">
      <div className="mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">
        Cross-Asset Correlation Matrix
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-900">
        <table className="w-full border-collapse">
          <thead className="bg-black/50">
            <tr>
              <th className="p-3 text-left text-xs text-zinc-500">Asset</th>
              {cols.map((col) => (
                <th key={col} className="p-3 text-left text-xs text-zinc-500">
                  {col}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row) => (
              <tr key={row[0]} className="border-t border-zinc-900 bg-zinc-950/60">
                {row.map((cell, idx) => (
                  <td key={idx} className="p-3 text-sm text-white">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
