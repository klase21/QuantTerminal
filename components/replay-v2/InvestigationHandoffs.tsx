import React from "react"
import Link from "next/link"

import { RepositoryLink } from "@/components/navigation"
import { Section, SurfacePanel } from "@/components/layout/foundation-layout"
import type { ReplayHandoffViewModel } from "@/lib/replay-presentation/contracts"
import type { RepositoryHandoffViewModel } from "@/lib/design-system"

export function InvestigationHandoffs({ research, repository, repositoryRecord }: { readonly research: ReplayHandoffViewModel; readonly repository: ReplayHandoffViewModel; readonly repositoryRecord: RepositoryHandoffViewModel }) {
  return <><Section aria-labelledby="replay-research-title"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">6 · Research</p><h2 id="replay-research-title" className="mt-1 text-xl font-bold">Continue the investigation</h2></div><SurfacePanel><p className="text-sm leading-6 text-[var(--qt-color-text-secondary)]">{research.description}</p>{research.available && research.href ? <Link href={research.href} className="mt-4 inline-flex min-h-[var(--qt-touch-target)] items-center text-sm font-semibold text-[var(--qt-color-evidence)] hover:underline">{research.label}</Link> : <p role="status" className="mt-4 text-xs text-[var(--qt-color-text-muted)]">UNAVAILABLE: {research.unavailableReason}</p>}</SurfacePanel></Section><Section aria-labelledby="replay-repository-title"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-repository)]">7 · Repository</p><h2 id="replay-repository-title" className="mt-1 text-xl font-bold">Audit trail and traceability</h2></div><SurfacePanel><p className="text-sm leading-6 text-[var(--qt-color-text-secondary)]">{repository.description}</p><div className="mt-4"><RepositoryLink handoff={repositoryRecord} /></div></SurfacePanel></Section></>
}

