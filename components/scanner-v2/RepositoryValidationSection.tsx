import React from "react"
import { StatePanel } from "@/components/feedback"
import type { ScannerRepositoryViewModel } from "@/lib/scanner-presentation/contracts"

export function RepositoryValidationSection({ model }: { readonly model: ScannerRepositoryViewModel }) { return <section aria-labelledby="repository-validation-title" className="grid gap-4"><div><p className="text-xs font-semibold uppercase text-[var(--qt-color-evidence)]">Record-level audit boundary</p><h2 id="repository-validation-title" className="mt-1 text-lg font-semibold">Repository Validation</h2></div><StatePanel state={model.lifecycle} title="Repository Validation UNAVAILABLE" reason={model.reason} /></section> }
