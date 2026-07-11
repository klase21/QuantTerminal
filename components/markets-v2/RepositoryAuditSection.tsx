import React from "react"
import { StatePanel } from "@/components/feedback"
import { RepositoryLink } from "@/components/navigation"
import type { MarketsRepositoryViewModel } from "@/lib/markets-presentation/contracts"

export function RepositoryAuditSection({ model }: { readonly model: MarketsRepositoryViewModel }) { return <section aria-labelledby="repository-audit-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-repository)]">Repository Audit</p><h2 id="repository-audit-title" className="mt-1 text-lg font-semibold">Record-level traceability</h2></div><StatePanel state={model.lifecycle} title="Repository Audit UNAVAILABLE" reason={model.reason} /><RepositoryLink handoff={model.handoff} /></section> }
