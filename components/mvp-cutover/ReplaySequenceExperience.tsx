"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CirclePause,
  CirclePlay,
  Database,
  ExternalLink,
  Pause,
  Play,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/foundation/badge";
import {
  formatCompactCount,
  formatDirectionalFlow,
  formatFundingRate,
  formatPlainNumber,
  formatPrice,
  formatSignedOpenInterestChange,
  formatSignedReturn,
} from "@/lib/presentation/financialFormatting";
import type {
  ReplayFlowBucket,
  ReplayPoint,
  ReplayPricePoint,
  ReplaySequenceModel,
} from "@/lib/replay-sequence";

type Phase =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly reason: string }
  | { readonly status: "ready"; readonly model: ReplaySequenceModel };
type Lane = "price" | "openInterest" | "funding" | "flow";
const lanes: readonly Lane[] = ["price", "openInterest", "funding", "flow"];
const laneLabels: Record<Lane, string> = {
  price: "Price",
  openInterest: "Open interest",
  funding: "Funding events",
  flow: "Aggressive flow",
};
const surface =
  "min-w-0 rounded-[var(--qt-radius-card)] border border-[var(--qt-color-border)] bg-[var(--qt-color-surface)]";
const sectionTitle =
  "text-[var(--qt-type-caption-size)] font-bold uppercase text-[var(--qt-color-text-secondary)]";
const timestamp = (value: string) =>
  new Date(value).toISOString().replace(".000Z", "Z");

function scale(values: readonly number[], height: number) {
  const minimum = Math.min(...values),
    maximum = Math.max(...values),
    range = maximum - minimum || 1;
  return (value: number) =>
    height - 12 - ((value - minimum) / range) * (height - 24);
}

