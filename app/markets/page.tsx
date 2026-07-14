import { Suspense } from "react"

import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"

export default function MarketsRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="markets" />}>
        <MvpCutoverPage view="markets" />
      </Suspense>
    </TerminalAppShell>
  )
}
