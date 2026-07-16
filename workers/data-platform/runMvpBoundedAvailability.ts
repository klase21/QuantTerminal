import { createBoundedArchiveRequest, inspectBoundedArchiveAvailability, MVP_REFRESH_INSTRUMENTS, type BoundedArchiveDataset } from "@/lib/data-platform/mvp-refresh"

function option(name: string): string {
  const prefix = `--${name}=`
  const value = process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length)
  if (!value) throw new Error(`OPTION_REQUIRED:${name}`)
  return value
}

async function main() {
  const start = option("start"), end = option("end")
  const datasets: readonly BoundedArchiveDataset[] = Object.freeze(["ohlcv", "open-interest", "agg-trade"])
  const observations = []
  for (const dataset of datasets) for (const instrument of MVP_REFRESH_INSTRUMENTS) {
    const request = createBoundedArchiveRequest({ dataset, provider: "binance-vision", instrument, eventTimeStart: start, eventTimeEnd: end, sourceContractVersion: `mvp-bounded-${dataset}/1.0.0`, maximumRecordCount: dataset === "agg-trade" ? 20_000_000 : 1_000 })
    observations.push(await inspectBoundedArchiveAvailability(request))
  }
  console.log(JSON.stringify(observations))
}

main().catch((error) => { console.error(JSON.stringify({ error: error instanceof Error ? error.message : "BOUNDED_AVAILABILITY_FAILED" })); process.exitCode = 1 })
