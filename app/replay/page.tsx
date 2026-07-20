import { Suspense } from "react"
import { redirect } from "next/navigation"

import MvpCutoverPage, { MvpCutoverLoadingShell } from "@/components/mvp-cutover/MvpCutoverPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import demoProfile from "@/docs/project/mvp-default-demo-event.json"
import { mvp8z2CandidateReplayHref } from "@/lib/data-platform/mvp-serving/candidateReview"
import { isMvpCandidateReplayRuntime } from "@/lib/data-platform/mvp-serving/candidateReplayRuntime"

export default function ReplayPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const candidateReview = isMvpCandidateReplayRuntime()
  if (!searchParams?.instrument && !searchParams?.symbol && !searchParams?.start && !searchParams?.projection) redirect(candidateReview ? mvp8z2CandidateReplayHref("BTCUSDT") : demoProfile.primary.replayUrl)
  return (
    <TerminalAppShell>
      <Suspense fallback={<MvpCutoverLoadingShell view="replay" />}>
        <MvpCutoverPage view="replay" candidateReview={candidateReview} />
      </Suspense>
    </TerminalAppShell>
  )
}
