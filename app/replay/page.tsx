import { Suspense } from "react"

import ReplayV1Page from "@/components/replay/ReplayV1Page"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ReplayPage() {
  return (
    <TerminalAppShell>
      <Suspense fallback={null}>
        <ReplayV1Page />
      </Suspense>
    </TerminalAppShell>
  )
}
