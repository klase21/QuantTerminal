import {
  ConfidenceIndicator,
  CounterEvidenceCard,
  EvidenceCard,
  MetricCard,
  ReasoningCard,
} from "@/components/evidence"
import { AvailabilityBadge, StatePanel } from "@/components/feedback"
import { Inline, Section, Stack, SurfacePanel } from "@/components/layout/foundation-layout"
import { RepositoryLink } from "@/components/navigation"
import { Badge, Button, Chip, Divider, IconButton, Progress, Spinner } from "@/components/ui/foundation"
import {
  PREVIEW_FIXTURE_LABEL,
  previewCounterEvidence,
  previewEvidence,
  previewMetric,
  previewReasoning,
  previewUnavailableEvidence,
} from "@/lib/design-system/fixtures/preview"
import { AVAILABILITY_STATES, LIFECYCLE_STATES, type AvailabilityState } from "@/lib/design-system"
import { Search } from "lucide-react"

const staleEvidence = {
  ...previewEvidence,
  id: "example-evidence-stale",
  title: "Stale evidence example with a deliberately long title that verifies safe wrapping at narrow widths",
  availability: { state: "STALE" as const, reason: "Example freshness threshold exceeded." },
  freshness: { state: "STALE" as const, observedAt: "2025-01-14T08:00:00.000Z", reason: "Synthetic preview age." },
}

const partialEvidence = {
  ...previewEvidence,
  id: "example-evidence-partial",
  title: "Partial evidence example",
  lifecycle: "PARTIAL" as const,
  coverage: { state: "PARTIAL" as const, actualRecords: 1, expectedRecords: 3, percent: 33.33, reason: "Synthetic preview coverage." },
}

export function ReactFoundationPreview() {
  return (
    <main data-qt-foundation="preview" data-qt-density="standard" className="min-h-screen bg-[var(--qt-color-background)] p-4 font-[var(--qt-font-sans)] text-[var(--qt-color-text-primary)] sm:p-6 lg:p-8">
      <Stack gap="8" className="mx-auto max-w-[1440px]">
        <header className="grid gap-3 border-b border-[var(--qt-color-border)] pb-6">
          <Badge tone="warning">{PREVIEW_FIXTURE_LABEL}</Badge>
          <h1 className="text-2xl font-bold sm:text-3xl">Canonical React Foundation Preview</h1>
          <p className="max-w-3xl text-sm leading-6 text-[var(--qt-color-text-secondary)]">Development-only isolated components. Values are deterministic synthetic fixtures and are not current market data.</p>
        </header>

        <Section aria-labelledby="primitive-title">
          <h2 id="primitive-title" className="text-lg font-semibold">Primitives</h2>
          <SurfacePanel>
            <Inline gap="3">
              <Button variant="primary">Primary action</Button>
              <Button>Secondary action</Button>
              <Button variant="ghost">Ghost action</Button>
              <Button loading loadingLabel="Synthetic loading">Ignored content</Button>
              <IconButton accessibleName="Search synthetic preview"><Search className="size-4" /></IconButton>
              <Chip selected>Selected filter</Chip>
              <Chip>Available filter</Chip>
              <Spinner label="Synthetic loading state" />
            </Inline>
            <Divider className="my-4" />
            <Progress label="Demonstration progress" value={2} max={3} />
          </SurfacePanel>
        </Section>

        <Section aria-labelledby="availability-title">
          <h2 id="availability-title" className="text-lg font-semibold">Availability states</h2>
          <Inline gap="2">
            {AVAILABILITY_STATES.map((state: AvailabilityState) => <AvailabilityBadge key={state} availability={{ state, reason: `${state} synthetic preview.` }} />)}
          </Inline>
        </Section>

        <Section aria-labelledby="lifecycle-title">
          <h2 id="lifecycle-title" className="text-lg font-semibold">Lifecycle states</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {LIFECYCLE_STATES.map((state) => <StatePanel key={state} state={state} title={`${state} example`} reason={`${state} synthetic preview state.`} />)}
          </div>
        </Section>

        <Section aria-labelledby="evidence-title">
          <h2 id="evidence-title" className="text-lg font-semibold">Evidence and data display</h2>
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            <EvidenceCard evidence={previewEvidence} variant="compact" />
            <EvidenceCard evidence={previewEvidence} variant="expanded" />
            <EvidenceCard evidence={staleEvidence} variant="expanded" />
            <EvidenceCard evidence={partialEvidence} variant="expanded" />
            <EvidenceCard evidence={previewUnavailableEvidence} variant="expanded" />
            <MetricCard metric={previewMetric} />
          </div>
        </Section>

        <Section aria-labelledby="reasoning-title">
          <h2 id="reasoning-title" className="text-lg font-semibold">Reasoning boundaries</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReasoningCard reasoning={previewReasoning} />
            <CounterEvidenceCard counterEvidence={previewCounterEvidence} />
            <ReasoningCard reasoning={{ ...previewReasoning, id: "example-reasoning-unavailable", summary: "This text must not render.", supportingEvidence: [], unavailableReason: "Synthetic preview intentionally omits evidence references." }} />
            <SurfacePanel>
              <Stack>
                <ConfidenceIndicator confidence={{ state: "UNAVAILABLE", reason: "Synthetic preview confidence omitted." }} />
                <RepositoryLink handoff={{ available: false, unavailableReason: "Synthetic fixtures have no Repository record." }} />
              </Stack>
            </SurfacePanel>
          </div>
        </Section>
      </Stack>
    </main>
  )
}
