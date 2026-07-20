"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSearch,
  History,
  Radio,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { StatePanel } from "@/components/feedback/state-panel";
import { Badge } from "@/components/ui/foundation/badge";
import demoProfile from "@/docs/project/mvp-default-demo-event.json";
import useMarketSocket from "@/hooks/useMarketSocket";
import {
  formatCompactCount,
  formatConfidencePrimary,
  formatCoverageSemantic,
  formatCounterEvidenceStrength,
  formatDirectionalFlow,
  formatEtfUsdMillions,
  formatFundingRate,
  formatPlainNumber,
  formatPrice,
  formatSignedOpenInterestChange,
  formatSignedReturn,
} from "@/lib/presentation/financialFormatting";
import { humanReasonFor } from "@/lib/presentation/reasonDictionary";
import {
  buildMvpRouteHref,
  mvpApiQuery,
  normalizeMvpRouteContext,
} from "@/lib/mvp-route-context";
import { ReplaySequenceExperience } from "./ReplaySequenceExperience";
import { useMarketStore } from "@/stores/useMarketStore";

export type MvpView =
  "dashboard" | "markets" | "scanner" | "trade" | "replay" | "research";
type RecordValue = Record<string, unknown>;
type ProjectionResponse = {
  status?: string;
  reason?: string;
  projections?: unknown;
  data?: RecordValue;
  payload?: RecordValue;
  [key: string]: unknown;
};

const Legacy = {
  dashboard: dynamic(() => import("@/components/DashboardLayout")),
  markets: dynamic(() => import("@/components/markets/MarketsPage")),
  scanner: dynamic(() => import("@/components/scanner/ScannerPage")),
  trade: dynamic(() => import("@/components/trade/TradePage")),
  replay: dynamic(() => import("@/components/replay/ReplayV1Page")),
  research: dynamic(() => import("@/components/research/ResearchPage")),
};

const instruments = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "DOGEUSDT",
];
const labels: Record<MvpView, string> = {
  dashboard: "Dashboard",
  markets: "Markets",
  scanner: "Scanner",
  trade: "Trade",
  replay: "Replay",
  research: "Research",
};
const routes: Record<MvpView, string> = {
  dashboard: "/dashboard",
  markets: "/markets",
  scanner: "/scanner",
  trade: "/trade",
  replay: "/replay",
  research: "/research",
};
const pageMeta: Record<MvpView, { eyebrow: string; title: string; detail: string }> = {
  dashboard: { eyebrow: "Market intelligence", title: "Dashboard V2", detail: "Direction, evidence readiness, and bounded investigation context." },
  markets: { eyebrow: "Global market intelligence", title: "Markets V2", detail: "Comparable six-instrument state, flow, derivatives, and external context." },
  scanner: { eyebrow: "Opportunity prioritization", title: "Scanner V2", detail: "Evidence is evaluated before investigation priority." },
  trade: { eyebrow: "Decision intelligence", title: "Decision Workspace", detail: "Evaluate evidence, scenarios, risk, and a transparent non-execution plan." },
  replay: { eyebrow: "Historical investigation", title: "Replay V2", detail: "A synchronized, bounded event sequence using governed source observations." },
  research: { eyebrow: "Evidence investigation", title: "Research V2", detail: "Question-led evidence, disagreement, Coverage, and audit context." },
};

function asRecord(input: unknown): RecordValue {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as RecordValue)
    : {};
}
function asList(input: unknown): unknown[] {
  return Array.isArray(input) ? input : [];
}
function text(input: unknown, fallback = "UNAVAILABLE") {
  return typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
    ? String(input)
    : fallback;
}
function value(payload: RecordValue, key: string, fallback = "UNAVAILABLE") {
  return text(payload[key], fallback);
}
function codes(input: unknown): string[] {
  if (typeof input === "string")
    return input
      .split(/[|\s]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  return asList(input)
    .map((item) => text(item, ""))
    .filter(Boolean);
}
function label(input: string) {
  return input
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}
function formatTimestamp(input: unknown) {
  const candidate = text(input, "");
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed)
    ? `${new Date(parsed).toISOString().replace(".000Z", "Z")} UTC`
    : "UNAVAILABLE";
}
function formatUtcDate(input: unknown) {
  const candidate = text(input, "");
  const parsed = Date.parse(candidate);
  return Number.isFinite(parsed)
    ? `${new Date(parsed).toISOString().slice(0, 10)} UTC`
    : "UNAVAILABLE";
}
function numeric(input: unknown): number | null {
  const parsed = typeof input === "number" ? input : Number(input);
  return Number.isFinite(parsed) ? parsed : null;
}
function formatMetric(key: string, input: unknown): string {
  const parsed = numeric(input);
  const normalizedKey = key.toLowerCase();
  if (normalizedKey.includes("funding") || normalizedKey === "rate")
    return formatFundingRate(parsed);
  if (normalizedKey.includes("imbalance")) return formatDirectionalFlow(parsed);
  if (
    normalizedKey.includes("return") ||
    normalizedKey.includes("pricechange") ||
    normalizedKey === "boundedpricechangepct"
  )
    return formatSignedReturn(parsed);
  if (normalizedKey.includes("oichange") || normalizedKey === "changepct")
    return formatSignedOpenInterestChange(parsed);
  if (normalizedKey.includes("tradecount") || normalizedKey === "eventcount")
    return formatCompactCount(parsed);
  if (normalizedKey === "close" || normalizedKey.includes("price"))
    return formatPrice(parsed);
  if (parsed !== null) return formatPlainNumber(parsed);
  return text(input);
}
function parseProviderRecord(input: unknown): RecordValue {
  if (typeof input !== "string" || !input.startsWith("@{"))
    return asRecord(input);
  return Object.fromEntries(
    input
      .slice(2, -1)
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((entry) => entry.length === 2),
  );
}
function stateTone(
  input: unknown,
): "neutral" | "info" | "success" | "warning" | "danger" | "experimental" {
  const state = text(input, "").toUpperCase();
  if (
    state.includes("AVAILABLE") ||
    state.includes("COMPLETE") ||
    state === "CURRENT"
  )
    return "success";
  if (
    state.includes("BLOCK") ||
    state.includes("ERROR") ||
    state.includes("CONFLICT") ||
    state.includes("GAP")
  )
    return "danger";
  if (
    state.includes("STALE") ||
    state.includes("PENDING") ||
    state.includes("LIMIT") ||
    state === "LOW"
  )
    return "warning";
  if (state.includes("EXPERIMENTAL") || state.includes("LOWER_BOUND"))
    return "experimental";
  if (state.includes("NEUTRAL") || state.includes("NOT_APPLICABLE"))
    return "neutral";
  return "info";
}

const surface = "min-w-0 rounded-[2px] border border-[#213021] bg-[#0c140c]";
const sectionTitle =
  "text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]";

function Section({
  title,
  icon,
  children,
  className = "",
  aside,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  aside?: ReactNode;
}) {
  return (
    <section className={`${surface} ${className}`}>
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--qt-color-border)] px-4 py-2">
        <h2 className={`${sectionTitle} flex items-center gap-2`}>
          {icon}
          {title}
        </h2>
        {aside}
      </header>
      <div className="min-w-0 p-4">{children}</div>
    </section>
  );
}

function ContextToolbar({
  eyebrow,
  title,
  detail,
  actions,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  actions?: ReactNode;
}) {
  void eyebrow;
  void title;
  void detail;
  void actions;
  return null;
}

