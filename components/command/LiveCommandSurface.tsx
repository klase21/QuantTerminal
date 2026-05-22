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

function directionTone(direction?: string) {
  switch (direction) {
    case "INFLOW":
      return "border-emerald-500/40 bg-emerald-500/10 text-emerald-300";
    case "OUTFLOW":
      return "border-red-500/40 bg-red-500/10 text-red-300";
    case "CHURN":
      return "border-amber-500/40 bg-amber-500/10 text-amber-300";
    default:
      return "border-zinc-800 bg-zinc-900/70 text-zinc-400";
  }
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

function stateFromSurface(topSector?: SectorRotationSnapshot) {
  if (!topSector) return "SCANNING";
  if (topSector.direction === "INFLOW" && topSector.confidence >= 72) return "ALT ROTATION";
  if (topSector.direction === "OUTFLOW" && topSector.confidence >= 70) return "RISK OFF";
  if (topSector.direction === "CHURN") return "CHURN PHASE";
  return "MARKET SCAN";
}

function buildEventRail(sectors: SectorRotationSnapshot[]) {
  return sectors.slice(0, 4).map((sector) => ({
    key: `${sector.rank}-${sector.sector}`,
    label: `${sector.sector} ${sector.direction}`,
    detail: `${formatMetric(sector.rotationScore)} score · ${formatMetric(sector.confidence)} conf`,
    direction: sector.direction,
  }));
}

function buildTemperature(sectors: SectorRotationSnapshot[]) {
  if (!sectors.length) return 0;
  const top = sectors.slice(0, 5);
  const avgScore = top.reduce((sum, sector) => sum + sector.rotationScore, 0) / top.length;
  const avgBreadth = top.reduce((sum, sector) => sum + sector.breadth, 0) / top.length;
  const avgVol = top.reduce((sum, sector) => sum + sector.volatility, 0) / top.length;
  return clamp(avgScore * 0.48 + avgBreadth * 0.24 + avgVol * 0.28);
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
  const state = stateFromSurface(topSector);
  const events = useMemo(() => buildEventRail(sectors), [sectors]);
  const temperature = useMemo(() => buildTemperature(sectors), [sectors]);
  const quality = data?.dataQuality?.status ?? fetchState;
  const degraded = fetchState === "error" || data?.dataQuality?.stale || quality === "partial" || quality === "degraded";
  const topAlert = topSector
    ? `${topSector.sector} ${topSector.direction} · ${formatMetric(topSector.confidence)}%`
    : "Waiting for live rotation data";

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
              Live Intelligence Surface
            </div>
            <div className="mt-1 text-xs text-zinc-500">
              Regime, sector heat, and priority events. Detailed narrative stays inside the workspace.
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

        <div className="grid items-stretch gap-3 lg:grid-cols-3">
          <SurfaceCard className="border-cyan-500/20 bg-zinc-950/85">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-400/80">
                  Market State
                </div>
                <div className="mt-2 truncate text-2xl font-black uppercase tracking-[0.16em] text-white xl:text-3xl">
                  {state}
                </div>
                <div className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">
                  <span className="font-bold text-zinc-200">{topSector?.sector ?? "--"}</span>
                  {topSector ? ` · ${topSector.story}` : " · scanning live market data"}
                </div>
              </div>
              <div className="shrink-0 text-right text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">
                <div className={transportTone(transport.binance)}>BN WS {transport.binance}</div>
                <div className={transportTone(transport.upbit)}>UP WS {transport.upbit}</div>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-3 gap-2 pt-4">
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Confidence</div>
                <div className="mt-1 text-xl font-black text-cyan-200">{formatMetric(topSector?.confidence)}%</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Temp</div>
                <div className="mt-1 text-xl font-black text-fuchsia-200">{formatMetric(temperature)}%</div>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-black/45 p-3">
                <div className="text-[9px] uppercase tracking-[0.2em] text-zinc-500">Alert</div>
                <div className="mt-1 line-clamp-2 text-[11px] font-bold leading-4 text-amber-200">{topAlert}</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                Sector Heat Radar
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Top 5
              </div>
            </div>

            <div className="mt-3 flex-1 space-y-2.5">
              {(sectors.slice(0, 5).length ? sectors.slice(0, 5) : [null, null, null, null, null]).map((sector, index) => {
                const width = sector ? clamp(sector.rotationScore) : 8;
                return (
                  <div key={sector?.sector ?? `placeholder-${index}`} className="grid grid-cols-[56px_1fr_52px] items-center gap-2">
                    <div className="truncate text-xs font-bold uppercase text-zinc-300">{sector?.sector ?? "--"}</div>
                    <div className="h-2 overflow-hidden rounded-full bg-zinc-900">
                      <div
                        className="h-full rounded-full bg-cyan-400/80 transition-all duration-700"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <div className="text-right text-xs font-bold text-zinc-400">{formatMetric(sector?.rotationScore)}</div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.16em] text-zinc-500">
              <div className="rounded-lg border border-zinc-800 bg-black/40 p-2">
                Mapped<br />{data?.coverage.mappedAssets ?? "--"}
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/40 p-2">
                Sectors<br />{data?.coverage.sectors ?? "--"}
              </div>
              <div className="rounded-lg border border-zinc-800 bg-black/40 p-2">
                Binance<br />{data?.coverage.binanceSymbols ?? "--"}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.28em] text-zinc-500">
                Live Event Rail
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">
                Top 4
              </div>
            </div>

            <div className="mt-3 grid flex-1 content-start gap-2">
              {events.length ? events.map((event) => (
                <div
                  key={event.key}
                  className={`rounded-xl border px-3 py-2.5 ${directionTone(event.direction)}`}
                >
                  <div className="truncate text-[11px] font-black uppercase tracking-[0.14em]">{event.label}</div>
                  <div className="mt-1 truncate text-[10px] opacity-80">{event.detail}</div>
                </div>
              )) : (
                <div className="flex min-h-[148px] items-center justify-center rounded-xl border border-zinc-800 bg-black/50 px-3 py-5 text-center text-xs text-zinc-500">
                  {fetchState === "error" ? error ?? "sector feed error" : "Loading live sector events..."}
                </div>
              )}
            </div>
          </SurfaceCard>
        </div>
      </div>
    </section>
  );
}
