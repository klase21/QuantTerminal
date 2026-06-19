import { Suspense } from "react"

import HistoricalIntelligenceExplorer from "@/components/historical-intelligence/HistoricalIntelligenceExplorer"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function HistoricalIntelligenceRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={null}>
        <HistoricalIntelligenceExplorer />
      </Suspense>
    </TerminalAppShell>
  )
}
