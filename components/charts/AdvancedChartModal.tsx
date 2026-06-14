"use client"

import { useEffect, useMemo, useState } from "react"
import { BarChart3, Check, Copy, LayoutDashboard, Save, SlidersHorizontal, SplitSquareHorizontal, X } from "lucide-react"

import TradingChart, { TradingChartIndicatorSet, type TradingChartSetupOverlay } from "@/components/TradingChart"
import useKlineSocket from "@/hooks/useKlineSocket"
import { useMarketMovers } from "@/hooks/market-movers/useMarketMovers"
import { exportSetupSnapshotPng } from "@/lib/share/exportSetupSnapshot"

interface Props {
  symbol: string
  timeframe: string
  onClose: () => void
}

type IndicatorKey = "setupOverlay" | "rsi" | "macd" | "stochastic" | "volumeProfile" | "ema9" | "ema21" | "ema50" | "sma20" | "sma200" | "nma" | "vwap" | "anchoredVwap" | "keyLevels" | "htfLevels" | "sessions" | "mtfDashboard" | "bollinger" | "hullTrend" | "tradeMarkers"
type ChartPresetKey = "execution" | "swing" | "scalp"
type ChartDensity = "comfortable" | "compact"
type ModalTab = "chart" | "indicators" | "layout"

type Candle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}


const TIMEFRAME_OPTIONS = ["1m", "5m", "15m", "1h", "4h", "1d"]
const COMPARE_SYMBOL_OPTIONS = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "XRPUSDT"]
const ADVANCED_CHART_LAYOUT_KEY = "qt.advancedChart.v2.layout"

const PRESET_INDICATORS: Record<ChartPresetKey, Record<IndicatorKey, boolean>> = {
  execution: {
    setupOverlay: true,
    rsi: true,
    macd: true,
    stochastic: true,
    volumeProfile: true,
    ema9: true,
    ema21: true,
    ema50: true,
    sma20: true,
    sma200: true,
    nma: false,
    vwap: true,
    anchoredVwap: true,
    keyLevels: true,
    htfLevels: true,
    sessions: true,
    mtfDashboard: true,
    bollinger: true,
    hullTrend: true,
    tradeMarkers: true,
  },
  scalp: {
    setupOverlay: true,
    rsi: true,
    macd: true,
    stochastic: true,
    volumeProfile: true,
    ema9: true,
    ema21: true,
    ema50: false,
    sma20: true,
    sma200: false,
    nma: false,
    vwap: true,
    anchoredVwap: true,
    keyLevels: true,
    htfLevels: true,
    sessions: true,
    mtfDashboard: true,
    bollinger: true,
    hullTrend: true,
    tradeMarkers: true,
  },
  swing: {
    setupOverlay: true,
    rsi: true,
    macd: true,
    stochastic: false,
    volumeProfile: true,
    ema9: false,
    ema21: true,
    ema50: true,
    sma20: true,
    sma200: true,
    nma: true,
    vwap: true,
    anchoredVwap: true,
    keyLevels: true,
    htfLevels: true,
    sessions: false,
    mtfDashboard: true,
    bollinger: true,
    hullTrend: true,
    tradeMarkers: false,
  },
}

const PRESET_COPY: Record<ChartPresetKey, { label: string; detail: string }> = {
  execution: {
    label: "Execution",
    detail: "Balanced view for trigger, reclaim and invalidation checks.",
  },
  scalp: {
    label: "Scalp",
    detail: "Short-term momentum and chase-risk checks with lighter structure.",
  },
  swing: {
    label: "Swing",
    detail: "Higher structure with SMA200 and less intraday noise.",
  },
}

const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  setupOverlay: "Setup Bias Overlay",
  rsi: "RSI 14",
  macd: "MACD 12/26/9",
  stochastic: "Stoch 14/1/3",
  volumeProfile: "Volume Profile",
  ema9: "EMA 9",
  ema21: "EMA 21",
  ema50: "EMA 50",
  sma20: "SMA 20",
  sma200: "SMA 200",
  nma: "NMA step line",
  vwap: "VWAP",
  anchoredVwap: "Anchored VWAP",
  keyLevels: "PD/PW Key Levels",
  htfLevels: "4H HTF Levels",
  sessions: "Session Zones",
  mtfDashboard: "MTF Context Matrix",
  bollinger: "Bollinger Bands",
  hullTrend: "Hull + Kalman Trend",
  tradeMarkers: "Buy/Sell Markers",
}

