import React from "react"

export function ScannerShell({ children, embedded = false }: { readonly children: React.ReactNode; readonly embedded?: boolean }) {
  const Root = embedded ? "div" : "main"
  return <Root data-qt-foundation="scanner-v2" className="min-h-screen bg-[var(--qt-color-background)] px-3 py-4 text-[var(--qt-color-text-primary)] lg:px-4"><div className="mx-auto grid max-w-[1800px] gap-6">{children}</div></Root>
}
