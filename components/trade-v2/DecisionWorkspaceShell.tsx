import React from "react"

export function DecisionWorkspaceShell({ children, embedded = false }: { readonly children: React.ReactNode; readonly embedded?: boolean }) {
  const Root = embedded ? "div" : "main"
  return <Root data-qt-foundation="trade-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] lg:px-4"><div className="mx-auto grid max-w-[1800px] gap-6"><header role="note" className="border border-[var(--qt-color-warning)] bg-[var(--qt-color-surface-raised)] p-4"><p className="text-sm font-bold text-[var(--qt-color-warning)]">PLANNING ONLY</p><p className="mt-1 text-xl font-bold">NO ORDER ENTRY</p><p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">This workspace organizes decision preparation. It does not place, review, or submit orders.</p></header>{children}</div></Root>
}
