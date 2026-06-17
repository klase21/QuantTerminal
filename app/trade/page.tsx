import { Suspense } from "react"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import TradePage from "@/components/trade/TradePage"

export default function TradeRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={null}>
        <TradePage />
      </Suspense>
    </TerminalAppShell>
  )
}
