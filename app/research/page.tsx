import { Suspense } from "react"
import { redirect } from "next/navigation"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import demoProfile from "@/docs/project/mvp-default-demo-event.json"

export default function ResearchRoute({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  if (!searchParams?.instrument && !searchParams?.symbol && !searchParams?.start && !searchParams?.projection) redirect(demoProfile.primary.researchUrl)
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="research" />}>
        <MvpCutoverPage view="research" />
      </Suspense>
    </TerminalAppShell>
  )
}
