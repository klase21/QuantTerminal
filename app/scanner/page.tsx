import { Suspense } from "react"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ScannerRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="scanner" />}>
        <MvpCutoverPage view="scanner" />
      </Suspense>
    </TerminalAppShell>
  )
}
