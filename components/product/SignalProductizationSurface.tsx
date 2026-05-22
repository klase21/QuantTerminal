"use client"

import type { ProductizationSurface } from "@/core/productization/productizationTypes"
import type { SignalQualityItem, SignalQualityReport } from "@/core/signal-quality/signalQualityTypes"

function metric(value: number, digits = 0) {
  if (!Number.isFinite(value)) return "--"
  return value.toFixed(digits)
}

function recommendationClass(value?: string) {
  switch (value) {
    case "PROMOTE":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "WATCH":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    case "SUPPRESS":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function trustClass(value?: string) {
  switch (value) {
    case "HIGH_TRUST":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
    case "WATCH":
      return "border-amber-500/25 bg-amber-500/10 text-amber-200"
    case "LOW_QUALITY":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function riskClass(value?: string) {
  switch (value) {
    case "LOW":
      return "text-emerald-300"
    case "MEDIUM":
      return "text-amber-300"
    case "HIGH":
      return "text-red-300"
    default:
      return "text-zinc-400"
  }
}

function priorityClass(value?: string) {
  switch (value) {
    case "P1":
      return "border-red-500/25 bg-red-500/10 text-red-200"
    case "P2":
      return "border-orange-500/25 bg-orange-500/10 text-orange-200"
    default:
      return "border-zinc-700 bg-zinc-900 text-zinc-300"
  }
}

function BreakdownBar({ label, value }: { label: string; value: number }) {
  const safe = Math.min(100, Math.max(0, value))
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-[0.16em] text-zinc-600">
        <span>{label}</span>
        <span>{metric(value)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
        <div className="h-full rounded-full bg-cyan-400/75" style={{ width: `${safe}%` }} />
      </div>
    </div>
  )
}

function SignalRow({ item }: { item: SignalQualityItem }) {
  const penaltyText = item.penalties.length ? item.penalties.join(" · ") : "No major penalty"
  return (
    <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-xs font-black uppercase text-zinc-100">{item.narrative}</div>
          <div className="mt-1 text-[11px] text-zinc-500">
            {item.validationStatus} · Grade {item.grade} · {item.cooldownGroup}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${trustClass(item.trustLabel)}`}>
            {item.trustLabel.replace("_", " ")}
          </div>
          <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] ${recommendationClass(item.recommendation)}`}>
            {item.recommendation}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-900">
          <div className="h-full rounded-full bg-violet-400/80" style={{ width: `${Math.min(100, Math.max(0, item.qualityScore))}%` }} />
        </div>
        <div className="w-10 text-right text-xs font-black text-violet-200">{metric(item.qualityScore)}</div>
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <BreakdownBar label="Liquidity" value={item.breakdown.liquidity} />
        <BreakdownBar label="Validation" value={item.breakdown.validation} />
        <BreakdownBar label="Breadth" value={item.breakdown.breadth} />
        <BreakdownBar label="Regime" value={item.breakdown.regimeFit} />
        <BreakdownBar label="Data" value={item.breakdown.dataQuality} />
        <BreakdownBar label="Noise" value={100 - item.breakdown.noisePenalty} />
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">Reasons</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-emerald-200">{item.reasons.join(" · ")}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">Penalties</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-red-200">{penaltyText}</div>
        </div>
        <div className="rounded-lg border border-zinc-900 bg-zinc-950/60 p-2">
          <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-600">Operator Action</div>
          <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-cyan-200">{item.operatorAction}</div>
        </div>
      </div>
    </div>
  )
}

export default function SignalProductizationSurface({
  quality,
  product,
}: {
  quality: SignalQualityReport
  product: ProductizationSurface
}) {
  const topSignal = product.signalInbox[0]
  const visibleSignals = [...quality.promoted, ...quality.watch].slice(0, 5)
  const suppressedSignals = quality.suppressed.slice(0, 3)

  return (
    <div className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_1fr_0.85fr]">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
              Operator Trust Engine
            </div>
            <div className="mt-2 text-2xl font-black uppercase tracking-[0.12em] text-white">
              {quality.reliability} Reliability
            </div>
            <p className="mt-1 max-w-xl text-xs leading-5 text-zinc-500">
              Signals are ranked by liquidity confirmation, news validation, breadth, regime fit, data quality, and noise penalties. Low-quality signals stay out of the primary rail.
            </p>
          </div>
          <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-right">
            <div className="text-[10px] uppercase tracking-[0.2em] text-violet-300">Quality</div>
            <div className="text-xl font-black text-violet-100">{metric(quality.overallScore)}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Promote</div>
            <div className="mt-1 text-lg font-black text-emerald-200">{quality.promoted.length}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Watch</div>
            <div className="mt-1 text-lg font-black text-amber-200">{quality.watch.length}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">Suppressed</div>
            <div className="mt-1 text-lg font-black text-red-200">{quality.noiseSuppressed}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-black/40 p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">FP Risk</div>
            <div className={`mt-1 text-lg font-black ${riskClass(quality.falsePositiveRisk)}`}>{quality.falsePositiveRisk}</div>
          </div>
        </div>

        {quality.topPenalties.length ? (
          <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/5 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-red-300/80">Top Noise Filters</div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quality.topPenalties.map((penalty) => (
                <span key={penalty} className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-100/80">
                  {penalty}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-3 space-y-2">
          {visibleSignals.length ? visibleSignals.map((item) => <SignalRow key={item.id} item={item} />) : (
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-4 text-sm text-zinc-500">
              No signal is trusted enough for promotion yet.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
            Signal Inbox
          </div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">Trusted Only</div>
        </div>
        <div className="mt-3 space-y-2">
          {(product.signalInbox.length ? product.signalInbox : []).map((item) => (
            <div key={item.id} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-xs font-black uppercase text-zinc-100">{item.title}</div>
                  <div className="mt-1 truncate text-[11px] text-zinc-500">{item.subtitle}</div>
                </div>
                <div className={`rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${priorityClass(item.priority)}`}>{item.priority}</div>
              </div>
              <div className="mt-2 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-zinc-600">
                <span>{item.savedView}</span>
                <span>{metric(item.qualityScore)} QS</span>
              </div>
            </div>
          ))}
          {!product.signalInbox.length ? (
            <div className="rounded-xl border border-zinc-800 bg-black/40 p-3 text-xs text-zinc-500">
              No signal has crossed the inbox threshold yet.
            </div>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Settings Preview</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-zinc-900 bg-zinc-950/70 p-2">
              <div className="text-[9px] uppercase text-zinc-600">Threshold</div>
              <div className="font-black text-zinc-200">{product.settingsHint.alertThreshold}</div>
            </div>
            <div className="rounded-lg border border-zinc-900 bg-zinc-950/70 p-2">
              <div className="text-[9px] uppercase text-zinc-600">Cooldown</div>
              <div className="font-black text-zinc-200">{product.settingsHint.cooldownMinutes}m</div>
            </div>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Suppressed Noise</div>
          <div className="mt-2 space-y-2">
            {suppressedSignals.length ? suppressedSignals.map((item) => (
              <div key={item.id} className="rounded-lg border border-zinc-900 bg-zinc-950/70 p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-black uppercase text-zinc-300">{item.narrative}</span>
                  <span className="text-[10px] font-bold text-red-300">{metric(item.qualityScore)}</span>
                </div>
                <div className="mt-1 line-clamp-1 text-[10px] text-zinc-500">{item.penalties[0] ?? item.operatorAction}</div>
              </div>
            )) : <div className="text-xs text-zinc-500">No suppressed noise yet.</div>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.32em] text-zinc-500">
          Saved Views / Watchlist
        </div>
        <div className="mt-3 space-y-2">
          {product.savedViews.map((view) => (
            <div key={view.id} className={`rounded-xl border p-3 ${view.active ? "border-cyan-500/25 bg-cyan-500/10" : "border-zinc-800 bg-black/40"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-black uppercase text-zinc-100">{view.label}</div>
                <div className={`text-[9px] font-bold uppercase tracking-[0.14em] ${view.active ? "text-cyan-200" : "text-zinc-600"}`}>{view.active ? "ACTIVE" : "IDLE"}</div>
              </div>
              <p className="mt-1 text-[11px] leading-4 text-zinc-500">{view.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {product.watchlists.map((watchlist) => (
            <div key={watchlist.label} className="rounded-xl border border-zinc-800 bg-black/40 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-black uppercase text-zinc-100">{watchlist.label}</div>
                <div className="text-[10px] font-bold uppercase text-zinc-500">{watchlist.status}</div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {watchlist.sectors.map((sector) => (
                  <span key={sector} className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-bold uppercase text-zinc-400">
                    {sector}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {topSignal ? (
          <div className="mt-3 rounded-xl border border-violet-500/20 bg-violet-500/10 p-3">
            <div className="text-[10px] uppercase tracking-[0.22em] text-violet-300">Explanation Drawer Preview</div>
            <div className="mt-1 text-xs font-black uppercase text-violet-100">{topSignal.narrative}</div>
            <p className="mt-1 text-[11px] leading-5 text-violet-100/70">
              {topSignal.operatorAction || topSignal.reasons[0] || "Open this signal to inspect reasons, penalties, validation, cooldown, and source coverage."}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