function WorkflowFooter({ children }: { children: ReactNode }) {
  return (
    <footer
      className={`${surface} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}
    >
      <p className={`${sectionTitle} text-[var(--qt-color-text-muted)]`}>
        Workflow handoff
      </p>
      <div className="flex flex-wrap gap-1">{children}</div>
    </footer>
  );
}

function ReasonList({
  values,
  empty = "No governed observations were supplied.",
}: {
  values: unknown;
  empty?: string;
}) {
  const items = codes(values);
  return items.length ? (
    <ul className="grid gap-3 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">
      {items.map((item) => {
        const reason = humanReasonFor(item),
          repeated =
            reason.label.replace(/[.\s]/g, "").toLowerCase() ===
            reason.explanation.replace(/[.\s]/g, "").toLowerCase();
        return (
          <li className="flex min-w-0 items-start gap-2" key={item}>
            <span
              aria-hidden="true"
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60"
            />
            <span className="min-w-0 break-words">
              <strong className="block font-semibold">{reason.label}</strong>
              {!repeated ? (
                <span className="mt-0.5 block text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">
                  {reason.explanation}
                </span>
              ) : null}
              {reason.code === "UNMAPPED_REASON_CODE" ? (
                <code className="mt-1 block text-[10px] text-[var(--qt-color-warning)]">
                  {reason.technicalCode}
                </code>
              ) : null}
            </span>
          </li>
        );
      })}
    </ul>
  ) : (
    <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-muted)]">
      {empty}
    </p>
  );
}

function InvalidationList({ values }: { values: unknown }) {
  const items = asList(values).map(asRecord);
  return items.length ? (
    <ul className="grid gap-3">
      {items.map((item, index) => {
        const condition = humanReasonFor(value(item, "observableStateChange")),
          level = humanReasonFor(value(item, "valueStatus"));
        return (
          <li
            className="border-l-2 border-[var(--qt-color-warning)] pl-3"
            key={index}
          >
            <strong className="text-sm">{condition.label}</strong>
            <p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">
              {condition.explanation}
            </p>
            <p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
              {level.label}
            </p>
          </li>
        );
      })}
    </ul>
  ) : (
    <DataStateNotice
      state="NOT_APPLICABLE"
      source="Trade context"
      affectsConclusion={false}
      detail="No observable invalidation condition was supplied."
    />
  );
}

function MetricRows({
  data,
  compact = false,
}: {
  data: unknown;
  compact?: boolean;
}) {
  const items = asList(data);
  if (items.length)
    return (
      <div className="grid gap-3">
        {items.map((item, index) => (
          <div
            className="min-w-0 rounded-[var(--qt-radius-control)] border-l-2 border-[var(--qt-color-border-strong)] pl-3"
            key={index}
          >
            {Object.keys(asRecord(item)).length ? (
              <MetricRows data={item} compact />
            ) : (
              <p className="break-words text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">
                {text(item)}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  const fields = asRecord(data);
  if (!Object.keys(fields).length)
    return (
      <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-muted)]">
        {text(data)}
      </p>
    );
  return (
    <dl className="grid min-w-0 gap-2">
      {Object.entries(fields).map(([key, item]) => {
        const nested = asRecord(item);
        return (
          <div
            className={`min-w-0 ${compact ? "grid grid-cols-[minmax(7rem,0.7fr)_minmax(0,1.3fr)] gap-3" : "grid gap-1 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:gap-4"}`}
            key={key}
          >
            <dt className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-muted)]">
              {label(key)}
            </dt>
            <dd className="min-w-0 break-words text-[var(--qt-type-body-size)] text-[var(--qt-color-text-primary)]">
              {Object.keys(nested).length ? (
                <MetricRows compact data={nested} />
              ) : (
                formatMetric(key, item)
              )}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function DataStateNotice({
  state,
  source,
  asOf,
  affectsConclusion,
  detail,
}: {
  state: string;
  source?: string;
  asOf?: unknown;
  affectsConclusion: boolean;
  detail: string;
}) {
  return (
    <div
      className="grid gap-2 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface-raised)] p-3"
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={stateTone(state)}>{label(state)}</Badge>
        {source ? (
          <span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">
            Source: {source}
          </span>
        ) : null}
        {asOf ? (
          <span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
            As of {formatTimestamp(asOf)}
          </span>
        ) : null}
      </div>
      <p className="text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
        {detail}
      </p>
      <p className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-muted)]">
        {affectsConclusion
          ? "This limitation affects the governed conclusion."
          : "The primary governed conclusion remains available."}
      </p>
    </div>
  );
}

export function MvpCutoverLoadingShell({ view }: { view: MvpView }) {
  return (
    <main
      data-qt-foundation="mvp-cutover"
      className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 text-white"
    >
      <div className="mx-auto max-w-[1600px]">
        <StatePanel
          state="LOADING"
          title={`Loading ${labels[view]}`}
          reason="Reading the bounded governed Projection. Optional sections will not block the primary result."
        />
      </div>
    </main>
  );
}

function Status({
  kind,
  reason,
}: {
  kind: "READ ERROR" | "MISSING" | "BLOCKED" | "UNAVAILABLE";
  reason?: string;
}) {
  const state =
    kind === "READ ERROR" ? "ERROR" : kind === "MISSING" ? "EMPTY" : "PARTIAL";
  return (
    <main
      data-qt-foundation="mvp-cutover"
      className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 text-white"
    >
      <div className="mx-auto max-w-[1600px]">
        <StatePanel
          state={state}
          title={kind}
          reason={
            reason ||
            "The governed Projection is unavailable. No legacy or fabricated value was substituted."
          }
        />
      </div>
    </main>
  );
}

function LiveOverlay({
  instrument,
  referenceValue,
  projectionAsOf,
}: {
  instrument: string;
  referenceValue: unknown;
  projectionAsOf: unknown;
}) {
  useMarketSocket();
  const ticker = useMarketStore((state) => state.tickers[instrument]);
  const observedAt = ticker?.timestamp
    ? new Date(ticker.timestamp).toISOString()
    : null;
  const freshness =
    ticker?.timestamp && Date.now() - ticker.timestamp < 30_000
      ? "CURRENT"
      : ticker
        ? "STALE"
        : "SOURCE_UNAVAILABLE";
  return (
    <section
      aria-labelledby="live-overlay-title"
      className={`${surface} grid gap-3 p-4 lg:grid-cols-[1fr_1fr_auto] lg:items-center`}
    >
      <div>
        <p
          id="live-overlay-title"
          className={`${sectionTitle} flex items-center gap-2 text-[var(--qt-color-evidence)]`}
        >
          <Database className="h-4 w-4" />
          Governed reference
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--qt-color-text-primary)]">
          {formatPrice(numeric(referenceValue))}
        </p>
        <p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
          Projection as of {formatTimestamp(projectionAsOf)}
        </p>
      </div>
      <div className="border-[var(--qt-color-border)] lg:border-l lg:pl-4">
        <p
          className={`${sectionTitle} flex items-center gap-2 text-[var(--qt-color-warning)]`}
        >
          <Radio className="h-4 w-4" />
          Live Binance overlay
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--qt-color-text-primary)]">
          {ticker
            ? `${ticker.symbol} ${formatPrice(numeric(ticker.price))}`
            : "UNAVAILABLE"}
        </p>
        <p className="mt-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
          Observed {observedAt ? formatTimestamp(observedAt) : "UNAVAILABLE"}
        </p>
      </div>
      <div className="lg:max-w-64">
        <Badge tone={stateTone(freshness)}>{freshness}</Badge>
        <p className="mt-2 text-[var(--qt-type-caption-size)] leading-relaxed text-[var(--qt-color-text-secondary)]">
          A newer quote does not recompute or replace governed Evidence.
        </p>
      </div>
    </section>
  );
}

function PageLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-1.5 rounded-[var(--qt-radius-control)] px-2 text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-repository)] hover:bg-[var(--qt-color-surface-emphasis)]"
      href={href}
    >
      {children}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function FeaturedDemoEvent() {
  return (
    <section className={`${surface} border-[var(--qt-color-warning)] p-4`}>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>
            Featured real-data investigation
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            BTCUSDT · Positioning expansion · 10 July 2026 UTC
          </h2>
          <p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">
            Price and open interest rose together while Funding and flow
            supplied meaningful counter evidence.
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <PageLink href={demoProfile.primary.replayUrl}>
            Replay sequence
          </PageLink>
          <PageLink href={demoProfile.primary.researchUrl}>
            Research Evidence
          </PageLink>
        </div>
      </div>
    </section>
  );
}

function Dashboard({
  payload,
  projections,
  href,
}: {
  payload: RecordValue;
  projections: unknown[];
  href: (view: MvpView, extra?: Record<string, string>) => string;
}) {
  const states = asList(payload.instrumentStates);
  const stateCounts = asRecord(payload.stateCounts);
  const macroProjection = projections
    .map(asRecord)
    .find((item) => item.projectionKind === "MacroContextProjection");
  const macro = asRecord(macroProjection?.payload);
  const rates = asRecord(macro.ratesContext);
  const equity = asRecord(macro.equityRiskContext);
  const etfProjection = projections
    .map(asRecord)
    .find((item) => item.projectionKind === "BitcoinEtfFlowProjection");
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Dashboard context toolbar"
        title="Market state, reasons, and investigation handoffs"
        detail="The first viewport preserves Figma's conclusion-first hierarchy while keeping mixed instrument states separate."
        actions={
          <PageLink href={demoProfile.primary.replayUrl}>
            Open demo event
          </PageLink>
        }
      />
      <section className={`${surface} order-1 border-cyan-400 p-5`}>
        <p className={`${sectionTitle} text-cyan-400`}>01 / Market Direction</p>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div>
            <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>
              Market state
            </p>
            <h2 className="mt-2 max-w-3xl text-2xl font-semibold leading-tight text-[var(--qt-color-text-primary)]">
              Mixed positioning across the six-instrument universe
            </h2>
            <p className="mt-2 max-w-2xl text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
              State counts remain separate. QuantTerminal does not convert mixed
              categorical evidence into a directional score.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stateCounts).map(([key, count]) => (
              <Badge key={key} tone={stateTone(key)}>
                {text(count)} {label(key)}
              </Badge>
            ))}
          </div>
        </div>
      </section>
      <div className="order-3 grid gap-4 lg:grid-cols-2">
        <Section
          title="03 / Reasoning Summary / Primary Drivers"
          icon={
            <Activity className="h-4 w-4 text-[var(--qt-color-evidence)]" />
          }
        >
          <ReasonList values={payload.primaryDrivers} />
        </Section>
        <Section
          title="03 / Reasoning Summary / Primary Risks and Counter Evidence"
          icon={
            <AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />
          }
        >
          <ReasonList values={payload.primaryRisks} />
        </Section>
      </div>
      <Section
        title="02 / Key Evidence / Six-Instrument Overview"
        className="order-2"
        icon={
          <ShieldCheck className="h-4 w-4 text-[var(--qt-color-success)]" />
        }
      >
        <div className="grid gap-px overflow-hidden border border-[var(--qt-color-border)] bg-[var(--qt-color-border)] xl:grid-cols-2 2xl:grid-cols-3">
          {states.map((item, index) => {
            const row = asRecord(item),
              instrument = value(row, "instrument", String(index)),
              evidence = value(row, "evidencePacketId", "");
            return (
              <article
                className="grid min-w-0 gap-3 bg-[#070d07] p-4"
                key={`${instrument}-${index}`}
              >
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <strong className="text-sm text-[var(--qt-color-text-primary)]">
                    {instrument}
                  </strong>
                  <Badge tone={stateTone(row.state)}>
                    {label(value(row, "state"))}
                  </Badge>
                </div>
                <p className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">
                  {formatConfidencePrimary(row.confidence)}. Open the governed event sequence or Evidence trail for the full context.
                </p>
                <div className="flex flex-wrap gap-1 border-t border-[var(--qt-color-border)] pt-3">
                  <PageLink href={href("markets", { instrument })}>
                    Markets
                  </PageLink>
                  <PageLink href={href("research", { instrument, evidence })}>
                    Evidence
                  </PageLink>
                  <PageLink href={href("replay", { instrument })}>
                    Replay
                  </PageLink>
                  <PageLink href={href("trade", { instrument })}>
                    Trade
                  </PageLink>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
      <Section
        title="04 / External Daily Context / Macro and ETF"
        className="order-4"
        icon={
          <Database className="h-4 w-4 text-[var(--qt-color-repository)]" />
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {macroProjection ? (
            <article className={`${surface} overflow-hidden`}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--qt-color-border)] px-4 py-3">
                <strong className="text-lg font-semibold leading-tight">Macro and risk context</strong>
                <Badge tone="warning">
                  {label(value(macro, "classification", "MIXED"))}
                </Badge>
              </div>
              <dl className="divide-y divide-[var(--qt-color-border)] px-4">
                {[
                  ["US 10-year yield", `${formatPlainNumber(numeric(rates.value), 2)}%`],
                  ["SPY 5-day move", formatSignedReturn(numeric(equity.fiveTradingDayReturnPct))],
                  ["Context role", "SUPPLEMENTAL ONLY"],
                  ["Observed through", formatUtcDate(macroProjection.eventTimeEnd)],
                  ["Sources", "FRED DGS10 · ALPHA VANTAGE SPY"],
                ].map(([name, item]) => (
                  <div className="grid grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] items-baseline gap-4 py-2.5" key={name}>
                    <dt className={sectionTitle}>{name}</dt>
                    <dd className="text-right text-sm font-semibold text-[var(--qt-color-text-primary)]">{item}</dd>
                  </div>
                ))}
              </dl>
              <p className="border-t border-[var(--qt-color-border)] px-4 py-3 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
                Daily context does not recompute the governed crypto conclusion.
              </p>
            </article>
          ) : (
            <DataStateNotice
              state="PROJECTION_MISSING"
              source="FRED and Alpha Vantage"
              affectsConclusion={false}
              detail="Supplemental macro context is unavailable. Core crypto Evidence remains functional."
            />
          )}
          {etfProjection ? (
            <article className={surface}>
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div>
                  <p className={sectionTitle}>Bitcoin ETF flow</p>
                  <p className="mt-1 text-2xl font-semibold text-[var(--qt-color-text-primary)]">
                    {formatEtfUsdMillions(numeric(asRecord(etfProjection.payload).latestDailyTotalUsd))}
                  </p>
                  <p className="mt-1 text-sm text-[var(--qt-color-text-secondary)]">
                    Latest observed daily total on {value(asRecord(etfProjection.payload), "observationDate")}
                  </p>
                </div>
                <Badge tone={stateTone(asRecord(etfProjection.payload).classification)}>
                  {label(value(asRecord(etfProjection.payload), "classification"))}
                </Badge>
              </div>
              <dl className="grid grid-cols-2 gap-3 border-t border-[var(--qt-color-border)] p-4">
                <div><dt className={sectionTitle}>Five trading days</dt><dd className="mt-1 font-semibold">{formatEtfUsdMillions(numeric(asRecord(etfProjection.payload).fiveTradingDayTotalUsd))}</dd></div>
                <div><dt className={sectionTitle}>Twenty trading days</dt><dd className="mt-1 font-semibold">{formatEtfUsdMillions(numeric(asRecord(etfProjection.payload).twentyTradingDayTotalUsd))}</dd></div>
              </dl>
              <p className="border-t border-[var(--qt-color-border)] px-4 py-3 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
                Daily observed flow from Farside. Supplemental context only; it does not recompute the governed crypto conclusion.
              </p>
            </article>
          ) : (
            <DataStateNotice
              state="BACKFILL_PENDING"
              source="Farside Bitcoin ETF Flow"
              affectsConclusion={false}
              detail="The source is publicly available as an embedded HTML table. Browser-backed scheduled retrieval is pending; no ETF flow value is substituted."
            />
          )}
        </div>
      </Section>
    </div>
  );
}

function Markets({
  projections,
  href,
}: {
  projections: unknown[];
  href: (view: MvpView, extra?: Record<string, string>) => string;
}) {
  const summaries = projections
    .map(asRecord)
    .filter(
      (item) => item.projectionKind === "InstrumentMarketSummaryProjection",
    );
  const etfProjection = projections.map(asRecord).find(
    (item) => item.projectionKind === "BitcoinEtfFlowProjection",
  );
  const etf = asRecord(etfProjection?.payload);
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Markets context toolbar"
        title="Six-instrument market intelligence"
        detail="Governed reference values, derivatives state, flow, Coverage, and labeled live overlays remain distinct."
        actions={
          <Badge tone="success">{summaries.length} supported markets</Badge>
        }
      />
      <Section title="L1 / Global Market Summary">
        <div className="flex flex-wrap gap-2">
          {summaries.map((projection) => (
            <Badge
              key={value(projection, "projectionVersionId")}
              tone={stateTone(asRecord(projection.payload).marketState)}
            >
              {value(projection, "subjectId")} /{" "}
              {label(value(asRecord(projection.payload), "marketState"))}
            </Badge>
          ))}
        </div>
      </Section>
      <Section title="L2 / Sector Rotation and Instrument Comparison">
        <div className="overflow-x-auto border border-[#213021] bg-[#070d07]">
          <div className="w-max min-w-[1450px] xl:min-w-full">
            <div
              className="grid grid-cols-[9rem_11rem_9rem_9.5rem_8rem_8rem_11rem_9rem_max-content] justify-start border-b border-[#213021] bg-[#0b130b]"
              role="row"
            >
              {[
                "Instrument",
                "Governed state",
                "Source date",
                "Projection reference",
                "OI change",
                "Funding",
                "Aggressive flow",
                "Evidence strength",
                "Actions",
              ].map((heading) => (
                <div
                  className="border-r border-[#213021] px-3 py-2 last:border-r-0"
                  key={heading}
                  role="columnheader"
                >
                  <span className={sectionTitle}>{heading}</span>
                </div>
              ))}
            </div>
            <div className="divide-y divide-[#213021]">
              {summaries.map((projection) => {
            const payload = asRecord(projection.payload),
              instrument = value(projection, "subjectId"),
              evidence = value(payload, "evidencePacketId", ""),
              price = asRecord(payload.latestGovernedPrice),
              oi = asRecord(payload.openInterest),
              funding = asRecord(payload.funding),
              flow = asRecord(payload.aggressiveFlow),
              confidence = asRecord(payload.confidence);
            return (
              <article
                key={value(projection, "projectionVersionId")}
                className="grid min-w-0 grid-cols-[9rem_11rem_9rem_9.5rem_8rem_8rem_11rem_9rem_max-content] items-stretch justify-start"
              >
                <header className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <h2 className="whitespace-nowrap text-base font-bold text-[var(--qt-color-text-primary)]">
                    {instrument}
                  </h2>
                </header>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <Badge tone={stateTone(payload.marketState)}>
                    {label(value(payload, "marketState"))}
                  </Badge>
                </div>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <p className="whitespace-nowrap font-[var(--qt-font-mono)] text-[10px] font-semibold text-[var(--qt-color-text-secondary)]">
                    {formatUtcDate(projection.eventTimeEnd)}
                  </p>
                </div>
                <div className="flex min-w-0 flex-col justify-center border-r border-[#213021] p-3">
                  <p className="whitespace-nowrap text-base font-semibold">{formatPrice(numeric(price.close))}</p>
                  <p className="mt-1 whitespace-nowrap text-[10px] text-[var(--qt-color-text-secondary)]">{formatSignedReturn(numeric(price.boundedPriceChangePct))}</p>
                </div>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <p className="whitespace-nowrap text-sm font-semibold">{formatSignedOpenInterestChange(numeric(oi.changePct))}</p>
                </div>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <p className="whitespace-nowrap text-sm font-semibold">{formatFundingRate(numeric(funding.latestProviderEventRate))}</p>
                </div>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <p className="whitespace-nowrap text-sm font-semibold">{formatDirectionalFlow(numeric(flow.imbalanceRatio))}</p>
                </div>
                <div className="flex min-w-0 items-center border-r border-[#213021] p-3">
                  <Badge tone={stateTone(confidence.classification)}>{label(value(confidence, "classification", "NOT_AVAILABLE"))}</Badge>
                </div>
                <footer className="flex w-max max-w-max min-w-0 flex-nowrap content-center items-center justify-start gap-1 p-2">
                  <PageLink href={href("research", { instrument, evidence })}>
                    Evidence
                  </PageLink>
                  <PageLink
                    href={href("replay", {
                      instrument,
                      start: value(projection, "eventTimeStart"),
                      end: value(projection, "eventTimeEnd"),
                    })}
                  >
                    Replay
                  </PageLink>
                  <PageLink href={href("scanner", { instrument })}>
                    Scanner
                  </PageLink>
                  <PageLink href={href("trade", { instrument })}>
                    Trade
                  </PageLink>
                </footer>
              </article>
            );
              })}
            </div>
          </div>
        </div>
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="L3 / Capital Flow">
          {etfProjection ? <div className="grid gap-3 sm:grid-cols-3"><div><p className={sectionTitle}>Latest ETF flow</p><p className="mt-1 text-xl font-semibold">{formatEtfUsdMillions(numeric(etf.latestDailyTotalUsd))}</p></div><div><p className={sectionTitle}>Five trading days</p><p className="mt-1 font-semibold">{formatEtfUsdMillions(numeric(etf.fiveTradingDayTotalUsd))}</p></div><div><p className={sectionTitle}>Source date</p><p className="mt-1 font-semibold">{value(etf, "observationDate")}</p></div></div> : <DataStateNotice state="PROJECTION_MISSING" source="Bitcoin ETF flow" affectsConclusion={false} detail="No persisted ETF projection is available." />}
          <p className="mt-3 text-xs text-[var(--qt-color-text-secondary)]">Daily observed context only. Instrument aggressive flow remains separate and no market-wide crypto flow total is invented.</p>
        </Section>
        <Section title="L4 / Derivatives Intelligence">
          <p className="text-sm text-[var(--qt-color-text-secondary)]">
            Open Interest and provider-native Funding remain aligned to each
            governed projection window.
          </p>
        </Section>
        <Section title="L5 / Macro and ETF">
          <DataStateNotice
            state="AVAILABLE"
            source="Supplemental external context"
            affectsConclusion={false}
            detail="Daily FRED, Alpha Vantage, and persisted Farside ETF flow context remains supplemental and does not rewrite crypto Evidence."
          />
        </Section>
        <Section title="L6-L7 / Prediction Markets and Breadth">
          <DataStateNotice
            state="NOT_APPLICABLE"
            source="Markets Projection contract"
            affectsConclusion={false}
            detail="No governed cross-asset breadth or prediction-market aggregate is available in this bounded Markets projection."
          />
        </Section>
      </div>
      <WorkflowFooter>
        <PageLink href={href("scanner")}>Investigate candidates</PageLink>
        <PageLink href={href("research")}>Open Evidence workspace</PageLink>
      </WorkflowFooter>
    </div>
  );
}

function Scanner({
  payload,
  href,
}: {
  payload: RecordValue;
  href: (view: MvpView, extra?: Record<string, string>) => string;
}) {
  const candidates = asList(payload.candidates);
  const lead = asRecord(candidates[0]);
  const leadReasons = codes(lead.ruleReasonCodes);
  const evidenceCategories = [
    ["Market structure", "AVAILABLE", label(value(lead, "assessmentState", "NOT_EVALUABLE"))],
    ["Funding", leadReasons.some((item) => item.includes("FUNDING")) ? "AVAILABLE" : "NOT_APPLICABLE", "Provider-native Funding evidence"],
    ["Open interest", leadReasons.some((item) => item.includes("OI_")) ? "AVAILABLE" : "PARTIAL", "Governed positioning context"],
    ["Liquidations", "UNAVAILABLE", "Optional enrichment is not present"],
    ["ETF", "NOT_APPLICABLE", "Supplemental daily context is outside ranking"],
    ["Macro", "NOT_APPLICABLE", "Supplemental daily context is outside ranking"],
    ["Prediction", "UNAVAILABLE", "No governed Scanner dependency"],
    ["On-chain", "UNAVAILABLE", "No governed source in this projection"],
    ["Exchange", "AVAILABLE", "Binance archive and Segment lineage"],
    ["Research", "AVAILABLE", "Evidence Packet is ready for investigation"],
  ] as const;
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Scanner context toolbar"
        title="Investigation priority queue"
        detail="Comparable governed measurements determine review order; rank does not imply expected profitability."
        actions={
          <Badge tone="info">{candidates.length} governed instruments</Badge>
        }
      />
      <DataStateNotice
        state="AVAILABLE"
        source="Governed ScannerCandidateProjection"
        asOf={payload.eventTimeEnd}
        affectsConclusion={false}
        detail="Rank is investigation priority under comparable Coverage. It is not expected profitability or a trade recommendation."
      />
      <section className={`${surface} grid gap-px overflow-hidden bg-[#213021] sm:grid-cols-2 lg:grid-cols-4`} aria-label="Queue summary">
        {[
          ["Queue state", candidates.length ? "AVAILABLE" : "UNAVAILABLE"],
          ["Active investigations", String(candidates.length)],
          ["Freshness", label(value(lead, "freshness", "UNAVAILABLE"))],
          ["Coverage", lead.coverageComparable === true ? "COMPARABLE" : "NOT COMPARABLE"],
        ].map(([name, item]) => <div className="bg-[#070d07] p-3" key={name}><p className={sectionTitle}>{name}</p><p className="mt-1 text-sm font-semibold">{item}</p></div>)}
      </section>
      <Section
        title="01 / Investigation Priority Queue"
        icon={
          <FileSearch className="h-4 w-4 text-[var(--qt-color-evidence)]" />
        }
      >
        <ol className="divide-y divide-[var(--qt-color-border)]">
          {candidates.length ? (
            candidates.map((item, index) => {
              const candidateRow = asRecord(item),
                candidate = value(candidateRow, "candidateId", ""),
                instrument = value(candidateRow, "instrument", "");
              return (
                <li
                  className="grid min-w-0 gap-3 py-4 first:pt-0 last:pb-0 md:grid-cols-[3rem_9rem_minmax(0,1fr)_auto] md:items-center"
                  key={candidate || index}
                >
                  <span className="text-2xl font-semibold text-[var(--qt-color-text-muted)]">
                    {value(candidateRow, "rank")}
                  </span>
                  <div>
                    <strong className="text-sm text-[var(--qt-color-text-primary)]">
                      {instrument}
                    </strong>
                    <div className="mt-2">
                      <Badge tone={stateTone(candidateRow.assessmentState)}>
                        {label(value(candidateRow, "assessmentState"))}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-secondary)]">
                      {codes(candidateRow.ruleReasonCodes)
                        .map((code) => humanReasonFor(code).label)
                        .join(" · ") ||
                        "No trigger reason; retained for universe completeness"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
                      <span>
                        {formatConfidencePrimary(candidateRow.evidenceStrength)}
                      </span>
                      <span>
                        Counter evidence:{" "}
                        {formatCounterEvidenceStrength(
                          numeric(candidateRow.counterEvidenceStrength),
                        )}
                      </span>
                      <span>
                        Coverage:{" "}
                        {candidateRow.coverageComparable === true
                          ? "Comparable"
                          : "Not comparable"}
                      </span>
                      <span>
                        Freshness: {label(value(candidateRow, "freshness"))}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <PageLink
                      href={href("trade", {
                        candidate,
                        instrument,
                        evidence: value(candidateRow, "evidencePacketId", ""),
                      })}
                    >
                      Decision context
                    </PageLink>
                    <PageLink
                      href={href("research", {
                        instrument,
                        evidence: value(candidateRow, "evidencePacketId", ""),
                      })}
                    >
                      Evidence
                    </PageLink>
                  </div>
                </li>
              );
            })
          ) : (
            <li>
              <DataStateNotice
                state="NOT_APPLICABLE"
                source="ScannerCandidateProjection"
                affectsConclusion={false}
                detail="No comparable candidates qualified for this governed window."
              />
            </li>
          )}
        </ol>
      </Section>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
        <Section title="02 / Canonical Opportunity Card">
          <div className="flex flex-wrap items-start justify-between gap-4 border-l-2 border-[var(--qt-color-evidence)] pl-4">
            <div>
              <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Investigation priority {value(lead, "rank", "-")}</p>
              <strong className="mt-2 block text-2xl">{value(lead, "instrument", "UNAVAILABLE")}</strong>
              <p className="mt-2 max-w-3xl text-sm text-[var(--qt-color-text-secondary)]">
                {leadReasons.map((code) => humanReasonFor(code).label).join(" ") || "No alert-like condition fired; the instrument remains available for governed comparison."}
              </p>
            </div>
            <Badge tone={stateTone(lead.assessmentState)}>{label(value(lead, "assessmentState", "NOT_EVALUABLE"))}</Badge>
          </div>
          <dl className="mt-5 grid gap-px overflow-hidden border border-[#213021] bg-[#213021] sm:grid-cols-4">
            {[
              ["Evidence strength", formatConfidencePrimary(lead.evidenceStrength)],
              ["Freshness", label(value(lead, "freshness"))],
              ["Risk level", formatCounterEvidenceStrength(numeric(lead.counterEvidenceStrength))],
              ["Coverage", lead.coverageComparable === true ? "Comparable" : "Not comparable"],
              ["Supporting", `${leadReasons.length} governed reasons`],
              ["Counter", formatCounterEvidenceStrength(numeric(lead.counterEvidenceStrength))],
              ["Repository", value(lead, "evidencePacketId", "") ? "Evidence linked" : "Unavailable"],
              ["Eligibility", lead.eligibleForRanking === true ? "Rankable" : "Excluded"],
            ].map(([name, item]) => <div className="bg-[#070d07] p-3" key={name}><dt className={sectionTitle}>{name}</dt><dd className="mt-1 text-sm font-semibold">{item}</dd></div>)}
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[var(--qt-color-success)] bg-[#071007] p-3">
            <div><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Suggested next step</p><p className="mt-1 text-sm">Review the Evidence Packet, then validate sequence and counter evidence in Replay.</p></div>
            <PageLink href={href("research", { instrument: value(lead, "instrument", ""), evidence: value(lead, "evidencePacketId", "") })}>Start investigation</PageLink>
          </div>
        </Section>
        <Section title="Opportunity Metadata Rail" className="border-l-2 border-[var(--qt-color-warning)]">
          <dl className="grid gap-px overflow-hidden border border-[#213021] bg-[#213021] text-sm">
            {[
              ["Identity", value(lead, "candidateId", "UNAVAILABLE") ? "Governed candidate" : "Unavailable"],
              ["Symbol / timeframe", `${value(lead, "instrument", "UNAVAILABLE")} / UTC day`],
              ["Direction", label(value(lead, "assessmentState", "NOT_EVALUABLE"))],
              ["Source reason", leadReasons.length ? `${leadReasons.length} mapped reasons` : "No trigger reason"],
              ["Investigation", lead.eligibleForRanking === true ? "Ready" : "Excluded"],
              ["Repository", value(lead, "evidencePacketId", "") ? "Packet linked" : "Unavailable"],
            ].map(([name, item]) => <div className="bg-[#070d07] p-3" key={name}><dt className={sectionTitle}>{name}</dt><dd className="mt-1 break-words font-semibold">{item}</dd></div>)}
          </dl>
        </Section>
      </div>
      <div className="grid gap-4">
        <Section title="03 / Supporting Evidence Grid">
          <div className="grid gap-px overflow-hidden border border-[#213021] bg-[#213021] sm:grid-cols-2 xl:grid-cols-5">
            {evidenceCategories.map(([name, state, detail]) => (
              <article className="min-h-32 bg-[#070d07] p-3" key={name}>
                <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>{name}</p>
                <div className="mt-3"><Badge tone={stateTone(state)}>{label(state)}</Badge></div>
                <p className="mt-3 text-xs text-[var(--qt-color-text-secondary)]">{detail}</p>
              </article>
            ))}
          </div>
        </Section>
        <div className="grid gap-4 xl:grid-cols-2">
        <Section title="04 / Counter Evidence / Risk Factors" className="border-l-2 border-[var(--qt-color-counter-evidence)]">
          <p className="text-lg font-semibold">Review required</p>
          <p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">Counter evidence strength is {formatCounterEvidenceStrength(numeric(lead.counterEvidenceStrength))}. Ranking does not remove alternative explanations.</p>
          <ReasonList values={lead.ruleReasonCodes} empty="No supporting trigger reason was supplied; this itself limits the investigation." />
        </Section>
        <Section title="04 / Coverage and Missing Data" className="border-l-2 border-[var(--qt-color-warning)]">
          <DataStateNotice state={lead.coverageComparable === false ? "GAP" : "AVAILABLE"} source="ScannerCandidateProjection" affectsConclusion={lead.coverageComparable === false} detail="Core market datasets are comparable. Optional liquidation, on-chain, prediction, and news categories remain explicitly unavailable." />
        </Section>
        </div>
        <Section title="05 / Suggested Investigation Path">
          <ol className="grid gap-px overflow-hidden border border-[#213021] bg-[#213021] md:grid-cols-4">
            {[
              ["01", "Evidence", "Verify the governed Facts and reason mapping."],
              ["02", "Replay", "Check temporal order and discrete Funding events."],
              ["03", "Research", "Compare support, opposition, and limitations."],
              ["04", "Decision context", "Carry the same candidate into the non-execution workspace."],
            ].map(([step, title, detail]) => <li className="bg-[#070d07] p-4" key={step}><p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>{step} / {title}</p><p className="mt-3 text-xs text-[var(--qt-color-text-secondary)]">{detail}</p></li>)}
          </ol>
        </Section>
      </div>
      <Section title="06-08 / Related Replay, Related Research, and Repository Handoff">
        <div className="grid gap-px overflow-hidden border border-[#213021] bg-[#213021] md:grid-cols-3">
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Related Replay</p><h3 className="mt-2 text-base font-semibold">What changed first?</h3><PageLink href={href("replay", { instrument: value(lead, "instrument", "") })}>Open bounded sequence</PageLink></article>
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Related Research</p><h3 className="mt-2 text-base font-semibold">Why should I believe it?</h3><PageLink href={href("research", { instrument: value(lead, "instrument", ""), evidence: value(lead, "evidencePacketId", "") })}>Review Evidence</PageLink></article>
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-repository)]`}>Repository handoff</p><h3 className="mt-2 text-base font-semibold">Can I audit the facts?</h3><p className="mt-2 text-xs text-[#6e826e]">Lineage remains available through the governed technical disclosure.</p></article>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-5" aria-label="Investigation timeline">{["Discovered", "Reviewed", "Replayed", "Researched", "Planned"].map((step, index) => <div className="border border-[#213021] bg-[#111911] p-2" key={step}><p className={sectionTitle}>{step}</p><p className="mt-1 font-[var(--qt-font-mono)] text-[9px] text-[#6e826e]">{index === 0 ? "AVAILABLE" : "NOT STARTED"}</p></div>)}</div>
      </Section>
      <WorkflowFooter>
        <PageLink
          href={href("research", {
            instrument: value(lead, "instrument", ""),
            evidence: value(lead, "evidencePacketId", ""),
          })}
        >
          Investigate Evidence
        </PageLink>
        <PageLink
          href={href("trade", {
            instrument: value(lead, "instrument", ""),
            candidate: value(lead, "candidateId", ""),
          })}
        >
          Open Decision Context
        </PageLink>
      </WorkflowFooter>
      <p className="border border-[var(--qt-color-warning)] px-4 py-3 font-[var(--qt-font-mono)] text-[9px] font-bold text-[var(--qt-color-warning)]">SCANNER POLICY / PRIORITIZE INVESTIGATION / NEVER RECOMMEND A TRADE / PRESERVE UNCERTAINTY</p>
    </div>
  );
}

function Trade({
  payload,
  href,
}: {
  payload: RecordValue;
  href: (view: MvpView, extra?: Record<string, string>) => string;
}) {
  const instrument = value(payload, "selectedInstrument"),
    window = asList(payload.relatedReplayWindow).map(String),
    confidence = asRecord(payload.confidence),
    coverage = asRecord(payload.coverage);
  const evidence = codes(payload.evidencePacketIds)[0] ?? "";
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Decision context toolbar"
        title={`${instrument} / ${label(value(payload, "marketState"))}`}
        detail="Governed context only. No execution, position sizing, entry, target, or exit instruction is produced."
        actions={
          <>
            <Badge tone={stateTone(payload.marketState)}>
              {label(value(payload, "marketState"))}
            </Badge>
            <Badge tone="warning">No action</Badge>
          </>
        }
      />
      <section className={`${surface} p-5`}>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div>
            <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>
              01 / Decision Summary · No Execution
            </p>
            <h2 className="mt-2 text-2xl font-semibold">
              {instrument} · {label(value(payload, "marketState"))}
            </h2>
            <p className="mt-2 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
              This workspace organizes evidence and observable invalidation. It
              creates no order, size, entry, or exit instruction.
            </p>
          </div>
          <Badge tone="warning">
            {label(value(payload, "actionState", "CONTEXT_ONLY_NO_ACTION"))}
          </Badge>
        </div>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="02 / Evidence Workspace"
          icon={
            <CheckCircle2 className="h-4 w-4 text-[var(--qt-color-success)]" />
          }
        >
          <ReasonList values={payload.supportingFacts} />
        </Section>
        <Section
          title="03 / Supporting Reasoning and Counter Evidence"
          icon={
            <AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />
          }
        >
          <ReasonList values={payload.counterEvidence} />
        </Section>
        <Section title="04 / Scenario Analysis">
          <InvalidationList values={payload.invalidationConditions} />
        </Section>
        <Section title="05 / Risk Assessment / Evidence Strength">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={stateTone(confidence.classification)}>
              {formatConfidencePrimary(confidence.classification)}
            </Badge>
            <p className="text-sm text-[var(--qt-color-text-secondary)]">
              Evidence strength describes the governed support for this context; it is not a forecast probability.
            </p>
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(confidence)
              .filter(([key]) => key !== "classification" && key !== "semantic")
              .map(([key, item]) => (
                <div key={key}>
                  <dt className={sectionTitle}>{label(key)}</dt>
                  <dd className="mt-1 font-semibold">{formatCounterEvidenceStrength(numeric(item))}</dd>
                </div>
              ))}
          </dl>
        </Section>
        <Section title="05 / Risk Assessment / Coverage and Limitations">
          <dl className="grid gap-3 sm:grid-cols-2">
            {Object.entries(coverage).map(([key, item]) => {
              const score = numeric(item);
              const state = score === null ? "UNAVAILABLE" : score >= 0.95 ? "COMPLETE" : score > 0 ? "PARTIAL" : "GAP";
              return <div key={key}><dt className={sectionTitle}>{label(key)}</dt><dd className="mt-1 font-semibold">{formatCoverageSemantic(state)}</dd></div>;
            })}
          </dl>
          <div className="mt-4 border-t border-[var(--qt-color-border)] pt-4">
            <ReasonList values={payload.sourceLimitations} />
          </div>
        </Section>
      </div>
      <Section
        title="06 / Execution Plan"
        aside={<span className="font-[var(--qt-font-mono)] text-[9px] font-bold text-[var(--qt-color-warning)]">PLANNING ONLY / NO ORDER ENTRY</span>}
      >
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            ["Preparation + confirmation", "Candidate identity verified", "Supporting evidence reviewed", "Counter evidence reviewed", "Observable invalidation reviewed"],
            ["Monitoring + review", "Risk limits remain user supplied", "Coverage warnings acknowledged", "Related Replay reviewed", "Post-decision review remains manual"],
          ].map(([heading, ...items]) => (
            <div className="border border-[#213021] bg-[#070d07] p-3" key={heading}>
              <p className={sectionTitle}>{heading}</p>
              <ul className="mt-2 divide-y divide-[#213021]">
                {items.map((item) => <li className="flex min-h-10 items-center justify-between gap-3 py-2 text-xs" key={item}><span><span className="mr-2 text-[var(--qt-color-warning)]">[ ]</span>{item}</span><span className="font-[var(--qt-font-mono)] text-[9px] text-[#6e826e]">OPEN</span></li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 border-l-2 border-[var(--qt-color-warning)] pl-3 text-xs text-[var(--qt-color-text-secondary)]">Human decision authority remains outside QuantTerminal. This workspace does not place, route, size, or recommend an order.</p>
      </Section>
      <Section title="07 / Investigation Handoffs">
        <p className="text-sm text-[var(--qt-color-text-secondary)]">
          Continue with the same governed instrument and event window.
          Route-specific identities are attached only to their compatible
          destination.
        </p>
      </Section>
      <WorkflowFooter>
        <PageLink
          href={href("research", {
            instrument,
            evidence,
          })}
        >
          Open supporting Evidence
        </PageLink>
        <PageLink
          href={href("replay", {
            instrument,
            start: window[0] ?? "",
            end: window[1] ?? "",
            timestamp: window[0] ?? "",
          })}
        >
          Review related Replay
        </PageLink>
      </WorkflowFooter>
    </div>
  );
}

function TradeV2Workspace({
  payload,
  href,
}: {
  payload: RecordValue;
  href: (view: MvpView, extra?: Record<string, string>) => string;
}) {
  const instrument = value(payload, "selectedInstrument");
  const window = asList(payload.relatedReplayWindow).map(String);
  const confidence = asRecord(payload.confidence);
  const coverage = asRecord(payload.coverage);
  const evidence = codes(payload.evidencePacketIds)[0] ?? "";
  const supporting = codes(payload.supportingFacts);
  const counter = codes(payload.counterEvidence);
  const risks = codes(payload.riskFactors);
  const limitations = codes(payload.sourceLimitations);
  const invalidations = asList(payload.invalidationConditions);
  const coverageComplete = Object.values(coverage).every(
    (item) => (numeric(item) ?? 0) >= 0.95,
  );
  const replayHref = href("replay", {
    instrument,
    start: window[0] ?? "",
    end: window[1] ?? "",
    timestamp: window[0] ?? "",
  });
  const researchHref = href("research", { instrument, evidence });
  return (
    <div className="grid gap-4" data-trade-decision-workspace>
      <Section title="01 / Decision Summary">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(22rem,0.6fr)]">
          <article className="border-l-2 border-[var(--qt-color-evidence)] bg-[#070d07] p-5">
            <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Decision under evaluation</p>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-3xl font-semibold">{instrument} / {label(value(payload, "marketState"))}</h2>
                <p className="mt-3 max-w-4xl text-sm text-[var(--qt-color-text-secondary)]">Governed Facts and counter evidence are organized for review. QuantTerminal does not issue an action, entry, target, size, or execution instruction.</p>
              </div>
              <Badge tone="warning">{label(value(payload, "actionState", "CONTEXT_ONLY_NO_ACTION"))}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <Badge tone={stateTone(confidence.classification)}>{formatConfidencePrimary(confidence.classification)}</Badge>
              <Badge tone={coverageComplete ? "success" : "warning"}>{coverageComplete ? "Coverage complete" : "Coverage limited"}</Badge>
            </div>
            <p className="mt-4 border-t border-[#213021] pt-3 text-xs text-[var(--qt-color-warning)]">Outstanding unknowns remain user-owned: risk tolerance, execution venue, position sizing, and approval authority.</p>
          </article>
          <aside className="border border-[#213021] bg-[#070d07] p-4">
            <p className={sectionTitle}>Decision Readiness</p>
            <dl className="mt-3 divide-y divide-[#213021]">
              {[
                ["Candidate", value(payload, "sourceCandidateIdentity", "") ? "Available" : "Required"],
                ["Evidence", supporting.length ? "Ready" : "Required"],
                ["Replay validation", window.length === 2 ? "Available" : "Required"],
                ["User risk inputs", "Required"],
              ].map(([name, state]) => (
                <div className="flex items-center justify-between gap-4 py-3" key={name}>
                  <dt className="text-xs text-[var(--qt-color-text-secondary)]">{name}</dt>
                  <dd><Badge tone={state === "Ready" || state === "Available" ? "success" : "warning"}>{state}</Badge></dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </Section>

      <Section title="02 / Evidence Workspace" icon={<CheckCircle2 className="h-4 w-4 text-[var(--qt-color-success)]" />}>
        <div className="grid gap-4 xl:grid-cols-3">
          <article className="min-h-56 border border-[#213021] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Supporting Evidence</p>
            <h3 className="mt-3 text-lg font-semibold">{supporting.length ? `${supporting.length} governed observations` : "Unavailable"}</h3>
            <div className="mt-4"><ReasonList values={supporting} /></div>
          </article>
          <article className="min-h-56 border border-[#213021] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-counter-evidence)]`}>Counter Evidence</p>
            <h3 className="mt-3 text-lg font-semibold">{counter.length ? `${counter.length} weakening observations` : "Unavailable"}</h3>
            <div className="mt-4"><ReasonList values={counter} /></div>
          </article>
          <article className="min-h-56 border border-[#213021] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Missing Information</p>
            <h3 className="mt-3 text-lg font-semibold">Decision inputs remain open</h3>
            <div className="mt-4"><ReasonList values={limitations} empty="No source limitation was supplied." /></div>
            <p className="mt-4 text-xs text-[var(--qt-color-warning)]">Shared market context does not supply user risk tolerance or execution authority.</p>
          </article>
        </div>
      </Section>

      <Section title="03 / Supporting Reasoning">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(24rem,0.75fr)]">
          <article className="border border-[#213021] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Reasoning Card</p>
            <h3 className="mt-3 text-lg font-semibold">{label(value(payload, "marketState"))} is the governed context.</h3>
            <p className="mt-3 text-sm text-[var(--qt-color-text-secondary)]">The interpretation organizes the supporting Facts and opposing observations without changing either source truth or the user-owned decision.</p>
            <p className="mt-4 text-xs text-[var(--qt-color-text-muted)]">Evidence references: {supporting.length} supporting / {counter.length} counter</p>
          </article>
          <aside className="border border-[#213021] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Reasoning Boundary</p>
            <h3 className="mt-3 text-lg font-semibold">Facts outrank interpretation.</h3>
            <p className="mt-3 text-sm text-[var(--qt-color-text-secondary)]">Rule-based meaning cannot replace missing Facts, erase counter evidence, or become a recommendation. Confidence describes evidence strength, not future-price probability.</p>
          </aside>
        </div>
      </Section>

      <Section title="04 / Scenario Analysis">
        <div className="grid gap-4 xl:grid-cols-3">
          {[
            ["Base case", "Current context remains under review", "Supporting and counter observations remain materially mixed."],
            ["Upside case", "Not evaluated", "No governed target or directional probability is available."],
            ["Downside case", "Not evaluated", "No governed target or directional probability is available."],
          ].map(([title, summary, detail], index) => (
            <article className="min-h-48 border border-[#213021] bg-[#070d07] p-4" key={title}>
              <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>{title}</p>
              <h3 className="mt-3 text-lg font-semibold">{summary}</h3>
              <p className="mt-3 text-sm text-[var(--qt-color-text-secondary)]">{detail}</p>
              <div className="mt-4 border-t border-[#213021] pt-3">
                {invalidations[index] ? <InvalidationList values={[invalidations[index]]} /> : <DataStateNotice state="NOT_APPLICABLE" affectsConclusion={false} detail="No additional observable condition was supplied." />}
              </div>
            </article>
          ))}
        </div>
      </Section>

      <Section title="05 / Risk Assessment">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <article className="border-l-2 border-[var(--qt-color-counter-evidence)] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-counter-evidence)]`}>Risk Card</p>
            <h3 className="mt-3 text-lg font-semibold">{risks.length ? `${risks.length} governed risk observations` : "Known risks unavailable"}</h3>
            <div className="mt-4"><ReasonList values={risks} /></div>
            <p className="mt-4 text-xs text-[var(--qt-color-warning)]">Confidence is evidence strength and is not a calibrated probability.</p>
          </article>
          <div className="border border-[#213021] bg-[#070d07] p-4">
            <p className={sectionTitle}>Risk Ledger</p>
            <dl className="mt-3 divide-y divide-[#213021]">
              {[
                ["Known risks", risks.length ? `${risks.length} observed` : "Unavailable"],
                ["Unknown risks", "Open"],
                ["Data gaps", limitations.length ? `${limitations.length} classified` : "None reported"],
                ["Macro risks", "Supplemental / not evaluated"],
                ["Liquidity risks", limitations.some((item) => item.includes("ORDERBOOK") || item.includes("LIQUIDATION")) ? "Limited enrichment" : "Unavailable"],
                ["Execution risks", "User supplied"],
              ].map(([name, state]) => <div className="flex items-center justify-between gap-4 py-3" key={name}><dt className="text-xs text-[var(--qt-color-text-secondary)]">{name}</dt><dd className="text-xs font-semibold uppercase text-[var(--qt-color-warning)]">{state}</dd></div>)}
            </dl>
          </div>
        </div>
      </Section>

      <Section title="06 / Execution Plan" aside={<span className="font-[var(--qt-font-mono)] text-[9px] font-bold text-[var(--qt-color-warning)]">PLANNING ONLY / NO ORDER ENTRY</span>}>
        <div className="grid gap-4 xl:grid-cols-2">
          {[
            ["Preparation + confirmation", "Candidate identity verified", "Supporting evidence reviewed", "Counter evidence reviewed", "Confirmation conditions documented", "Invalidation conditions documented"],
            ["Monitoring + review", "Risk limits documented by user", "Monitoring conditions documented", "Data-gap warnings acknowledged", "Post-decision review scheduled", "Repository references attached"],
          ].map(([heading, ...items]) => (
            <div className="border border-[#213021] bg-[#070d07] p-3" key={heading}>
              <p className={sectionTitle}>{heading}</p>
              <ul className="mt-2 divide-y divide-[#213021]">
                {items.map((item) => <li className="flex min-h-10 items-center justify-between gap-3 py-2 text-xs" key={item}><span><span className="mr-2 text-[var(--qt-color-warning)]">[ ]</span>{item}</span><span className="font-[var(--qt-font-mono)] text-[9px] text-[#6e826e]">OPEN</span></li>)}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-3 border-l-2 border-[var(--qt-color-warning)] pl-3 text-xs text-[var(--qt-color-text-secondary)]">Human decision authority remains outside QuantTerminal. This workspace does not place, route, size, or recommend an order.</p>
      </Section>

      <Section title="07 / Investigation Handoffs">
        <div className="grid gap-px overflow-hidden border border-[#213021] bg-[#213021] md:grid-cols-3">
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-repository)]`}>Repository Audit</p><h3 className="mt-2 text-base font-semibold">Verify lineage and Coverage</h3><p className="mt-2 text-xs text-[var(--qt-color-text-secondary)]">Candidate, Facts, Evidence, and limitations remain linked through governed identities.</p></article>
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Supporting Evidence</p><h3 className="mt-2 text-base font-semibold">Review the Evidence Packet</h3><div className="mt-3"><PageLink href={researchHref}>Open Research</PageLink></div></article>
          <article className="bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Replay Handoff</p><h3 className="mt-2 text-base font-semibold">Validate the event sequence</h3><div className="mt-3"><PageLink href={replayHref}>Open Replay</PageLink></div></article>
        </div>
      </Section>
      <WorkflowFooter><PageLink href={researchHref}>Research</PageLink><PageLink href={replayHref}>Replay</PageLink><PageLink href={href("markets", { instrument })}>Markets</PageLink><PageLink href={href("scanner", { instrument })}>Scanner</PageLink></WorkflowFooter>
    </div>
  );
}

function Replay({
  payload,
  projections,
  href,
  instrument,
}: {
  payload: RecordValue;
  projections: unknown[];
  href: (view: MvpView, extra?: Record<string, string>) => string;
  instrument: string;
}) {
  const lanes = asRecord(payload.lanes),
    markers = asList(lanes.evidenceMarkers).map(parseProviderRecord),
    marker = markers[0] ?? {},
    research = projections
      .map(asRecord)
      .find((item) => item.projectionKind === "ResearchEvidenceProjection"),
    confidence = asRecord(asRecord(research?.payload).confidence);
  const start = value(payload, "eventTimeStart", ""),
    end = value(payload, "eventTimeEnd", ""),
    evidence = value(marker, "packetId", "");
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Replay context toolbar"
        title={`${instrument} / Governed event sequence`}
        detail="A synchronized bounded timeline joins price, Open Interest, discrete Funding events, aggregated flow, Evidence, and limitations."
        actions={
          <PageLink
            href={href("research", { instrument, start, end, evidence })}
          >
            Open Research
          </PageLink>
        }
      />
      <ReplaySequenceExperience
        instrument={instrument}
        start={start}
        end={end}
        projectionVersionId={value(payload, "projectionVersionId", "")}
        projectionChecksum={value(
          projections
            .map(asRecord)
            .find(
              (item) => item.projectionKind === "ReplayTimelineProjection",
            ) ?? {},
          "projectionChecksum",
          "",
        )}
        marketState={value(
          lanes,
          "assessmentState",
          value(marker, "state", "NEUTRAL"),
        )}
        evidencePacketId={evidence}
        confidence={value(confidence, "classification", "LOW")}
        researchHref={href("research", { instrument, start, end, evidence })}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="04 / Historical Context">
          <DataStateNotice
            state="NOT_APPLICABLE"
            source="Bounded Replay Projection"
            affectsConclusion={false}
            detail="No ungoverned historical analogy is introduced into the primary event sequence."
          />
        </Section>
        <Section title="05 / Market Structure">
          <DataStateNotice
            state="SOURCE_UNAVAILABLE"
            source="Historical Order Book"
            affectsConclusion={false}
            detail="Historical depth remains unavailable. The protected realtime Order Book path is separate and unchanged."
          />
        </Section>
      </div>
      <WorkflowFooter>
        <PageLink href={href("research", { instrument, start, end, evidence })}>
          06 / Research Evidence
        </PageLink>
        <PageLink href={href("trade", { instrument, start, end })}>
          Decision Context
        </PageLink>
        <PageLink href={href("markets", { instrument })}>
          07 / Market Repository
        </PageLink>
      </WorkflowFooter>
    </div>
  );
}

function Research({
  payload,
  projections,
  href,
  instrument,
}: {
  payload: RecordValue;
  projections: unknown[];
  href: (view: MvpView, extra?: Record<string, string>) => string;
  instrument: string;
}) {
  const macroProjection = projections
    .map(asRecord)
    .find((item) => item.projectionKind === "MacroContextProjection");
  const macro = asRecord(macroProjection?.payload);
  const facts = asRecord(payload.verifiedFacts);
  const confidence = asRecord(payload.confidence);
  const coverage = asRecord(payload.coverage);
  const minimumCoverage = Math.min(
    ...Object.values(coverage)
      .map(numeric)
      .filter((item): item is number => item !== null),
  );
  const start = value(payload, "eventTimeStart", ""),
    end = value(payload, "eventTimeEnd", ""),
    conclusion = label(value(payload, "conclusion"));
  return (
    <div className="grid gap-4">
      <ContextToolbar
        eyebrow="Research context toolbar"
        title={`${instrument} / Evidence workspace`}
        detail="Verified facts, governed interpretation, supporting and counter evidence, Coverage, and audit references remain distinct."
        actions={
          <PageLink
            href={href("replay", { instrument, start, end, timestamp: start })}
          >
            Replay event
          </PageLink>
        }
      />
      <section className={`${surface} border-[var(--qt-color-success)] p-5`}>
        <p className={`${sectionTitle} text-[var(--qt-color-success)]`}>
          01 / Research Summary / Core Research Question
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">{conclusion}</h2>
            <p className="mt-2 max-w-3xl text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
              Price, positioning, provider-native Funding, and bounded
              aggressive flow were evaluated together. The evidence supports
              this state while preserving the opposing observations below.
            </p>
          </div>
          <Badge tone={stateTone(confidence.classification)}>
            {formatConfidencePrimary(confidence.classification)}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--qt-color-text-muted)]">
          <span>{instrument}</span>
          <span>
            {formatTimestamp(start)} to {formatTimestamp(end)}
          </span>
          <PageLink
            href={href("replay", {
              instrument,
              start,
              end,
              timestamp: start,
              evidence: value(payload, "packetId", ""),
            })}
          >
            Replay this sequence
          </PageLink>
        </div>
        <p className="mt-4 max-w-3xl border-t border-[var(--qt-color-border)] pt-3 text-xs text-[var(--qt-color-text-secondary)]">
          Evidence strength describes agreement, Coverage, alignment, and
          counter evidence under governed rules. It is not a probability of
          future price direction.
        </p>
        <dl className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="border border-[#213021] bg-[#111911] p-3"><dt className={sectionTitle}>Current evidence</dt><dd className="mt-1 text-sm font-semibold">{conclusion}</dd></div>
          <div className="border border-[#213021] bg-[#111911] p-3"><dt className={sectionTitle}>Reliability</dt><dd className="mt-1 text-sm font-semibold">{formatConfidencePrimary(confidence.classification)}</dd></div>
          <div className="border border-[#213021] bg-[#111911] p-3"><dt className={sectionTitle}>Next step</dt><dd className="mt-1 text-sm font-semibold text-[var(--qt-color-warning)]">Review counter evidence</dd></div>
        </dl>
      </section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="02 / Evidence Overview / Verified Facts"
          icon={<Database className="h-4 w-4 text-[var(--qt-color-success)]" />}
        >
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className={sectionTitle}>Price move</dt>
              <dd className="mt-1 font-semibold">
                {formatSignedReturn(numeric(facts.priceReturnPct))}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Open interest</dt>
              <dd className="mt-1 font-semibold">
                {formatSignedOpenInterestChange(numeric(facts.oiChangePct))}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Funding</dt>
              <dd className="mt-1 font-semibold">
                {formatFundingRate(numeric(facts.fundingLatestRate))}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Aggressive flow</dt>
              <dd className="mt-1 font-semibold">
                {formatDirectionalFlow(numeric(facts.aggressiveImbalanceRatio))}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Trade count</dt>
              <dd className="mt-1 font-semibold">
                {formatCompactCount(numeric(facts.tradeCount), "trades")}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Realized range</dt>
              <dd className="mt-1 font-semibold">
                {formatSignedReturn(numeric(facts.realizedRangePct))}
              </dd>
            </div>
          </dl>
        </Section>
        <Section
          title="04 / Evidence-Bound Reasoning / Interpretation"
          icon={
            <Activity className="h-4 w-4 text-[var(--qt-color-reasoning)]" />
          }
        >
          <p className="text-lg font-semibold">{conclusion}</p>
          <p className="mt-2 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
            This is a governed interpretation of the verified facts, not a
            provider observation and not a forecast. Supporting and opposing
            observations remain separate below.
          </p>
        </Section>
        <Section
          title="03 / Primary Sources and Supporting Evidence"
          icon={
            <CheckCircle2 className="h-4 w-4 text-[var(--qt-color-success)]" />
          }
        >
          <ReasonList values={payload.supportingEvidence} />
        </Section>
        <Section
          title="05 / Mandatory Counter Evidence"
          icon={
            <AlertTriangle className="h-4 w-4 text-[var(--qt-color-counter-evidence)]" />
          }
        >
          <ReasonList values={payload.counterEvidence} />
        </Section>
        <Section title="Evidence Quality Summary / Reliability">
          <Badge tone={stateTone(confidence.classification)}>
            {formatConfidencePrimary(confidence.classification)}
          </Badge>
          <dl className="mt-4 grid gap-2">
            {Object.entries(asRecord(confidence.components)).map(
              ([key, item]) => (
                <div
                  className="flex items-center justify-between gap-3"
                  key={key}
                >
                  <dt className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)]">
                    {label(key)}
                  </dt>
                  <dd className="text-sm font-semibold">
                    {formatCounterEvidenceStrength(numeric(item))}
                  </dd>
                </div>
              ),
            )}
          </dl>
        </Section>
        <Section title="Evidence Readiness / Coverage">
          <p className="text-lg font-semibold">
            {formatCoverageSemantic(
              !Number.isFinite(minimumCoverage)
                ? "UNAVAILABLE"
                : minimumCoverage >= 0.95
                  ? "COMPLETE"
                  : minimumCoverage > 0
                    ? "PARTIAL"
                    : "GAP",
            )}
          </p>
          <p className="mt-2 text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-secondary)]">
            Minimum aligned Coverage across required datasets.
          </p>
        </Section>
      </div>
      <Section
        title="Supplemental Macro Context"
        icon={
          <Database className="h-4 w-4 text-[var(--qt-color-repository)]" />
        }
      >
        {macroProjection ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="warning">
                {label(value(macro, "classification", "MIXED"))}
              </Badge>
              <span className="text-sm text-[var(--qt-color-text-secondary)]">
                Daily context ·{" "}
                {label(value(macro, "cryptoAssessmentRelationship"))}
              </span>
            </div>
            <p className="mt-3 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
              This FRED and Alpha Vantage context is supplemental. It neither
              changes nor supersedes the crypto Evidence Packet above.
            </p>
          </div>
        ) : (
          <DataStateNotice
            state="PROJECTION_MISSING"
            source="External context"
            affectsConclusion={false}
            detail="No supplemental external context is available for this view."
          />
        )}
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Research Relationship Graph">
          <p className="text-sm text-[var(--qt-color-text-secondary)]">
            The governed source lineage and rule dependencies are summarized
            here; the bounded graph and exact identities remain in Technical
            Evidence.
          </p>
        </Section>
        <Section title="06-07 / Related Research and Repository Audit">
          <p className="text-sm text-[var(--qt-color-text-secondary)]">
            Replay provides the temporal sequence for this same instrument and
            event window. Reproducibility metadata is available below.
          </p>
        </Section>
      </div>
      <details className={`${surface} group`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]">
          <span className="flex items-center gap-2">
            <FileSearch className="h-4 w-4" />
            Technical Evidence
          </span>
          <span className="group-open:hidden">
            Show lineage, versions, and checksums
          </span>
          <span className="hidden group-open:inline">Hide details</span>
        </summary>
        <div className="grid gap-4 border-t border-[var(--qt-color-border)] p-4 lg:grid-cols-2">
          <MetricRows
            data={{
              verifiedFacts: payload.verifiedFacts,
              structuredInterpretation: payload.interpretation,
              sourceLineage: payload.sourceLineage,
            }}
          />
          <MetricRows
            data={{
              packetId: payload.packetId,
              packetVersionId: payload.packetVersionId,
              supersessionStatus: payload.supersessionStatus,
              recomputeIdentity: payload.recomputeIdentity,
              ruleVersions: payload.ruleVersions,
            }}
          />
        </div>
      </details>
    </div>
  );
}

function ResearchV2Workspace({
  payload,
  projections,
  href,
  instrument,
}: {
  payload: RecordValue;
  projections: unknown[];
  href: (view: MvpView, extra?: Record<string, string>) => string;
  instrument: string;
}) {
  const macroProjection = projections.map(asRecord).find((item) => item.projectionKind === "MacroContextProjection");
  const etfProjection = projections.map(asRecord).find((item) => item.projectionKind === "BitcoinEtfFlowProjection");
  const macro = asRecord(macroProjection?.payload);
  const ratesContext = asRecord(macro.ratesContext);
  const equityRiskContext = asRecord(macro.equityRiskContext);
  const etf = asRecord(etfProjection?.payload);
  const facts = asRecord(payload.verifiedFacts);
  const confidence = asRecord(payload.confidence);
  const directCoverage = asRecord(payload.coverage);
  const coverage = Object.keys(directCoverage).length ? directCoverage : asRecord(facts.coverage);
  const start = value(payload, "eventTimeStart", "");
  const end = value(payload, "eventTimeEnd", "");
  const conclusion = label(value(payload, "conclusion"));
  const supporting = codes(payload.supportingEvidence);
  const counter = codes(payload.counterEvidence);
  const minimumCoverage = Math.min(
    ...Object.values(coverage).map(numeric).filter((item): item is number => item !== null),
  );
  const coverageState = !Number.isFinite(minimumCoverage) ? "UNAVAILABLE" : minimumCoverage >= 0.95 ? "AVAILABLE" : minimumCoverage > 0 ? "PARTIAL" : "GAP";
  const categories = [
    ["On-chain", "UNAVAILABLE", "No governed source in this Evidence Packet"],
    ["Exchange Data", "AVAILABLE", "OHLCV, Open Interest, Funding, and AggTrades"],
    ["Macro", macroProjection ? "AVAILABLE" : "UNAVAILABLE", macroProjection ? "Certified daily supplemental context" : "No supplemental Projection"],
    ["ETF", etfProjection ? "AVAILABLE" : "UNAVAILABLE", etfProjection ? `Daily source date ${value(etf, "observationDate")}` : "No persisted ETF Projection"],
    ["Prediction Markets", "UNAVAILABLE", "Not a dependency of this Evidence Packet"],
    ["Government", "UNAVAILABLE", "No governed source attached"],
    ["Company Disclosure", "UNAVAILABLE", "No governed source attached"],
    ["Research Papers", "UNAVAILABLE", "No governed source attached"],
    ["News", "UNAVAILABLE", "No verified news annotation source"],
  ] as const;
  const availableCategories = categories.filter(([, state]) => state === "AVAILABLE").length;
  const replayHref = href("replay", { instrument, start, end, timestamp: start, evidence: value(payload, "packetId", "") });
  return (
    <div className="grid gap-4" data-research-evidence-workspace>
      <Section title="01 / Research Summary">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(24rem,0.55fr)]">
          <article className="border-l-2 border-[var(--qt-color-success)] bg-[#070d07] p-5">
            <p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Core Research Question</p>
            <h2 className="mt-3 text-3xl font-semibold">What evidence supports {conclusion.toLowerCase()} for {instrument}?</h2>
            <p className="mt-3 max-w-4xl text-sm text-[var(--qt-color-text-secondary)]">Price, positioning, provider-native Funding, and bounded aggressive flow were evaluated together. Supporting and opposing observations remain separate.</p>
            <div className="mt-5 grid gap-px overflow-hidden border border-[#213021] bg-[#213021] sm:grid-cols-3">
              {[
                ["Current evidence", conclusion],
                ["Reliability", formatConfidencePrimary(confidence.classification)],
                ["Next step", "Review counter evidence"],
              ].map(([name, item]) => <div className="bg-[#0c140c] p-3" key={name}><p className={sectionTitle}>{name}</p><p className="mt-2 text-sm font-semibold">{item}</p></div>)}
            </div>
          </article>
          <aside className="border border-[#213021] bg-[#070d07] p-4">
            <p className={sectionTitle}>Evidence Quality Summary</p>
            <dl className="mt-3 divide-y divide-[#213021]">
              {[
                ["Confidence", formatConfidencePrimary(confidence.classification)],
                ["Freshness", "Frozen governed window"],
                ["Provenance", "Verified lineage"],
                ["Coverage", formatCoverageSemantic(coverageState)],
                ["Counter evidence", counter.length ? `${counter.length} observations` : "None supplied"],
              ].map(([name, item]) => <div className="flex items-center justify-between gap-4 py-3" key={name}><dt className="text-xs text-[var(--qt-color-text-secondary)]">{name}</dt><dd className="text-xs font-semibold">{item}</dd></div>)}
            </dl>
          </aside>
        </div>
      </Section>

      <Section title="02 / Evidence Overview">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.55fr)]">
          <div>
            <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Evidence Category Matrix</p>
            <div className="mt-3 grid gap-px overflow-hidden border border-[#213021] bg-[#213021] sm:grid-cols-2 xl:grid-cols-3">
              {categories.map(([name, state, detail]) => (
                <article className="min-h-28 bg-[#070d07] p-3" key={name}>
                  <p className={sectionTitle}>{name}</p>
                  <div className="mt-3"><Badge tone={stateTone(state)}>{label(state)}</Badge></div>
                  <p className="mt-3 text-xs text-[var(--qt-color-text-secondary)]">{detail}</p>
                </article>
              ))}
            </div>
          </div>
          <aside className="border-l-2 border-[var(--qt-color-warning)] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>Evidence Readiness</p>
            <h3 className="mt-3 text-2xl font-semibold">{availableCategories} of {categories.length} categories available</h3>
            <dl className="mt-4 divide-y divide-[#213021]">
              {[
                ["Canonical", coverageState === "AVAILABLE" ? "Available" : coverageState],
                ["Partial", "None"],
                ["Experimental", "None required"],
                ["Missing", `${categories.length - availableCategories} categories`],
              ].map(([name, state]) => <div className="flex items-center justify-between py-3" key={name}><dt className="text-xs text-[var(--qt-color-text-secondary)]">{name}</dt><dd className="text-xs font-semibold uppercase">{state}</dd></div>)}
            </dl>
            <div className="mt-4 border border-[var(--qt-color-success)] p-3"><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Next Safe Action</p><p className="mt-2 text-sm">Review the bounded Replay sequence and mandatory counter evidence.</p></div>
          </aside>
        </div>
      </Section>

      <Section title="03 / Primary Sources">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] border-collapse text-left text-xs">
            <thead><tr className="border-b border-[#213021] text-[var(--qt-color-text-muted)]">{["Source", "Category", "Observed", "Confidence", "Freshness", "Availability", "Repository / audit"].map((item) => <th className="px-3 py-3 font-semibold uppercase" key={item}>{item}</th>)}</tr></thead>
            <tbody className="divide-y divide-[#213021]">
              {[
                ["Binance official archives", "Exchange Data", formatUtcDate(end), formatConfidencePrimary(confidence.classification), "Frozen corpus", "AVAILABLE", "Fact and Segment lineage"],
                ["FRED DGS10", "Macro", formatUtcDate(ratesContext.observationDate), "Supplemental", "Daily", macroProjection ? "AVAILABLE" : "UNAVAILABLE", "Macro Projection"],
                ["Alpha Vantage SPY", "Macro", formatUtcDate(equityRiskContext.observationDate), "Supplemental", "Daily", macroProjection ? "AVAILABLE" : "UNAVAILABLE", "Macro Projection"],
                ["Farside Bitcoin ETF Flow", "ETF", value(etf, "observationDate"), "Supplemental", "Daily", etfProjection ? "AVAILABLE" : "UNAVAILABLE", "ETF Projection"],
              ].map((row) => <tr key={row[0]}>{row.map((item, index) => <td className={`px-3 py-3 ${index === 5 ? "font-semibold text-[var(--qt-color-success)]" : "text-[var(--qt-color-text-secondary)]"}`} key={`${row[0]}-${index}`}>{item}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="04-05 / Reasoning and Counter Evidence">
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="border-l-2 border-[var(--qt-color-reasoning)] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-reasoning)]`}>Evidence-Bound Reasoning</p>
            <h3 className="mt-3 text-xl font-semibold">{conclusion}</h3>
            <p className="mt-3 text-sm text-[var(--qt-color-text-secondary)]">This is a governed interpretation of verified Facts, not a provider observation and not a forecast.</p>
            <div className="mt-4"><ReasonList values={supporting} /></div>
            <dl className="mt-4 grid gap-2 border-t border-[#213021] pt-3 sm:grid-cols-2"><div><dt className={sectionTitle}>Supporting Evidence</dt><dd className="mt-1 text-sm">{supporting.length} observations</dd></div><div><dt className={sectionTitle}>Assumptions</dt><dd className="mt-1 text-sm">No missing value becomes zero</dd></div><div><dt className={sectionTitle}>Confidence</dt><dd className="mt-1 text-sm">{formatConfidencePrimary(confidence.classification)}</dd></div><div><dt className={sectionTitle}>Freshness</dt><dd className="mt-1 text-sm">Frozen event window</dd></div></dl>
          </article>
          <article className="border-l-2 border-[var(--qt-color-counter-evidence)] bg-[#070d07] p-4">
            <p className={`${sectionTitle} text-[var(--qt-color-counter-evidence)]`}>Mandatory Counter Evidence</p>
            <h3 className="mt-3 text-xl font-semibold">Alternative explanations remain active</h3>
            <p className="mt-3 text-sm text-[var(--qt-color-text-secondary)]">Opposing observations retain comparable prominence and reduce evidence strength.</p>
            <div className="mt-4"><ReasonList values={counter} /></div>
            <dl className="mt-4 grid gap-2 border-t border-[#213021] pt-3 sm:grid-cols-2"><div><dt className={sectionTitle}>Alternative interpretations</dt><dd className="mt-1 text-sm">{counter.length ? "Present" : "Unavailable"}</dd></div><div><dt className={sectionTitle}>Conflicting datasets</dt><dd className="mt-1 text-sm">None unresolved</dd></div><div><dt className={sectionTitle}>Missing information</dt><dd className="mt-1 text-sm">Optional enrichment unavailable</dd></div><div><dt className={sectionTitle}>Data quality concerns</dt><dd className="mt-1 text-sm">Classified limitations preserved</dd></div></dl>
          </article>
        </div>
      </Section>

      <Section title="Research Relationship Graph">
        <div className="overflow-x-auto py-2" role="img" aria-label="Evidence relationship: verified facts support the research question, governed reasoning interprets the facts, counter evidence opposes the reasoning, and Replay and Repository retain the audit trail.">
          <div className="grid min-w-[980px] grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3">
            <div className="border border-[var(--qt-color-success)] bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Verified Facts</p><p className="mt-2 text-sm">Price / OI / Funding / Flow</p></div>
            <span className="text-xl text-[var(--qt-color-evidence)]" aria-hidden="true">-&gt;</span>
            <div className="border border-[var(--qt-color-evidence)] bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>Research Question</p><p className="mt-2 text-sm">What supports {conclusion.toLowerCase()}?</p></div>
            <span className="text-xl text-[var(--qt-color-counter-evidence)]" aria-hidden="true">&lt;-&gt;</span>
            <div className="grid gap-2"><div className="border border-[var(--qt-color-reasoning)] bg-[#070d07] p-3"><p className={sectionTitle}>Reasoning</p></div><div className="border border-[var(--qt-color-counter-evidence)] bg-[#070d07] p-3"><p className={sectionTitle}>Counter Evidence</p></div></div>
          </div>
          <div className="mx-auto mt-3 grid min-w-[760px] max-w-4xl grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-3 text-center"><div className="border border-[#213021] p-3">Replay</div><span aria-hidden="true">&lt;-&gt;</span><div className="border border-[#213021] p-3">Research Trail</div><span aria-hidden="true">&lt;-&gt;</span><div className="border border-[#213021] p-3">Repository</div></div>
        </div>
      </Section>

      <Section title="06-07 / Related Research and Repository">
        <div className="grid gap-4 xl:grid-cols-2">
          <article className="border border-[#213021] bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-success)]`}>Related Research</p><h3 className="mt-3 text-lg font-semibold">Continue the investigation</h3><dl className="mt-4 divide-y divide-[#213021]">{[["Historical Analogs", "LOAD REQUIRED"], ["Market Memory", "LOAD REQUIRED"], ["Event Impact", "UNAVAILABLE"], ["Saved Research Trails", "NOT APPLICABLE"]].map(([name, state]) => <div className="flex items-center justify-between py-3" key={name}><dt className="text-xs">{name}</dt><dd><Badge tone={stateTone(state)}>{state}</Badge></dd></div>)}</dl><div className="mt-4"><PageLink href={replayHref}>Open related Replay</PageLink></div></article>
          <article className="border border-[#213021] bg-[#070d07] p-4"><p className={`${sectionTitle} text-[var(--qt-color-repository)]`}>Repository Audit</p><h3 className="mt-3 text-lg font-semibold">Verify every claim</h3><dl className="mt-4 divide-y divide-[#213021]">{[["Projection status", "AVAILABLE"], ["Fact records", "AVAILABLE"], ["Source watermark", "AVAILABLE"], ["Repository link", "READY"]].map(([name, state]) => <div className="flex items-center justify-between py-3" key={name}><dt className="text-xs">{name}</dt><dd><Badge tone={stateTone(state)}>{state}</Badge></dd></div>)}</dl></article>
        </div>
      </Section>

      <details className={`${surface} group`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]"><span className="flex items-center gap-2"><FileSearch className="h-4 w-4" />Technical Evidence</span><span className="group-open:hidden">Show lineage, versions, and checksums</span><span className="hidden group-open:inline">Hide details</span></summary>
        <div className="grid gap-4 border-t border-[var(--qt-color-border)] p-4 xl:grid-cols-2"><MetricRows data={{ verifiedFacts: payload.verifiedFacts, structuredInterpretation: payload.interpretation, sourceLineage: payload.sourceLineage }} /><MetricRows data={{ packetId: payload.packetId, packetVersionId: payload.packetVersionId, supersessionStatus: payload.supersessionStatus, recomputeIdentity: payload.recomputeIdentity, ruleVersions: payload.ruleVersions }} /></div>
      </details>
      <WorkflowFooter><PageLink href={replayHref}>Replay</PageLink><PageLink href={href("markets", { instrument })}>Markets</PageLink><PageLink href={href("scanner", { instrument })}>Scanner</PageLink><PageLink href={href("trade", { instrument })}>Trade</PageLink></WorkflowFooter>
    </div>
  );
}