function LineLane({
  points,
  cursorTime,
  color,
  label,
}: {
  readonly points: readonly ReplayPoint[];
  readonly cursorTime: number;
  readonly color: string;
  readonly label: string;
}) {
  const width = 1000,
    height = 132,
    start = Date.parse(points[0]?.eventTime ?? ""),
    end = Date.parse(points.at(-1)?.eventTime ?? "") || start + 1;
  const y = scale(
      points.map((point) => point.value),
      height,
    ),
    x = (time: string) =>
      ((Date.parse(time) - start) / (end - start || 1)) * width;
  const path = points
    .map(
      (point, index) =>
        `${index ? "L" : "M"}${x(point.eventTime).toFixed(2)},${y(point.value).toFixed(2)}`,
    )
    .join(" ");
  const cursorX = ((cursorTime - start) / (end - start || 1)) * width;
  return (
    <svg
      role="img"
      aria-label={`${label} timeline with ${points.length} source-derived samples`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[132px] w-full overflow-visible"
      preserveAspectRatio="none"
    >
      <title>{label} timeline</title>
      <path d="M0 110 H1000" stroke="var(--qt-color-border)" strokeWidth="1" />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={cursorX}
        x2={cursorX}
        y1="0"
        y2={height}
        stroke="var(--qt-color-focus)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function FundingLane({
  model,
  cursorTime,
}: {
  readonly model: ReplaySequenceModel;
  readonly cursorTime: number;
}) {
  const width = 1000,
    height = 86,
    start = Date.parse(model.eventTimeStart),
    end = Date.parse(model.eventTimeEnd),
    cursorX = ((cursorTime - start) / (end - start)) * width;
  return (
    <svg
      role="img"
      aria-label={`${model.funding.length} discrete provider-native Funding events`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[86px] w-full"
      preserveAspectRatio="none"
    >
      <title>Provider-native Funding event markers</title>
      <path d="M0 43 H1000" stroke="var(--qt-color-border)" />
      <line
        x1={cursorX}
        x2={cursorX}
        y1="0"
        y2={height}
        stroke="var(--qt-color-focus)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
      {model.funding.map((event) => {
        const x =
          ((Date.parse(event.eventTime) - start) / (end - start)) * width;
        return (
          <g key={event.eventTime}>
            <line
              x1={x}
              x2={x}
              y1="18"
              y2="68"
              stroke="var(--qt-color-evidence)"
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={x}
              cy="43"
              r="7"
              fill="var(--qt-color-evidence)"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

function FlowLane({
  buckets,
  cursorTime,
  start,
  end,
}: {
  readonly buckets: readonly ReplayFlowBucket[];
  readonly cursorTime: number;
  readonly start: string;
  readonly end: string;
}) {
  const width = 1000,
    height = 116,
    startTime = Date.parse(start),
    endTime = Date.parse(end),
    max = Math.max(...buckets.map((bucket) => bucket.tradeCount), 1),
    barWidth = width / Math.max(buckets.length, 1),
    cursorX = ((cursorTime - startTime) / (endTime - startTime)) * width;
  return (
    <svg
      role="img"
      aria-label={`${buckets.length} bounded aggressive-flow buckets; no raw AggTrades events`}
      viewBox={`0 0 ${width} ${height}`}
      className="h-[116px] w-full"
      preserveAspectRatio="none"
    >
      <title>Aggressive flow, aggregated into 30-minute buckets</title>
      <path d="M0 104 H1000" stroke="var(--qt-color-border)" />
      {buckets.map((bucket, index) => {
        const barHeight = Math.max(2, (bucket.tradeCount / max) * 86),
          positive = (bucket.imbalanceRatio ?? 0) >= 0;
        return (
          <rect
            key={bucket.bucketId}
            x={index * barWidth + 1}
            y={104 - barHeight}
            width={Math.max(1, barWidth - 2)}
            height={barHeight}
            fill={
              positive
                ? "var(--qt-color-success)"
                : "var(--qt-color-counter-evidence)"
            }
            opacity="0.75"
          />
        );
      })}
      <line
        x1={cursorX}
        x2={cursorX}
        y1="0"
        y2={height}
        stroke="var(--qt-color-focus)"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function nearest<T extends { readonly eventTime: string }>(
  values: readonly T[],
  target: number,
): T | null {
  return values.reduce<T | null>(
    (best, item) =>
      !best ||
      Math.abs(Date.parse(item.eventTime) - target) <
        Math.abs(Date.parse(best.eventTime) - target)
        ? item
        : best,
    null,
  );
}

export function ReplaySequenceExperience({
  instrument,
  start,
  end,
  projectionVersionId,
  projectionChecksum,
  marketState,
  evidencePacketId,
  confidence,
  researchHref,
}: {
  readonly instrument: string;
  readonly start: string;
  readonly end: string;
  readonly projectionVersionId: string;
  readonly projectionChecksum: string;
  readonly marketState: string;
  readonly evidencePacketId: string;
  readonly confidence: string;
  readonly researchHref: string;
}) {
  const params = useSearchParams(),
    router = useRouter(),
    [phase, setPhase] = useState<Phase>({ status: "loading" }),
    [playing, setPlaying] = useState(false),
    [activeLane, setActiveLane] = useState<Lane>("price"),
    timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const initial = Number.isFinite(Date.parse(params.get("timestamp") ?? ""))
    ? Date.parse(params.get("timestamp")!)
    : Date.parse(start);
  const [cursorTime, setCursorTime] = useState(initial);
  useEffect(() => {
    const controller = new AbortController(),
      query = new URLSearchParams({
        instrument,
        start,
        end,
        projection: projectionVersionId,
      });
    setPhase({ status: "loading" });
    fetch(`/api/mvp/replay-sequence?${query}`, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok || body.status !== "AVAILABLE")
          throw new Error(body.reason ?? "Replay sequence unavailable.");
        setPhase({ status: "ready", model: body as ReplaySequenceModel });
      })
      .catch((error: unknown) => {
        if ((error as { name?: string }).name !== "AbortError")
          setPhase({
            status: "error",
            reason:
              error instanceof Error
                ? error.message
                : "Replay sequence unavailable.",
          });
      });
    return () => controller.abort();
  }, [instrument, start, end, projectionVersionId]);
  const setCursor = useCallback(
    (next: number, writeUrl = true) => {
      const bounded = Math.min(
        Date.parse(end) - 1,
        Math.max(Date.parse(start), next),
      );
      setCursorTime(bounded);
      if (writeUrl) {
        const query = new URLSearchParams(params);
        query.set("timestamp", new Date(bounded).toISOString());
        router.replace(`/replay?${query}`, { scroll: false });
      }
    },
    [end, params, router, start],
  );
  useEffect(() => {
    if (!playing) return;
    timer.current = setInterval(
      () =>
        setCursorTime((current) =>
          current >= Date.parse(end) - 300_000
            ? (setPlaying(false), current)
            : current + 300_000,
        ),
      450,
    );
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, end]);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );
  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      setCursor(cursorTime + (event.key === "ArrowLeft" ? -300_000 : 300_000));
    }
    if (event.key === " ") {
      event.preventDefault();
      setPlaying((value) => !value);
    }
  };
  if (phase.status === "loading")
    return (
      <div className={`${surface} p-6`} role="status">
        <p className="font-semibold">Building bounded event sequence</p>
        <p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">
          Reading source-derived samples from the exact governed window.
        </p>
      </div>
    );
  if (phase.status === "error")
    return (
      <div
        className={`${surface} border-[var(--qt-color-danger)] p-6`}
        role="alert"
      >
        <p className="font-semibold">Replay sequence unavailable</p>
        <p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">
          {phase.reason}
        </p>
      </div>
    );
  const model = phase.model;
  if (model.sourceProjectionChecksum !== projectionChecksum)
    return (
      <div className={`${surface} p-6`} role="alert">
        Projection checksum mismatch. Replay was withheld.
      </div>
    );
  const price = nearest(model.price, cursorTime),
    oi = nearest(model.openInterest, cursorTime),
    funding =
      [...model.funding]
        .filter((item) => Date.parse(item.eventTime) <= cursorTime)
        .at(-1) ?? null,
    flow = nearest(model.flow, cursorTime),
    startPrice = model.price[0]?.close ?? null,
    priceReturn =
      price && startPrice ? (price.close / startPrice - 1) * 100 : null,
    startOi = model.openInterest[0]?.value ?? null,
    oiChange = oi && startOi ? (oi.value / startOi - 1) * 100 : null;
  const visible = (lane: Lane) =>
    activeLane === lane ? "block" : "hidden lg:block";
  return (
    <div className="grid gap-4" onKeyDown={onKey}>
      <section className={`${surface} order-1 border-[var(--qt-color-warning)] p-5`}>
        <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>
          01 / Replay Summary
        </p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold">
              {instrument} positioning changed as price and flow developed
            </h2>
            <p className="mt-2 text-sm text-[var(--qt-color-text-secondary)]">
              Follow the governed sequence across price, positioning, Funding,
              and aggressive flow. Opposing observations remain visible.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="warning">{marketState.replace(/_/g, " ")}</Badge>
            <Badge tone="info">Evidence strength: {confidence}</Badge>
          </div>
        </div>
      </section>
      <section
        className={`${surface} order-3 p-4`}
        aria-labelledby="event-sequence-title"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>
              03 / Reasoning Timeline
            </p>
            <h2
              id="event-sequence-title"
              className="mt-1 text-lg font-semibold"
            >
              What changed, in governed order
            </h2>
          </div>
          <span className="text-xs text-[var(--qt-color-text-muted)]">
            {timestamp(start)} to {timestamp(end)} UTC
          </span>
        </div>
        <ol className="mt-4 grid gap-2 lg:grid-cols-5">
          {model.sequence.map((step) => (
            <li
              className="border-l-2 border-[var(--qt-color-evidence)] pl-3"
              key={step.sequence}
            >
              <span className="text-[10px] font-bold text-[var(--qt-color-text-muted)]">
                0{step.sequence} · {timestamp(step.eventTime).slice(11, 16)} UTC
              </span>
              <p className="mt-1 text-xs text-[var(--qt-color-text-secondary)]">
                {step.statement}
              </p>
            </li>
          ))}
        </ol>
      </section>
      <section
        className={`${surface} order-2 overflow-hidden`}
        aria-labelledby="timeline-title"
      >
        <header className="grid gap-3 border-b border-[var(--qt-color-border)] p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className={`${sectionTitle} text-[var(--qt-color-warning)]`}>
              02 / Primary Evidence Timeline
            </p>
            <h2 id="timeline-title" className="mt-1 text-lg font-semibold">
              {timestamp(new Date(cursorTime).toISOString())} UTC
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <button
              title="Step backward five minutes"
              aria-label="Step backward five minutes"
              className="min-h-11 min-w-11 border border-[var(--qt-color-border)] p-2"
              onClick={() => setCursor(cursorTime - 300_000)}
            >
              <ChevronLeft className="mx-auto h-4 w-4" />
            </button>
            <button
              title={playing ? "Pause Replay" : "Play Replay"}
              aria-label={playing ? "Pause Replay" : "Play Replay"}
              className="flex min-h-11 items-center gap-2 border border-[var(--qt-color-warning)] px-3 text-xs font-semibold text-[var(--qt-color-warning)]"
              onClick={() => setPlaying((value) => !value)}
            >
              {playing ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {playing ? "Pause" : "Play"}
            </button>
            <button
              title="Step forward five minutes"
              aria-label="Step forward five minutes"
              className="min-h-11 min-w-11 border border-[var(--qt-color-border)] p-2"
              onClick={() => setCursor(cursorTime + 300_000)}
            >
              <ChevronRight className="mx-auto h-4 w-4" />
            </button>
          </div>
        </header>
        <div className="border-b border-[var(--qt-color-border)] p-4">
          <label htmlFor="sequence-cursor" className="sr-only">
            Selected Replay timestamp
          </label>
          <input
            id="sequence-cursor"
            type="range"
            min={Date.parse(start)}
            max={Date.parse(end) - 300_000}
            step={300_000}
            value={cursorTime}
            onChange={(event) => setCursor(Number(event.target.value), false)}
            onPointerUp={() => setCursor(cursorTime)}
            className="min-h-11 w-full accent-[var(--qt-color-warning)]"
            aria-valuetext={`${timestamp(new Date(cursorTime).toISOString())} UTC`}
          />
        </div>
        <div
          className="flex gap-1 overflow-x-auto border-b border-[var(--qt-color-border)] p-2 lg:hidden"
          aria-label="Timeline lane"
        >
          <div className="flex min-w-max">
            {lanes.map((lane) => (
              <button
                key={lane}
                onClick={() => setActiveLane(lane)}
                className={`min-h-11 border px-3 text-xs ${activeLane === lane ? "border-[var(--qt-color-warning)] text-[var(--qt-color-warning)]" : "border-[var(--qt-color-border)] text-[var(--qt-color-text-secondary)]"}`}
              >
                {laneLabels[lane]}
              </button>
            ))}
          </div>
        </div>
        <div className="grid min-w-0">
          <div
            className={`${visible("price")} border-b border-[var(--qt-color-border)] p-3`}
          >
            <div className="mb-2 flex justify-between">
              <strong className="text-xs">Price</strong>
              <span className="text-xs text-[var(--qt-color-text-muted)]">
                {formatPrice(price?.close ?? null)} ·{" "}
                {formatSignedReturn(priceReturn)}
              </span>
            </div>
            <LineLane
              points={model.price}
              cursorTime={cursorTime}
              color="var(--qt-color-warning)"
              label="Price"
            />
          </div>
          <div
            className={`${visible("openInterest")} border-b border-[var(--qt-color-border)] p-3`}
          >
            <div className="mb-2 flex justify-between">
              <strong className="text-xs">Open interest</strong>
              <span className="text-xs text-[var(--qt-color-text-muted)]">
                {formatPlainNumber(oi?.value ?? null, 2)} ·{" "}
                {formatSignedOpenInterestChange(oiChange)}
              </span>
            </div>
            <LineLane
              points={model.openInterest}
              cursorTime={cursorTime}
              color="var(--qt-color-repository)"
              label="Open interest"
            />
          </div>
          <div
            className={`${visible("funding")} border-b border-[var(--qt-color-border)] p-3`}
          >
            <div className="mb-2 flex justify-between">
              <strong className="text-xs">
                Funding · discrete provider events
              </strong>
              <span className="text-xs text-[var(--qt-color-text-muted)]">
                {funding
                  ? `${timestamp(funding.eventTime).slice(11, 16)} UTC · ${formatFundingRate(funding.value)}`
                  : "No event yet"}
              </span>
            </div>
            <FundingLane model={model} cursorTime={cursorTime} />
          </div>
          <div className={`${visible("flow")} p-3`}>
            <div className="mb-2 flex justify-between">
              <strong className="text-xs">
                Aggressive flow · 30-minute buckets
              </strong>
              <span className="text-xs text-[var(--qt-color-text-muted)]">
                {flow
                  ? `${formatDirectionalFlow(flow.imbalanceRatio)} · ${formatCompactCount(flow.tradeCount, "trades")}`
                  : "UNAVAILABLE"}
              </span>
            </div>
            <FlowLane
              buckets={model.flow}
              cursorTime={cursorTime}
              start={start}
              end={end}
            />
          </div>
        </div>
      </section>
      <div className="order-4 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <section className={`${surface} p-4`}>
          <p className={`${sectionTitle} text-[var(--qt-color-evidence)]`}>
            Cursor detail
          </p>
          <h2 className="mt-1 text-lg font-semibold">
            State at {timestamp(new Date(cursorTime).toISOString())} UTC
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className={sectionTitle}>Price</dt>
              <dd className="mt-1 font-semibold">
                {formatPrice(price?.close ?? null)}
              </dd>
              <p className="text-xs text-[var(--qt-color-text-muted)]">
                {formatSignedReturn(priceReturn)} from event start
              </p>
            </div>
            <div>
              <dt className={sectionTitle}>Open interest</dt>
              <dd className="mt-1 font-semibold">
                {formatPlainNumber(oi?.value ?? null, 2)}
              </dd>
              <p className="text-xs text-[var(--qt-color-text-muted)]">
                {formatSignedOpenInterestChange(oiChange)} from baseline
              </p>
            </div>
            <div>
              <dt className={sectionTitle}>Nearest Funding event</dt>
              <dd className="mt-1 font-semibold">
                {formatFundingRate(funding?.value ?? null)}
              </dd>
              <p className="text-xs text-[var(--qt-color-text-muted)]">
                {funding ? timestamp(funding.eventTime) : "No prior event"}
              </p>
            </div>
            <div>
              <dt className={sectionTitle}>Aggressive flow</dt>
              <dd className="mt-1 font-semibold">
                {formatDirectionalFlow(flow?.imbalanceRatio ?? null)}
              </dd>
              <p className="text-xs text-[var(--qt-color-text-muted)]">
                {formatCompactCount(flow?.tradeCount ?? null, "trades")}
              </p>
            </div>
            <div>
              <dt className={sectionTitle}>Governed state</dt>
              <dd className="mt-1 font-semibold">
                {marketState.replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt className={sectionTitle}>Coverage</dt>
              <dd className="mt-1 font-semibold">Complete bounded window</dd>
            </div>
          </dl>
        </section>
        <section className={`${surface} p-4`}>
          <p
            className={`${sectionTitle} text-[var(--qt-color-counter-evidence)]`}
          >
            Evidence at this window
          </p>
          <div className="mt-4 grid gap-3">
            <div className="flex gap-2">
              <CirclePlay className="mt-0.5 h-4 w-4 text-[var(--qt-color-success)]" />
              <p className="text-sm">
                Positioning and price moved together during the selected event.
              </p>
            </div>
            <div className="flex gap-2">
              <CirclePause className="mt-0.5 h-4 w-4 text-[var(--qt-color-counter-evidence)]" />
              <p className="text-sm">
                Funding and flow did not meet the full overheating condition.
              </p>
            </div>
          </div>
          <Link
            href={researchHref}
            className="mt-5 inline-flex min-h-11 items-center gap-2 border border-[var(--qt-color-evidence)] px-3 text-xs font-semibold text-[var(--qt-color-evidence)]"
          >
            Inspect governed Evidence <ExternalLink className="h-4 w-4" />
          </Link>
        </section>
      </div>
      <section className={`${surface} order-5 p-4`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--qt-color-warning)]" />
          <div>
            <h2 className="text-sm font-semibold">Known limitations</h2>
            <p className="mt-1 text-xs text-[var(--qt-color-text-secondary)]">
              Liquidation history, historical depth, and verified news
              annotations are unavailable in this bounded Replay. Daily FRED and
              SPY observations remain supplemental context and are not drawn as
              intraday lanes.
            </p>
          </div>
        </div>
      </section>
      <details className={`${surface} order-6 group`}>
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-xs font-bold uppercase text-[var(--qt-color-text-secondary)]">
          <span className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Technical timeline evidence
          </span>
          <span className="group-open:hidden">Show bounded identities</span>
          <span className="hidden group-open:inline">Hide details</span>
        </summary>
        <dl className="grid gap-2 border-t border-[var(--qt-color-border)] p-4 text-xs sm:grid-cols-2">
          <div>
            <dt className={sectionTitle}>Projection version</dt>
            <dd className="mt-1 break-all">{projectionVersionId}</dd>
          </div>
          <div>
            <dt className={sectionTitle}>Projection checksum</dt>
            <dd className="mt-1 break-all">{projectionChecksum}</dd>
          </div>
          <div>
            <dt className={sectionTitle}>Evidence packet</dt>
            <dd className="mt-1 break-all">{evidencePacketId}</dd>
          </div>
          <div>
            <dt className={sectionTitle}>Presentation checksum</dt>
            <dd className="mt-1 break-all">{model.modelChecksum}</dd>
          </div>
          <div>
            <dt className={sectionTitle}>Sample bounds</dt>
            <dd className="mt-1">
              {model.sampleCounts.price} price ·{" "}
              {model.sampleCounts.openInterest} OI ·{" "}
              {model.sampleCounts.funding} Funding · {model.sampleCounts.flow}{" "}
              flow
            </dd>
          </div>
          <div>
            <dt className={sectionTitle}>Raw AggTrades in browser</dt>
            <dd className="mt-1">0</dd>
          </div>
        </dl>
      </details>
    </div>
  );
}
