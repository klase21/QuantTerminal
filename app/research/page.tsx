import { Suspense } from "react"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ResearchRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="research" />}>
        <MvpCutoverPage view="research" />
      </Suspense>
    </TerminalAppShell>
  )
}
