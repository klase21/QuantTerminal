"use client";

import { useMemo, type ReactNode } from "react";

import type { SectorRotationSnapshot } from "@/core/marketDataTypes";
import { useSectorRotationFeed } from "@/hooks/useSectorRotationFeed";

function formatMetric(value: unknown, digits = 2) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "--";
  return number.toFixed(digits);
}

function formatAge(iso?: string) {
  if (!iso) return "--";
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff) || diff < 0) return "now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function healthTone(status?: string) {
  switch (status) {
    case "healthy":
    case "live":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "partial":
    case "stale":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "degraded":
      return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    case "error":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-800 bg-zinc-900 text-zinc-400";
  }
}

function transportTone(status?: string) {
  switch (status) {
    case "connected":
      return "text-emerald-300";
    case "error":
      return "text-red-300";
    case "fallback":
    case "connecting":
      return "text-amber-300";
    default:
      return "text-zinc-500";
  }
}

function verdictFromSurface(topSector?: SectorRotationSnapshot) {
  if (!topSector) {
    return {
      label: "SCANNING MARKET",
      detail: "Waiting for live rotation data before forming a tactical read.",
      action: "Do not force trades until live context is available.",
      tone: "border-zinc-700 bg-zinc-900/70 text-zinc-300",
    };
  }

  if (topSector.direction === "INFLOW" && topSector.confidence >= 72) {
    return {
      label: "ALT ROTATION ACTIVE",
      detail: `${topSector.sector} is attracting liquidity with confirmation quality above the active threshold.`,
      action: "Selective longs favored. Focus on leaders, avoid chasing late movers.",
      tone: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (topSector.direction === "OUTFLOW" && topSector.confidence >= 70) {
    return {
      label: "RISK-OFF PRESSURE",
      detail: `${topSector.sector} shows defensive outflow pressure with elevated confirmation.`,
      action: "Avoid aggressive entries. Wait for liquidity stabilization or failed breakdowns.",
      tone: "border-red-400/30 bg-red-500/10 text-red-200",
    };
  }

  if (topSector.direction === "CHURN") {
    return {
      label: "MIXED / CHURN CONDITIONS",
      detail: `${topSector.sector} is active, but flow is rotating without clean directional commitment.`,
      action: "Wait for confirmation. Use smaller size or avoid low-quality continuation trades.",
      tone: "border-amber-400/30 bg-amber-500/10 text-amber-200",
    };
  }

  return {
    label: "SELECTIVE MARKET",
    detail: `${topSector.sector} is the current focus, but the signal is not clean enough for broad aggression.`,
    action: "Trade only the strongest setups. Let the router filter weak opportunities.",
    tone: "border-cyan-400/25 bg-cyan-500/10 text-cyan-200",
  };
}

function buildTacticalAlerts(sectors: SectorRotationSnapshot[]) {
  return sectors.slice(0, 4).map((sector) => {
    const prefix = sector.direction === "INFLOW" ? "Watch" : sector.direction === "OUTFLOW" ? "Avoid" : "Wait";
    const message =
      sector.direction === "INFLOW"
        ? `${sector.sector} liquidity is improving; check execution quality before entry.`
        : sector.direction === "OUTFLOW"
          ? `${sector.sector} is bleeding flow; avoid weak continuation longs.`
          : `${sector.sector} is churning; wait for cleaner confirmation.`;

    return {
      key: `${sector.rank}-${sector.sector}`,
      label: `${prefix} ${sector.sector}`,
      message,
      direction: sector.direction,
    };
  });
}

function buildWhereToFocus(sectors: SectorRotationSnapshot[]) {
  return sectors.slice(0, 5).map((sector) => ({
    ...sector,
    width: clamp(sector.rotationScore),
    label:
      sector.direction === "INFLOW"
        ? "Tradable leader"
        : sector.direction === "OUTFLOW"
          ? "Avoid weakness"
          : "Needs confirmation",
  }));
}

function alertTone(direction?: string) {
  switch (direction) {
    case "INFLOW":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
    case "OUTFLOW":
      return "border-red-500/30 bg-red-500/10 text-red-200";
    case "CHURN":
      return "border-amber-500/30 bg-amber-500/10 text-amber-200";
    default:
      return "border-zinc-800 bg-zinc-900/70 text-zinc-400";
  }
}

function SurfaceCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-h-[236px] flex-col rounded-2xl border border-zinc-800 bg-zinc-950/75 p-4 shadow-[0_0_30px_rgba(0,0,0,0.35)] ${className}`}>
      {children}
    </div>
  );
}

export default function LiveCommandSurface() {
  const { data, status: fetchState, error, pulse, transport } = useSectorRotationFeed();

  const sectors = data?.sectors ?? [];
  const topSector = sectors[0];
  const verdict = useMemo(() => verdictFromSurface(topSector), [topSector]);
  const alerts = useMemo(() => buildTacticalAlerts(sectors), [sectors]);
  const focus = useMemo(() => buildWhereToFocus(sectors), [sectors]);
  const quality = data?.dataQuality?.status ?? fetchState;
  const degraded = fetchState === "error" || data?.dataQuality?.stale || quality === "partial" || quality === "degraded";

  return (
    <section className="relative shrink-0 overflow-hidden border-b border-zinc-900 bg-black">
      <div
        key={pulse}
        className="pointer-events-none absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.14),transparent_42%),radial-gradient(circle_at_82%_20%,rgba(168,85,247,0.10),transparent_30%)]"
      />

      <div className="relative px-4 py-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-400/80">
              Tactical Market Read
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Compressed regime verdict, focus areas, and actionable live alerts.
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${healthTone(String(quality))}`}>
              {degraded ? "DEGRADED" : String(quality).toUpperCase()}
            </span>
            <span className="hidden rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-500 md:inline-flex">
              Updated {formatAge(data?.updatedAt)}
            </span>
          </div>
        </div>

        <div className="grid items-stretch gap-3 lg:grid-cols-[1.08fr_1fr_1fr]">
          <SurfaceCard className={`border-cyan-500/20 bg-zinc-950/85 ${verdict.tone}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                  Market Verdict
                </div>
                <div className="mt-2 text-2xl font-black uppercase tracking-[0.14em] text-white xl:text-3xl">
                  {verdict.label}
                </div>
                <div className="mt-3 max-w-2xl text-xs leading-5 text-zinc-300">
                  {verdict.detail}
                </div>
              </div>
              <div className="shrink-0 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                <div className={transportTone(transport.binance)}>BN WS {transport.binance}</div>
                <div className={transportTone(transport.upbit)}>UP WS {transport.upbit}</div>
              </div>
            </div>

            <div className="mt-auto rounded-2xl border border-white/10 bg-black/45 p-3">
              <div className="text-[9px] font-black uppercase tracking-[0.22em] text-zinc-500">Execution Guidance</div>
              <div className="mt-1 text-sm font-black leading-5 text-white">{verdict.action}</div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                Where To Focus
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Top 5</div>
            </div>

            <div className="mt-3 flex-1 space-y-2.5">
              {(focus.length ? focus : []).map((sector) => (
                <div key={sector.sector} className="rounded-xl border border-zinc-800 bg-black/40 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <div className="truncate text-xs font-black uppercase text-zinc-200">{sector.sector}</div>
                    <div className="text-[10px] font-bold text-zinc-500">{sector.label}</div>
                  </div>
                  <div className="grid grid-cols-[1fr_46px] items-center gap-2">
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div className="h-full rounded-full bg-cyan-400/80 transition-all duration-700" style={{ width: `${sector.width}%` }} />
                    </div>
                    <div className="text-right text-xs font-bold text-zinc-400">{formatMetric(sector.rotationScore)}</div>
                  </div>
                </div>
              ))}

              {!focus.length ? (
                <div className="flex min-h-[150px] items-center justify-center rounded-xl border border-zinc-800 bg-black/50 px-3 py-5 text-center text-xs text-zinc-500">
                  {fetchState === "error" ? error ?? "sector feed error" : "Loading focus candidates..."}
                </div>
              ) : null}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-300/80">
                Tactical Alerts
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Actionable</div>
            </div>

            <div className="mt-3 grid flex-1 content-start gap-2">
              {alerts.length ? alerts.map((alert) => (
                <div key={alert.key} className={`rounded-xl border px-3 py-2.5 ${alertTone(alert.direction)}`}>
                  <div className="truncate text-[11px] font-black uppercase tracking-[0.14em]">{alert.label}</div>
                  <div className="mt-1 text-[10px] leading-4 opacity-80">{alert.message}</div>
                </div>
              )) : (
                <div className="flex min-h-[148px] items-center justify-center rounded-xl border border-zinc-800 bg-black/50 px-3 py-5 text-center text-xs text-zinc-500">
                  {fetchState === "error" ? error ?? "sector feed error" : "Loading tactical alerts..."}
                </div>
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}
