import type { MarketMoverCandidate } from "@/lib/market-movers/types"

export type SnapshotCandle = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

type ExportSetupSnapshotArgs = {
  symbol: string
  timeframe: string
  candles: SnapshotCandle[]
  candidate: MarketMoverCandidate
}

type ExportSetupSnapshotResult = {
  ok: boolean
  copied: boolean
  downloaded: boolean
  filename?: string
  reason?: string
}

const WIDTH = 1280
const HEIGHT = 720
const HEADER_H = 88
const FOOTER_H = 112
const PAD = 28
const CHART_TOP = HEADER_H + 18
const CHART_BOTTOM = HEIGHT - FOOTER_H - 20
const CHART_LEFT = PAD
const CHART_RIGHT = WIDTH - PAD
const CHART_W = CHART_RIGHT - CHART_LEFT
const CHART_H = CHART_BOTTOM - CHART_TOP

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function fmtPrice(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-"
  if (Math.abs(value) >= 100) return value.toFixed(2)
  if (Math.abs(value) >= 1) return value.toFixed(4)
  return value.toFixed(6)
}

function biasColor(direction: string) {
  if (direction === "LONG") return "#22c55e"
  if (direction === "SHORT") return "#ef4444"
  return "#94a3b8"
}

function lineColor(kind: "entry" | "sl" | "tp") {
  if (kind === "entry") return "#38bdf8"
  if (kind === "sl") return "#fb7185"
  return "#a3e635"
}

function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.arcTo(x + w, y, x + w, y + h, radius)
  ctx.arcTo(x + w, y + h, x, y + h, radius)
  ctx.arcTo(x, y + h, x, y, radius)
  ctx.arcTo(x, y, x + w, y, radius)
  ctx.closePath()
}

function drawPill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string, stroke = "rgba(255,255,255,0.12)", color = "#f8fafc") {
  ctx.font = "700 18px Arial, sans-serif"
  const w = ctx.measureText(text).width + 26
  drawRoundRect(ctx, x, y, w, 32, 16)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, x + 13, y + 22)
  return w
}

function drawLabelledLine(ctx: CanvasRenderingContext2D, y: number, label: string, value: string, color: string) {
  const yy = clamp(y, CHART_TOP + 6, CHART_BOTTOM - 6)
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.setLineDash([8, 7])
  ctx.beginPath()
  ctx.moveTo(CHART_LEFT, yy)
  ctx.lineTo(CHART_RIGHT - 108, yy)
  ctx.stroke()
  ctx.setLineDash([])

  const text = `${label} ${value}`
  ctx.font = "700 16px Arial, sans-serif"
  const w = ctx.measureText(text).width + 18
  drawRoundRect(ctx, CHART_RIGHT - w, yy - 16, w, 32, 8)
  ctx.fillStyle = "rgba(0,0,0,0.78)"
  ctx.fill()
  ctx.strokeStyle = color
  ctx.stroke()
  ctx.fillStyle = color
  ctx.fillText(text, CHART_RIGHT - w + 9, yy + 6)
  ctx.restore()
}

async function copyBlobToClipboard(blob: Blob) {
  try {
    const ClipboardItemCtor = (window as typeof window & { ClipboardItem?: typeof ClipboardItem }).ClipboardItem
    if (!navigator.clipboard || !ClipboardItemCtor) return false
    await navigator.clipboard.write([new ClipboardItemCtor({ "image/png": blob })])
    return true
  } catch {
    return false
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1200)
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const anchor = document.createElement("a")
  anchor.href = dataUrl
  anchor.download = filename
  anchor.rel = "noopener"
  anchor.style.display = "none"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(",")
  const match = header.match(/data:(.*?);base64/)
  const mime = match?.[1] ?? "image/png"
  const binary = atob(body)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return new Blob([bytes], { type: mime })
}

function safePlan(candidate: MarketMoverCandidate) {
  const plan = candidate.numericPlan
  if (!plan || plan.side === "NEUTRAL") return null
  const values = [plan.entryLow, plan.entryHigh, plan.stopLoss, plan.takeProfit1, plan.takeProfit2, plan.detectedPrice]
  if (!values.every((value) => Number.isFinite(value))) return null
  return plan
}

function safeText(value: unknown, fallback = "-") {
  return typeof value === "string" && value.trim() ? value : fallback
}

