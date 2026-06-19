import { Suspense } from "react"

import ResearchPage from "@/components/research/ResearchPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ResearchRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={null}>
        <ResearchPage />
      </Suspense>
    </TerminalAppShell>
  )
}
