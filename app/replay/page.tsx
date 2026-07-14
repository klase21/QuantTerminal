import { Suspense } from "react"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ReplayPage() {
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="replay" />}>
        <MvpCutoverPage view="replay" />
      </Suspense>
    </TerminalAppShell>
  )
}