function calculateRsi(data: Candle[], length = 14) {
  if (data.length <= length) return null

  let gains = 0
  let losses = 0

  for (let index = data.length - length; index < data.length; index += 1) {
    const change = data[index].close - data[index - 1].close
    if (change >= 0) gains += change
    else losses += Math.abs(change)
  }

  if (losses === 0) return 100

  const rs = gains / losses
  return 100 - 100 / (1 + rs)
}

function ema(values: number[], length: number) {
  if (!values.length) return []

  const multiplier = 2 / (length + 1)
  const result: number[] = [values[0]]

  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index] * multiplier + result[index - 1] * (1 - multiplier))
  }

  return result
}

function calculateMacd(data: Candle[]) {
  const closes = data.map((candle) => candle.close)
  if (closes.length < 35) return null

  const fast = ema(closes, 12)
  const slow = ema(closes, 26)
  const macd = closes.map((_, index) => fast[index] - slow[index])
  const signal = ema(macd, 9)
  const latestMacd = macd[macd.length - 1]
  const latestSignal = signal[signal.length - 1]

  return {
    macd: latestMacd,
    signal: latestSignal,
    histogram: latestMacd - latestSignal,
  }
}

function MiniIndicatorPanel({
  title,
  value,
  detail,
}: {
  title: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">{title}</div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
      <div className="mt-1 text-[11px] leading-relaxed text-zinc-500">{detail}</div>
    </div>
  )
}

