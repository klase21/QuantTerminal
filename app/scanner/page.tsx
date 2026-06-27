import { Suspense } from "react"

import ScannerPage from "@/components/scanner/ScannerPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ScannerRoute() {
  return (
    <TerminalAppShell>
      <Suspense fallback={(
        <div className="min-h-screen bg-[#070d07] px-3 py-3 text-white lg:px-4">
          <div className="mx-auto max-w-[1800px] rounded border border-[#142014] bg-[#0a0f0a] px-3 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-[#6b7d6b]">
            Loading Scanner
          </div>
        </div>
      )}>
        <ScannerPage />
      </Suspense>
    </TerminalAppShell>
  )
}
