"use client";

import { useMemo } from "react";

import type { SectorRotationSnapshot } from "@/core/marketDataTypes";
import { useSectorRotationFeed } from "@/hooks/useSectorRotationFeed";

function formatMetric(value: unknown, digits = 0) {
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

function stateFromSurface(topSector?: SectorRotationSnapshot) {
  if (!topSector) return "SCANNING";
  if (topSector.direction === "INFLOW" && topSector.confidence >= 72) return "RISK ON";
  if (topSector.direction === "OUTFLOW" && topSector.confidence >= 70) return "RISK OFF";
  if (topSector.direction === "CHURN") return "ROTATION";
  return "MIXED";
}

function buildTemperature(sectors: SectorRotationSnapshot[]) {
  if (!sectors.length) return 0;
  const top = sectors.slice(0, 5);
  const avgScore = top.reduce((sum, sector) => sum + sector.rotationScore, 0) / top.length;
  const avgBreadth = top.reduce((sum, sector) => sum + sector.breadth, 0) / top.length;
  const avgVol = top.reduce((sum, sector) => sum + sector.volatility, 0) / top.length;
  return clamp(avgScore * 0.48 + avgBreadth * 0.24 + avgVol * 0.28);
}

function threatFrom(topSector: SectorRotationSnapshot | undefined, temperature: number) {
  const confidence = topSector?.confidence ?? 0;
  const volatility = topSector?.volatility ?? 0;
  const directionRisk = topSector?.direction === "OUTFLOW" ? 18 : topSector?.direction === "CHURN" ? 10 : 0;
  const score = clamp(temperature * 0.38 + volatility * 0.34 + (100 - confidence) * 0.18 + directionRisk);
  if (score >= 72) return { label: "RISK", className: "border-red-400/35 bg-red-500/10 text-red-200" };
  if (score >= 48) return { label: "WATCH", className: "border-amber-400/35 bg-amber-500/10 text-amber-200" };
  return { label: "STABLE", className: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200" };
}

function directionWord(direction?: string) {
  if (direction === "INFLOW") return "money moving in";
  if (direction === "OUTFLOW") return "money leaving";
  if (direction === "CHURN") return "fast rotation";
  return "market scanning";
}

function buildRead(topSector?: SectorRotationSnapshot) {
  if (!topSector) return "Waiting for live rotation data.";
  return `${topSector.sector} is leading · ${directionWord(topSector.direction)}.`;
}

export default function LiveCommandSurface() {
  const { data, status: fetchState, pulse, transport } = useSectorRotationFeed();

  const sectors = data?.sectors ?? [];
  const topSector = sectors[0];
  const secondSector = sectors[1];
  const regime = stateFromSurface(topSector);
  const temperature = useMemo(() => buildTemperature(sectors), [sectors]);
  const threat = threatFrom(topSector, temperature);
  const quality = data?.dataQuality?.status ?? fetchState;
  const isLive = quality === "healthy" || quality === "live" || fetchState === "live";
  const leadFlow = topSector && secondSector ? `${topSector.sector} → ${secondSector.sector}` : topSector?.sector ?? "Scanning";

  return (
    <section className="relative shrink-0 overflow-hidden border-b border-zinc-900 bg-black/95">
      <div
        key={pulse}
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent opacity-80"
      />
      <div className="relative px-4 py-2.5">
        <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <div className="mr-1 flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${isLive ? "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,.75)]" : "bg-amber-300"}`} />
              <span className="text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">Live Command</span>
            </div>

            <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-100">
              {regime}
            </span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950/80 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300">
              Lead Flow <b className="ml-1 text-white">{leadFlow}</b>
            </span>
            <span className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] ${threat.className}`}>
              Threat {threat.label}
            </span>
            <span className="max-w-[560px] truncate rounded-full border border-zinc-800 bg-zinc-950/70 px-3 py-1 text-[11px] font-semibold text-zinc-300">
              {buildRead(topSector)}
            </span>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">
            <span className="rounded-full border border-zinc-900 bg-zinc-950/70 px-2.5 py-1">
              Updated {formatAge(data?.updatedAt)}
            </span>
            <span className="rounded-full border border-zinc-900 bg-zinc-950/70 px-2.5 py-1">
              Temp {formatMetric(temperature)}
            </span>
            <span className="rounded-full border border-zinc-900 bg-zinc-950/70 px-2.5 py-1">
              BN {transport.binance}
            </span>
            <span className="rounded-full border border-zinc-900 bg-zinc-950/70 px-2.5 py-1">
              UP {transport.upbit}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
