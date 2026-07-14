import { Suspense } from "react"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"

export default function TradeRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="trade" />}>
        <MvpCutoverPage view="trade" />
      </Suspense>
    </TerminalAppShell>
  )
}
