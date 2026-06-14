// ======================================================
// app/page.tsx
// ======================================================

import DashboardLayout from "@/components/DashboardLayout"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function Home() {
  return (
    <TerminalAppShell>
      <DashboardLayout />
    </TerminalAppShell>
  )
}
