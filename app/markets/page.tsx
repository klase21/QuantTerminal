import { Suspense } from "react"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import MarketsPage from "@/components/markets/MarketsPage"

export default function MarketsRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={null}>
        <MarketsPage />
      </Suspense>
    </TerminalAppShell>
  )
}