export default function AdvancedChartModal({
  symbol,
  timeframe,
  onClose,
}: Props) {
  const [activeTab, setActiveTab] = useState<ModalTab>("chart")
  const [saved, setSaved] = useState(false)
  const [snapshotCopied, setSnapshotCopied] = useState(false)
  const [snapshotBusy, setSnapshotBusy] = useState(false)
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)
  const [activePreset, setActivePreset] = useState<ChartPresetKey>("execution")
  const [density, setDensity] = useState<ChartDensity>("comfortable")
  const [compareMode, setCompareMode] = useState(false)
  const [compareSymbol, setCompareSymbol] = useState("ETHUSDT")
  const [enabledIndicators, setEnabledIndicators] = useState<Record<IndicatorKey, boolean>>({
    setupOverlay: true,
    rsi: true,
    macd: true,
    stochastic: true,
    volumeProfile: true,
    ema9: true,
    ema21: true,
    ema50: true,
    sma20: true,
    sma200: true,
    nma: false,
    vwap: true,
    anchoredVwap: true,
    keyLevels: true,
    htfLevels: true,
    sessions: true,
    mtfDashboard: true,
    bollinger: true,
    hullTrend: true,
    tradeMarkers: true,
  })

  const normalizedPrimarySymbol = symbol.toUpperCase()
  const availableCompareSymbols = useMemo(
    () => COMPARE_SYMBOL_OPTIONS.filter((option) => option.toUpperCase() !== normalizedPrimarySymbol),
    [normalizedPrimarySymbol]
  )
  const effectiveCompareMode = compareMode && compareSymbol.toUpperCase() !== normalizedPrimarySymbol
  const candles = useKlineSocket(normalizedPrimarySymbol, selectedTimeframe)
  const compareCandles = useKlineSocket(effectiveCompareMode ? compareSymbol : normalizedPrimarySymbol, selectedTimeframe)
  const { data: moverData } = useMarketMovers(true, normalizedPrimarySymbol)
  const setupCandidate = moverData?.focusCandidate ?? moverData?.candidates?.find((item) => item.symbol === normalizedPrimarySymbol) ?? null

  useEffect(() => {
    setSelectedTimeframe(timeframe)
  }, [timeframe])

  useEffect(() => {
    if (compareSymbol.toUpperCase() !== normalizedPrimarySymbol) return
    setCompareSymbol(availableCompareSymbols[0] ?? "BTCUSDT")
  }, [availableCompareSymbols, compareSymbol, normalizedPrimarySymbol])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(ADVANCED_CHART_LAYOUT_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        preset?: ChartPresetKey
        density?: ChartDensity
        compareMode?: boolean
        compareSymbol?: string
        indicators?: Record<IndicatorKey, boolean>
      }
      if (parsed.preset && PRESET_INDICATORS[parsed.preset]) setActivePreset(parsed.preset)
      if (parsed.density === "comfortable" || parsed.density === "compact") setDensity(parsed.density)
      if (parsed.compareSymbol && parsed.compareSymbol.toUpperCase() !== normalizedPrimarySymbol) {
        setCompareSymbol(parsed.compareSymbol.toUpperCase())
        setCompareMode(false)
      } else {
        setCompareMode(false)
      }
      if (parsed.indicators) {
        const savedIndicators = parsed.indicators as Record<string, boolean>
        setEnabledIndicators((current) => ({
          ...current,
          ...savedIndicators,
          setupOverlay: savedIndicators.setupOverlay ?? current.setupOverlay,
          ema9: savedIndicators.ema9 ?? current.ema9,
          ema21: savedIndicators.ema21 ?? current.ema21,
          ema50: savedIndicators.ema50 ?? current.ema50,
          anchoredVwap: savedIndicators.anchoredVwap ?? current.anchoredVwap,
          keyLevels: savedIndicators.keyLevels ?? current.keyLevels,
          htfLevels: savedIndicators.htfLevels ?? current.htfLevels,
          sessions: savedIndicators.sessions ?? current.sessions,
          mtfDashboard: savedIndicators.mtfDashboard ?? current.mtfDashboard,
          nma: savedIndicators.nma ?? savedIndicators.idealBb ?? current.nma,
          vwap: savedIndicators.vwap ?? savedIndicators.idealBb ?? current.vwap,
          bollinger: savedIndicators.bollinger ?? savedIndicators.idealBb ?? current.bollinger,
          hullTrend: savedIndicators.hullTrend ?? savedIndicators.idealBb ?? current.hullTrend,
          tradeMarkers: savedIndicators.tradeMarkers ?? savedIndicators.idealBb ?? current.tradeMarkers,
        }))
      }
    } catch {
      // optional saved chart layout
    }
  }, [normalizedPrimarySymbol])

  useEffect(() => {
    setCompareMode(false)
  }, [normalizedPrimarySymbol])


  const chartIndicators: TradingChartIndicatorSet = useMemo(
    () => ({
      ema9: enabledIndicators.ema9,
      ema21: enabledIndicators.ema21,
      ema50: enabledIndicators.ema50,
      sma20: enabledIndicators.sma20,
      sma200: enabledIndicators.sma200,
      anchoredVwap: enabledIndicators.anchoredVwap,
      keyLevels: enabledIndicators.keyLevels,
      htfLevels: enabledIndicators.htfLevels,
      sessions: enabledIndicators.sessions,
      mtfDashboard: enabledIndicators.mtfDashboard,
      volumeProfile: enabledIndicators.volumeProfile,
      macd: enabledIndicators.macd,
      stochastic: enabledIndicators.stochastic,
      nma: enabledIndicators.nma,
      vwap: enabledIndicators.vwap,
      bollinger: enabledIndicators.bollinger,
      hullTrend: enabledIndicators.hullTrend,
      tradeMarkers: enabledIndicators.tradeMarkers,
    }),
    [
      enabledIndicators.ema9,
      enabledIndicators.ema21,
      enabledIndicators.ema50,
      enabledIndicators.sma20,
      enabledIndicators.sma200,
      enabledIndicators.anchoredVwap,
      enabledIndicators.keyLevels,
      enabledIndicators.htfLevels,
      enabledIndicators.sessions,
      enabledIndicators.mtfDashboard,
      enabledIndicators.volumeProfile,
      enabledIndicators.macd,
      enabledIndicators.stochastic,
      enabledIndicators.nma,
      enabledIndicators.vwap,
      enabledIndicators.bollinger,
      enabledIndicators.hullTrend,
      enabledIndicators.tradeMarkers,
    ]
  )

  const setupOverlay: TradingChartSetupOverlay | null = useMemo(() => {
    if (!setupCandidate?.numericPlan || setupCandidate.numericPlan.side === "NEUTRAL") return null
    return {
      symbol: setupCandidate.symbol,
      bias: setupCandidate.bias,
      direction: setupCandidate.direction,
      entryLow: setupCandidate.numericPlan.entryLow,
      entryHigh: setupCandidate.numericPlan.entryHigh,
      stopLoss: setupCandidate.numericPlan.stopLoss,
      takeProfit1: setupCandidate.numericPlan.takeProfit1,
      takeProfit2: setupCandidate.numericPlan.takeProfit2,
      grade: setupCandidate.grade,
      confidence: setupCandidate.confidence,
      regime: setupCandidate.marketRegime,
    }
  }, [setupCandidate])

  const copySetupSnapshot = async () => {
    if (snapshotBusy) return
    if (!setupCandidate) {
      setSnapshotMessage("No setup available yet")
      window.setTimeout(() => setSnapshotMessage(null), 1800)
      return
    }
    setSnapshotBusy(true)
    setSnapshotCopied(false)
    setSnapshotMessage("Creating PNG...")
    try {
      const result = await exportSetupSnapshotPng({
        symbol,
        timeframe: selectedTimeframe,
        candles,
        candidate: setupCandidate,
      })
      if (!result.ok) {
        setSnapshotMessage(result.reason || "PNG export failed")
      } else {
        setSnapshotMessage(`Downloaded ${result.filename}`)
      }
      setSnapshotCopied(result.ok)
      window.setTimeout(() => {
        setSnapshotCopied(false)
        setSnapshotMessage(null)
      }, 3200)
    } catch (error) {
      setSnapshotMessage(error instanceof Error ? error.message : "PNG export failed")
      setSnapshotCopied(false)
      window.setTimeout(() => setSnapshotMessage(null), 3200)
    } finally {
      setSnapshotBusy(false)
    }
  }

  const rsiValue = useMemo(() => calculateRsi(candles), [candles])
  const macdValue = useMemo(() => calculateMacd(candles), [candles])

  const applyPreset = (preset: ChartPresetKey) => {
    setActivePreset(preset)
    setEnabledIndicators(PRESET_INDICATORS[preset])
  }

  const saveLayout = () => {
    try {
      window.localStorage.setItem(
        ADVANCED_CHART_LAYOUT_KEY,
        JSON.stringify({
          preset: activePreset,
          density,
          compareMode,
          compareSymbol,
          indicators: enabledIndicators,
        })
      )
      setSaved(true)
      window.setTimeout(() => setSaved(false), 1200)
    } catch {
      setSaved(false)
    }
  }

  const resetLayout = () => {
    applyPreset("execution")
    setDensity("comfortable")
    setCompareMode(false)
    setCompareSymbol(availableCompareSymbols[0] ?? "BTCUSDT")
    try {
      window.localStorage.removeItem(ADVANCED_CHART_LAYOUT_KEY)
    } catch {
      // optional local layout cleanup
    }
  }

  const toggleIndicator = (key: IndicatorKey) => {
    setEnabledIndicators((current) => ({
      ...current,
      [key]: !current[key],
    }))
  }


  return (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm">
      <div className="flex h-full w-full flex-col p-3">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-t-2xl border border-zinc-800 bg-zinc-950 px-4 py-2.5">
          <div className="min-w-[220px]">
            <div className="text-sm font-semibold text-white">
              {symbol.toUpperCase()} {selectedTimeframe} Advanced Chart
            </div>
            <div className="text-xs text-zinc-500">
              Advanced mode only. Presets, compare and indicator layouts do not affect Default Execution.
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <select
              value={selectedTimeframe}
              onChange={(event) => setSelectedTimeframe(event.target.value)}
              className="rounded-lg border border-zinc-800 bg-black px-2 py-1 text-xs text-zinc-300 outline-none hover:border-zinc-600"
              aria-label="Advanced chart timeframe"
            >
              {TIMEFRAME_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <button
              onClick={() => setActiveTab("chart")}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-xs ${
                activeTab === "chart"
                  ? "border-zinc-500 bg-zinc-800 text-white"
                  : "border-zinc-800 bg-black text-zinc-400 hover:text-white"
              }`}
            >
              <BarChart3 size={14} />
              Chart
            </button>
            <button
              onClick={() => setActiveTab("indicators")}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-xs ${
                activeTab === "indicators"
                  ? "border-zinc-500 bg-zinc-800 text-white"
                  : "border-zinc-800 bg-black text-zinc-400 hover:text-white"
              }`}
            >
              <SlidersHorizontal size={14} />
              Indicators
            </button>
            <button
              onClick={() => setActiveTab("layout")}
              className={`flex items-center gap-1 rounded-lg border px-3 py-1 text-xs ${
                activeTab === "layout"
                  ? "border-zinc-500 bg-zinc-800 text-white"
                  : "border-zinc-800 bg-black text-zinc-400 hover:text-white"
              }`}
            >
              <LayoutDashboard size={14} />
              Layout
            </button>
            {setupCandidate ? (
              <button
                onClick={copySetupSnapshot}
                className="flex items-center gap-1 rounded-lg border border-zinc-800 bg-black px-3 py-1 text-xs text-zinc-400 hover:border-cyan-400/40 hover:text-cyan-200"
              >
                <Copy size={14} /> {snapshotBusy ? "Exporting" : snapshotCopied ? "Downloaded" : "Download PNG"}
              </button>
            ) : null}
            {snapshotMessage ? <span className="max-w-[220px] truncate text-xs font-medium text-cyan-200">{snapshotMessage}</span> : null}
            <button
              onClick={onClose}
              className="rounded-lg border border-zinc-800 bg-black p-2 text-zinc-400 hover:text-white"
              aria-label="Close advanced chart"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto rounded-b-2xl border-x border-b border-zinc-800 bg-zinc-950 p-3">
          {activeTab === "chart" ? (
            <div className="flex min-h-[840px] flex-col gap-3">
              <div className={effectiveCompareMode ? "grid min-h-[840px] gap-3 lg:grid-cols-2" : "min-h-[840px]"}>
                <div className="min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                  <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400">
                    <span>Primary · {symbol.toUpperCase()} · {selectedTimeframe}</span>
                    <span className="text-[10px] uppercase tracking-[0.18em] text-zinc-600">Controls in Indicators</span>
                  </div>
                  <div className="h-[calc(100%-37px)] min-h-[820px]">
                    <TradingChart data={candles} indicators={chartIndicators} setupOverlay={enabledIndicators.setupOverlay ? setupOverlay : null} />
                  </div>
                </div>

                {effectiveCompareMode && (
                  <div className="min-h-0 overflow-hidden rounded-xl border border-zinc-800 bg-black">
                    <div className="flex items-center justify-between border-b border-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400">
                      <span>Compare · {compareSymbol.toUpperCase()} · {selectedTimeframe}</span>
                      <select
                        value={compareSymbol}
                        onChange={(event) => setCompareSymbol(event.target.value)}
                        className="rounded border border-zinc-800 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-300 outline-none"
                        aria-label="Compare symbol"
                      >
                        {availableCompareSymbols.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="h-[calc(100%-37px)] min-h-[820px]">
                      <TradingChart data={compareCandles} indicators={chartIndicators} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === "indicators" ? (
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[320px_1fr]">
              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <div className="shrink-0 border-b border-zinc-900 p-4">
                  <div className="text-sm font-semibold text-white">Core Indicator Controls</div>
                  <div className="mt-1 text-xs text-zinc-500">These controls only affect the Advanced Chart modal.</div>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto p-4 pr-2">
                  <div className="grid gap-2">
                    {(Object.keys(PRESET_COPY) as ChartPresetKey[]).map((preset) => (
                      <button
                        key={preset}
                        onClick={() => applyPreset(preset)}
                        className={`rounded-lg border px-3 py-2 text-left ${
                          activePreset === preset
                            ? "border-sky-500/60 bg-sky-500/10"
                            : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                        }`}
                      >
                        <div className="text-sm font-medium text-white">{PRESET_COPY[preset].label}</div>
                        <div className="mt-1 text-xs text-zinc-500">{PRESET_COPY[preset].detail}</div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 border-t border-zinc-900 pt-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-zinc-500">Indicator toggles</div>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(Object.keys(INDICATOR_LABELS) as IndicatorKey[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => toggleIndicator(key)}
                        className="flex w-full items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-300 hover:border-zinc-600"
                      >
                        <span>{INDICATOR_LABELS[key]}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] ${
                            enabledIndicators[key]
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {enabledIndicators[key] ? "ON" : "OFF"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-black">
                <div className="shrink-0 border-b border-zinc-900 p-4">
                  <div className="text-sm font-semibold text-white">How to Use</div>
                  <div className="mt-1 text-xs text-zinc-500">Scroll this panel to see every indicator guide without the modal overflowing.</div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  <div className="grid gap-3 xl:grid-cols-2">
                    <MiniIndicatorPanel title="EMA 9/21/50" value="Trend backbone" detail="Use EMA stack alignment to judge continuation quality before acting on signals." />
                    <MiniIndicatorPanel title="SMA 20" value="Short structure" detail="Use as pullback/reclaim reference in active trend conditions." />
                    <MiniIndicatorPanel title="SMA 200" value="Macro structure" detail="Use as higher-timeframe regime reference, not as an immediate trigger." />
                    <MiniIndicatorPanel title="RSI" value="Chase filter" detail="Use to avoid late entries when expansion is already stretched." />
                    <MiniIndicatorPanel title="MACD" value="Momentum shift" detail="Use crosses as confirmation only after Execution Workspace context agrees." />
                    <MiniIndicatorPanel title="Stoch" value="Timing wave" detail="Use stochastic as short-term timing context, not as a standalone trade signal." />
                    <MiniIndicatorPanel title="Volume Profile" value="Price memory" detail="Use visible profile bars as approximate liquidity / acceptance zones. Yellow/Sky split shows up/down volume balance." />
                    <MiniIndicatorPanel title="VWAP" value="Fair value" detail="Use reclaim/loss around VWAP as execution confirmation, especially after sweeps." />
                    <MiniIndicatorPanel title="Anchored VWAP" value="Event anchor" detail="Anchors from recent structure to show whether price is accepted above or below event value." />
                    <MiniIndicatorPanel title="PD/PW Levels" value="Price memory" detail="Previous day/week high-low lines expose breakout, rejection and sweep zones." />
                    <MiniIndicatorPanel title="4H Levels" value="HTF context" detail="Use the latest closed 4H range as bigger-picture support/resistance while trading lower timeframes." />
                    <MiniIndicatorPanel title="Sessions" value="Timing context" detail="Session tag helps interpret whether liquidity is Asia, London or New York driven." />
                    <MiniIndicatorPanel title="MTF Matrix" value="Context matrix" detail="Fast dashboard showing 15m/1H/4H/1D trend alignment and bar change." />
                    <MiniIndicatorPanel title="BB" value="Expansion state" detail="Use band expansion for volatility release and avoid late entries outside stretched bands." />
                    <MiniIndicatorPanel title="Hull/Kalman" value="Trend turn" detail="Use Buy/Sell markers as confirmation only. Markers are cooldown-filtered to avoid signal spam." />
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "layout" ? (
            <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <div className="text-sm font-semibold text-white">Advanced Chart Layout</div>
                <div className="mt-1 text-xs text-zinc-500">Saved locally in this browser. No websocket or API configuration is changed.</div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-2 text-xs uppercase tracking-[0.18em] text-zinc-500">Density</div>
                    <div className="grid grid-cols-2 gap-2">
                      {(["comfortable", "compact"] as ChartDensity[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => setDensity(option)}
                          className={`rounded-lg border px-3 py-2 text-xs capitalize ${
                            density === option
                              ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200"
                              : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => setCompareMode((current) => !current)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                      compareMode
                        ? "border-violet-500/60 bg-violet-500/10 text-violet-200"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center gap-2"><SplitSquareHorizontal size={14} /> Compare mode</span>
                    <span>{effectiveCompareMode ? "ON" : compareMode ? "SAME PAIR BLOCKED" : "OFF"}</span>
                  </button>

                  <select
                    value={compareSymbol}
                    onChange={(event) => setCompareSymbol(event.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-300 outline-none"
                    aria-label="Compare symbol layout selector"
                  >
                    {availableCompareSymbols.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <button
                      onClick={saveLayout}
                      className="flex items-center justify-center gap-2 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 hover:text-white"
                    >
                      {saved ? <Check size={14} /> : <Save size={14} />}
                      {saved ? "Saved" : "Save"}
                    </button>
                    <button
                      onClick={resetLayout}
                      className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:text-white"
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-black p-4">
                <div className="text-sm font-semibold text-white">Current Advanced Layout</div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <MiniIndicatorPanel title="Preset" value={PRESET_COPY[activePreset].label} detail={PRESET_COPY[activePreset].detail} />
                  <MiniIndicatorPanel title="Timeframe" value={selectedTimeframe} detail="Applies to primary and compare charts inside this modal only." />
                  <MiniIndicatorPanel title="Compare" value={effectiveCompareMode ? compareSymbol : "OFF"} detail="Use for BTC/ETH/sector relative structure checks." />
                  <MiniIndicatorPanel title="Density" value={density.toUpperCase()} detail="Compact reduces chart chrome for faster tactical review." />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
