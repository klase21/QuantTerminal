import { Suspense } from "react"

import DashboardLayout from "@/components/DashboardLayout"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white" />}>
      <TerminalAppShell>
        <DashboardLayout />
      </TerminalAppShell>
    </Suspense>
  )
}
