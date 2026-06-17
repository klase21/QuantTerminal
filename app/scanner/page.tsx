import ScannerPage from "@/components/scanner/ScannerPage"
import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"

export default function ScannerRoute() {
  return (
    <TerminalAppShell>
      <ScannerPage />
    </TerminalAppShell>
  )
}