export async function exportSetupSnapshotPng({ symbol, timeframe, candles, candidate }: ExportSetupSnapshotArgs): Promise<ExportSetupSnapshotResult> {
  if (typeof document === "undefined") return { ok: false, copied: false, downloaded: false, reason: "document unavailable" }

  const usable = candles.filter((item) => Number.isFinite(item.open) && Number.isFinite(item.high) && Number.isFinite(item.low) && Number.isFinite(item.close)).slice(-96)
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext("2d")
  if (!ctx) return { ok: false, copied: false, downloaded: false, reason: "canvas context unavailable" }

  const dir = candidate.direction || "NEUTRAL"
  const accent = biasColor(dir)
  const plan = safePlan(candidate)
  const prices = usable.flatMap((item) => [item.high, item.low])
  if (plan) {
    prices.push(plan.entryLow, plan.entryHigh, plan.stopLoss, plan.takeProfit1, plan.takeProfit2, plan.detectedPrice)
  } else if (Number.isFinite(candidate.lastPrice)) {
    prices.push(candidate.lastPrice * 0.99, candidate.lastPrice, candidate.lastPrice * 1.01)
  }
  const finitePrices = prices.filter((price) => Number.isFinite(price))
  if (!finitePrices.length) return { ok: false, copied: false, downloaded: false, reason: "no price data" }
  const minPrice = Math.min(...finitePrices)
  const maxPrice = Math.max(...finitePrices)
  const padRange = Math.max((maxPrice - minPrice) * 0.08, Math.abs(maxPrice) * 0.002, 1e-9)
  const lo = minPrice - padRange
  const hi = maxPrice + padRange
  const priceToY = (price: number) => CHART_TOP + ((hi - price) / Math.max(hi - lo, 1e-9)) * CHART_H

  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, "#020617")
  gradient.addColorStop(0.58, "#050505")
  gradient.addColorStop(1, "#09090b")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, WIDTH, HEIGHT)

  ctx.strokeStyle = "rgba(255,255,255,0.08)"
  ctx.lineWidth = 1
  drawRoundRect(ctx, 14, 14, WIDTH - 28, HEIGHT - 28, 24)
  ctx.stroke()

  ctx.fillStyle = "#f8fafc"
  ctx.font = "800 34px Arial, sans-serif"
  ctx.fillText(`${symbol.toUpperCase()} · ${timeframe}`, PAD, 56)
  let pillX = PAD + ctx.measureText(`${symbol.toUpperCase()} · ${timeframe}`).width + 24
  pillX += drawPill(ctx, safeText(candidate.bias, `${dir} BIAS`), pillX, 30, `${accent}22`, `${accent}88`, accent) + 10
  pillX += drawPill(ctx, `GRADE ${safeText(candidate.grade, "-")}`, pillX, 30, "rgba(56,189,248,0.14)", "rgba(56,189,248,0.45)", "#7dd3fc") + 10
  drawPill(ctx, safeText(candidate.confidence), pillX, 30, "rgba(255,255,255,0.08)", "rgba(255,255,255,0.14)", "#e5e7eb")

  ctx.fillStyle = "#71717a"
  ctx.font = "700 15px Arial, sans-serif"
  ctx.fillText(`Setup Snapshot · ${new Date().toLocaleString()}`, PAD, 80)

  drawRoundRect(ctx, CHART_LEFT, CHART_TOP, CHART_W, CHART_H, 16)
  ctx.fillStyle = "#030712"
  ctx.fill()
  ctx.strokeStyle = "rgba(255,255,255,0.08)"
  ctx.stroke()

  ctx.save()
  ctx.beginPath()
  drawRoundRect(ctx, CHART_LEFT, CHART_TOP, CHART_W, CHART_H, 16)
  ctx.clip()

  ctx.strokeStyle = "rgba(255,255,255,0.055)"
  ctx.lineWidth = 1
  for (let i = 1; i < 6; i += 1) {
    const y = CHART_TOP + (CHART_H / 6) * i
    ctx.beginPath()
    ctx.moveTo(CHART_LEFT, y)
    ctx.lineTo(CHART_RIGHT, y)
    ctx.stroke()
  }

  if (plan) {
    const entryTop = priceToY(Math.max(plan.entryLow, plan.entryHigh))
    const entryBottom = priceToY(Math.min(plan.entryLow, plan.entryHigh))
    ctx.fillStyle = "rgba(56,189,248,0.16)"
    ctx.fillRect(CHART_LEFT, entryTop, CHART_W, Math.max(4, entryBottom - entryTop))
  }

  if (usable.length) {
    const step = CHART_W / Math.max(usable.length, 1)
    const candleW = clamp(step * 0.58, 3, 9)
    usable.forEach((item, index) => {
      const x = CHART_LEFT + step * index + step / 2
      const openY = priceToY(item.open)
      const closeY = priceToY(item.close)
      const highY = priceToY(item.high)
      const lowY = priceToY(item.low)
      const up = item.close >= item.open
      const color = up ? "#22c55e" : "#ef4444"
      ctx.strokeStyle = color
      ctx.fillStyle = color
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(x, highY)
      ctx.lineTo(x, lowY)
      ctx.stroke()
      const bodyTop = Math.min(openY, closeY)
      const bodyH = Math.max(2, Math.abs(openY - closeY))
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    })
  } else {
    ctx.fillStyle = "#71717a"
    ctx.font = "700 22px Arial, sans-serif"
    ctx.fillText("Waiting for chart candles...", CHART_LEFT + 36, CHART_TOP + 70)
  }

  if (plan) {
    drawLabelledLine(ctx, priceToY((plan.entryLow + plan.entryHigh) / 2), "ENTRY", `${fmtPrice(plan.entryLow)}-${fmtPrice(plan.entryHigh)}`, lineColor("entry"))
    drawLabelledLine(ctx, priceToY(plan.stopLoss), "SL", fmtPrice(plan.stopLoss), lineColor("sl"))
    drawLabelledLine(ctx, priceToY(plan.takeProfit1), "TP1", fmtPrice(plan.takeProfit1), lineColor("tp"))
    drawLabelledLine(ctx, priceToY(plan.takeProfit2), "TP2", fmtPrice(plan.takeProfit2), lineColor("tp"))
  }

  const markerX = CHART_LEFT + CHART_W * 0.72
  const markerY = CHART_TOP + 30
  ctx.fillStyle = `${accent}22`
  drawRoundRect(ctx, markerX, markerY, 230, 50, 12)
  ctx.fill()
  ctx.strokeStyle = `${accent}88`
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.font = "800 16px Arial, sans-serif"
  ctx.fillText("SETUP DETECTED", markerX + 14, markerY + 22)
  ctx.fillStyle = "#d4d4d8"
  ctx.font = "700 13px Arial, sans-serif"
  ctx.fillText(`${safeText(candidate.setup)} · ${safeText(candidate.marketRegime)}`, markerX + 14, markerY + 40)

  ctx.restore()

  const footerTop = HEIGHT - FOOTER_H + 8
  const metrics = [
    ["ENTRY", safeText(candidate.entryZone)],
    ["SL", safeText(candidate.stopLoss)],
    ["TP1 / TP2", `${safeText(candidate.takeProfit1)} / ${safeText(candidate.takeProfit2)}`],
    ["R:R", safeText(candidate.riskReward)],
    ["SIZE", Number.isFinite(candidate.suggestedPositionPct) ? `${candidate.suggestedPositionPct}%` : "-"],
    ["REGIME", safeText(candidate.marketRegime)],
  ]
  const boxW = (WIDTH - PAD * 2 - 10 * (metrics.length - 1)) / metrics.length
  metrics.forEach(([label, value], index) => {
    const x = PAD + index * (boxW + 10)
    drawRoundRect(ctx, x, footerTop, boxW, 66, 14)
    ctx.fillStyle = "rgba(255,255,255,0.035)"
    ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.08)"
    ctx.stroke()
    ctx.fillStyle = "#71717a"
    ctx.font = "800 11px Arial, sans-serif"
    ctx.fillText(label, x + 13, footerTop + 22)
    ctx.fillStyle = label === "SL" ? "#fb7185" : label.startsWith("TP") ? "#a3e635" : "#f8fafc"
    ctx.font = "800 16px Arial, sans-serif"
    const clipped = value.length > 20 ? `${value.slice(0, 19)}…` : value
    ctx.fillText(clipped, x + 13, footerTop + 47)
  })

  ctx.fillStyle = "#52525b"
  ctx.font = "700 12px Arial, sans-serif"
  ctx.fillText("QuantTerminal · chart-centered setup snapshot", PAD, HEIGHT - 22)

  const filename = `QuantTerminal_${symbol.toUpperCase()}_${dir}_${Date.now()}.png`
  let dataUrl = ""
  try {
    dataUrl = canvas.toDataURL("image/png", 0.95)
    downloadDataUrl(dataUrl, filename)
  } catch (error) {
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95))
      if (!blob) return { ok: false, copied: false, downloaded: false, filename, reason: "png blob unavailable" }
      downloadBlob(blob, filename)
      return { ok: true, copied: false, downloaded: true, filename }
    } catch (fallbackError) {
      return {
        ok: false,
        copied: false,
        downloaded: false,
        filename,
        reason: fallbackError instanceof Error ? fallbackError.message : error instanceof Error ? error.message : "download failed",
      }
    }
  }

  return { ok: true, copied: false, downloaded: true, filename }
}