function SharedStatus({
  projections,
  asOf,
}: {
  projections: unknown[];
  asOf: unknown;
}) {
  const rows = projections.map(asRecord),
    coverage = rows.filter(
      (row) => row.projectionKind === "CoverageDataStatusProjection",
    ),
    lineage = rows.filter(
      (row) => row.projectionKind === "SourceLineageSummaryProjection",
    ),
    annotations = rows.filter(
      (row) => row.projectionKind === "EventAnnotationProjection",
    );
  return (
    <details className={`${surface} group`}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2">
        <span className={`${sectionTitle} flex items-center gap-2`}>
          <ShieldCheck className="h-4 w-4 text-[var(--qt-color-success)]" />
          Coverage, lineage, and limitations
        </span>
        <span className="text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)] group-open:hidden">
          {coverage.length} Coverage · {lineage.length} lineage ·{" "}
          {annotations.length} annotations
        </span>
        <span className="hidden text-[var(--qt-type-caption-size)] text-[var(--qt-color-text-muted)] group-open:inline">
          Hide details
        </span>
      </summary>
      <div className="border-t border-[var(--qt-color-border)] p-4">
        <div className="flex flex-wrap gap-2">
          {coverage.slice(0, 24).map((row) => (
            <Badge
              tone={stateTone(asRecord(row.payload).completenessClassification)}
              key={value(row, "projectionVersionId")}
            >
              {value(row, "subjectId")}{" "}
              {label(
                text(
                  asRecord(row.payload).completenessClassification,
                  "AVAILABLE",
                ),
              )}
            </Badge>
          ))}
        </div>
        <p className="mt-4 text-[var(--qt-type-body-size)] text-[var(--qt-color-text-secondary)]">
          Values are governed as of {formatTimestamp(asOf)}. Optional
          liquidation, historical Order Book, and news enrichment remain
          explicitly classified.
        </p>
      </div>
    </details>
  );
}

