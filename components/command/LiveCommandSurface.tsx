"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  RealMarketRotationResponse,
  SectorRotationSnapshot,
} from "@/core/marketDataTypes";

const POLL_MS = 30000;

type FetchState = "idle" | "loading" | "live" | "partial" | "error";

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
      return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
    case "OUTFLOW":
      return "border-red-500/50 bg-red-500/10 text-red-300";
    case "CHURN":
      return "border-amber-500/50 bg-amber-500/10 text-amber-300";
    default:
      return "border-zinc-700 bg-zinc-900/60 text-zinc-400";
  }
}

function healthTone(status?: string) {
  switch (status) {
    case "healthy":
      return "text-emerald-300";
    case "partial":
      return "text-amber-300";
    case "degraded":
      return "text-orange-300";
    case "error":
      return "text-red-300";
    default:
      return "text-zinc-400";
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
  return sectors.slice(0, 6).map((sector) => ({
    key: `${sector.rank}-${sector.sector}`,
    label: `${sector.sector} ${sector.direction}`,
    detail: `${formatMetric(sector.rotationScore)} score / ${formatMetric(sector.confidence)} conf`,
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

export default function LiveCommandSurface() {
  const [data, setData] = useState<RealMarketRotationResponse | null>(null);
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setInterval> | null = null;

    const load = async () => {
      try {
        setFetchState((prev) => (prev === "idle" ? "loading" : prev));
        const response = await fetch("/api/market/sector-rotation", {
          cache: "no-store",
        });
        const payload = (await response.json()) as RealMarketRotationResponse;
        if (!alive) return;
        if (!response.ok || payload.ok === false) {
          throw new Error(payload.notes?.[0] ?? `sector rotation returned ${response.status}`);
        }
        setData(payload);
        setFetchState(payload.mode === "partial" ? "partial" : "live");
        setError(null);
        setPulse((value) => value + 1);
      } catch (err) {
        if (!alive) return;
        setFetchState("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    };

    load();
    timer = setInterval(load, POLL_MS);

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, []);

  const sectors = data?.sectors ?? [];
  const topSector = sectors[0];
  const state = stateFromSurface(topSector);
  const events = useMemo(() => buildEventRail(sectors), [sectors]);
  const temperature = useMemo(() => buildTemperature(sectors), [sectors]);
  const topAlert = topSector
    ? `${topSector.sector} ${topSector.direction} / ${formatMetric(topSector.confidence)} confidence`
    : "Waiting for live rotation data";
  const quality = data?.dataQuality?.status ?? fetchState;

  return (
    <section
      className="
        relative
        shrink-0
        overflow-hidden
        border-b
        border-zinc-900
        bg-black
      "
    >
      <div
        key={pulse}
        className="
          pointer-events-none
          absolute
          inset-0
          animate-pulse
          bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.16),transparent_42%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_30%)]
        "
      />

      <div className="relative grid gap-3 px-4 py-3 xl:grid-cols-[1.25fr_1.1fr_0.9fr]">
        <div
          className="
            rounded-2xl
            border
            border-cyan-500/20
            bg-zinc-950/80
            p-4
            shadow-[0_0_40px_rgba(6,182,212,0.08)]
          "
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.35em] text-cyan-400/80">
                Live Command Surface
              </div>
              <div className="mt-2 text-3xl font-black uppercase tracking-[0.18em] text-white">
                {state}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Top rotation: <span className="font-bold text-zinc-100">{topSector?.sector ?? "--"}</span>
                {topSector ? ` · ${topSector.story}` : " · scanning live market data"}
              </div>
            </div>
            <div className="text-right">
              <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${healthTone(data?.dataQuality?.status)}`}>
                {String(quality).toUpperCase()}
              </div>
              <div className="mt-1 text-[11px] text-zinc-500">
                {formatAge(data?.updatedAt)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Confidence</div>
              <div className="mt-1 text-2xl font-black text-cyan-200">{formatMetric(topSector?.confidence)}%</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Temperature</div>
              <div className="mt-1 text-2xl font-black text-fuchsia-200">{formatMetric(temperature)}%</div>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-black/50 p-3">
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Top Alert</div>
              <div className="mt-1 truncate text-xs font-bold text-amber-200">{topAlert}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Sector Heat Radar
            </div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-600">
              Real Market
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {(sectors.slice(0, 5).length ? sectors.slice(0, 5) : [null, null, null]).map((sector, index) => {
              const width = sector ? clamp(sector.rotationScore) : 8;
              return (
                <div key={sector?.sector ?? `placeholder-${index}`} className="grid grid-cols-[64px_1fr_58px] items-center gap-2">
                  <div className="text-xs font-bold uppercase text-zinc-300">{sector?.sector ?? "--"}</div>
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

          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-[0.18em] text-zinc-500">
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
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Live Event Rail
          </div>
          <div className="mt-3 space-y-2">
            {events.length ? events.map((event) => (
              <div
                key={event.key}
                className={`rounded-xl border px-3 py-2 ${directionTone(event.direction)}`}
              >
                <div className="text-xs font-black uppercase tracking-[0.18em]">{event.label}</div>
                <div className="mt-1 text-[11px] opacity-80">{event.detail}</div>
              </div>
            )) : (
              <div className="rounded-xl border border-zinc-800 bg-black/50 px-3 py-6 text-center text-xs text-zinc-500">
                {fetchState === "error" ? error ?? "sector feed error" : "Loading live sector events..."}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
