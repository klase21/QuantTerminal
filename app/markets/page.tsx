import { TerminalAppShell } from "@/components/layout/PrimaryNavigation"
import MarketsPage from "@/components/markets/MarketsPage"

export default function MarketsRoute() {
  return (
    <TerminalAppShell>
      <MarketsPage />
    </TerminalAppShell>
  )
}
