import { Suspense } from "react"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function DashboardPage() {
  return (
    <Suspense fallback={<MvpCutoverLoadingShell view="dashboard" />}>
      <TerminalAppShell>
        <MvpCutoverPage view="dashboard" />
      </TerminalAppShell>
    </Suspense>
  )
}