export default function MvpCutoverPage({ view, candidateReview = false }: { view: MvpView; candidateReview?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<{
    phase: "loading" | "ready" | "error";
    response?: ProjectionResponse;
    reason?: string;
  }>({ phase: "loading" });
  const query = params.toString(),
    instrument = params.get("instrument") || params.get("symbol") || "BTCUSDT";
  useEffect(() => {
    const normalized = normalizeMvpRouteContext(
      view,
      new URLSearchParams(params),
      { candidateReview },
    );
    if (normalized.toString() !== query)
      router.replace(
        `${routes[view]}${normalized.size ? `?${normalized}` : ""}`,
        { scroll: false },
      );
  }, [candidateReview, params, query, router, view]);
  useEffect(() => {
    const controller = new AbortController(),
      request = mvpApiQuery(view, new URLSearchParams(params), { candidateReview });
    setState({ phase: "loading" });
    fetch(`/api/mvp/projections?${request.toString()}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        let body: ProjectionResponse;
        try {
          body = await response.json();
        } catch {
          throw new Error("Projection response was not JSON.");
        }
        if (!response.ok && body.status !== "ROLLBACK_ACTIVE")
          throw new Error(
            text(body.reason, `Projection read failed (${response.status}).`),
          );
        setState({ phase: "ready", response: body });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError")
          setState({
            phase: "error",
            reason:
              error instanceof Error
                ? error.message
                : "Projection read failed.",
          });
      });
    return () => controller.abort();
  }, [candidateReview, view, query, params]);
  const href = useMemo(
    () =>
      (target: MvpView, extra: Record<string, string> = {}) =>
        buildMvpRouteHref(target, new URLSearchParams(params), extra, { candidateReview }),
    [candidateReview, params],
  );
  if (state.phase === "loading") return <MvpCutoverLoadingShell view={view} />;
  if (state.phase === "error")
    return <Status kind="READ ERROR" reason={state.reason} />;
  const response = state.response!,
    status = text(response.status, "READY");
  if (status === "ROLLBACK_ACTIVE") {
    const LegacyPage = Legacy[view];
    return <LegacyPage />;
  }
  if (["MISSING", "PROJECTION_MISSING", "NOT_FOUND"].includes(status))
    return <Status kind="MISSING" reason={text(response.reason)} />;
  if (
    [
      "BLOCKED",
      "SOURCE_BLOCKED",
      "WITHHELD",
      "PROJECTION_WITHHELD",
      "CUTOVER_NOT_AUTHORIZED",
    ].includes(status)
  )
    return <Status kind="BLOCKED" reason={text(response.reason)} />;
  if (status !== "READY" && status !== "AVAILABLE" && status !== "SUCCESS")
    return <Status kind="UNAVAILABLE" reason={text(response.reason, status)} />;
  const primaryKinds: Record<MvpView, string> = {
    dashboard: "DashboardMarketStateProjection",
    markets: "InstrumentMarketSummaryProjection",
    scanner: "ScannerCandidateProjection",
    trade: "TradeDecisionContextProjection",
    replay: "ReplayTimelineProjection",
    research: "ResearchEvidenceProjection",
  };
  const projections = asList(response.projections),
    primary = asRecord(
      projections.find(
        (item) => asRecord(item).projectionKind === primaryKinds[view],
      ) ??
        response.data ??
        response.payload,
    );
  const payload = {
    ...asRecord(primary.payload),
    eventTimeStart: primary.eventTimeStart,
    eventTimeEnd: primary.eventTimeEnd,
    knowledgeTimeCutoff: primary.knowledgeTimeCutoff,
    projectionVersionId: primary.projectionVersionId,
    limitations: primary.limitations,
  };
  const summaryProjection = projections
    .map(asRecord)
    .find(
      (item) =>
        item.projectionKind === "InstrumentMarketSummaryProjection" &&
        item.subjectId === instrument,
    );
  const referenceValue = asRecord(
    asRecord(summaryProjection?.payload).latestGovernedPrice,
  ).close;
  const body =
    view === "dashboard" ? (
      <div className="grid gap-4">
        <Dashboard payload={payload} projections={projections} href={href} />
        <FeaturedDemoEvent />
      </div>
    ) : view === "markets" ? (
      <Markets projections={projections} href={href} />
    ) : view === "scanner" ? (
      <Scanner payload={payload} href={href} />
    ) : view === "trade" ? (
      <TradeV2Workspace payload={payload} href={href} />
    ) : view === "replay" ? (
      <Replay
        payload={payload}
        projections={projections}
        href={href}
        instrument={instrument}
      />
    ) : (
      <ResearchV2Workspace
        payload={payload}
        projections={projections}
        href={href}
        instrument={instrument}
      />
    );
  const selectInstrument = (nextInstrument: string) => {
    const next = new URLSearchParams(params);
    next.set("instrument", nextInstrument);
    next.delete("symbol");
    next.delete("candidate");
    next.delete("projection");
    router.push(`${routes[view]}?${next.toString()}`);
  };
  return (
    <main
      data-qt-foundation="mvp-cutover"
      className="min-h-screen overflow-x-hidden bg-[var(--qt-color-background)] px-3 py-4 font-[var(--qt-font-sans)] text-[var(--qt-color-text-primary)] sm:px-4 xl:px-5"
    >
      <div className="mr-auto grid w-full max-w-[1660px] gap-4" data-governed-workspace>
        <header
          className={`${surface} grid min-h-[72px] gap-3 px-4 py-3 lg:grid-cols-[330px_minmax(0,1fr)_auto] lg:items-center`}
        >
          <div className="min-w-0">
            <p className="font-[var(--qt-font-mono)] text-[9px] font-bold uppercase text-cyan-400">{pageMeta[view].eyebrow}</p>
            <h1 className="mt-0.5 text-2xl font-bold leading-7 text-[#d6e0d6]">{pageMeta[view].title}</h1>
          </div>
          <div className="min-w-0 border border-[#213021] bg-[#070d07] px-3 py-2">
            <p className="truncate text-xs text-[#a0b0a0]">{pageMeta[view].detail}</p>
            <p className="mt-1 truncate font-[var(--qt-font-mono)] text-[9px] text-[#6e826e]">
              {instrument} / {formatTimestamp(payload.eventTimeStart)} / {codes(payload.limitations).length} limitations
            </p>
          </div>
          {!["dashboard", "markets", "scanner"].includes(view) ? (
            <label
              className="grid gap-1 text-[var(--qt-type-caption-size)] font-semibold text-[var(--qt-color-text-secondary)]"
              htmlFor="governed-instrument"
            >
              Instrument
              <select
                id="governed-instrument"
                value={instrument}
                onChange={(event) => selectInstrument(event.target.value)}
                className="min-h-11 min-w-36 rounded-[2px] border border-[#213021] bg-[#070d07] px-3 font-[var(--qt-font-mono)] text-xs text-[#d6e0d6]"
              >
                {instruments.map((symbol) => (
                  <option key={symbol}>{symbol}</option>
                ))}
              </select>
            </label>
          ) : null}
        </header>
        {["dashboard", "markets", "trade"].includes(view) ? (
          <LiveOverlay
            instrument={instrument}
            referenceValue={referenceValue}
            projectionAsOf={payload.eventTimeEnd}
          />
        ) : null}
        {body}
        <SharedStatus projections={projections} asOf={payload.eventTimeEnd} />
      </div>
    </main>
  );
}
