import type { ChartLayout, LivelinePalette, CandlePoint } from '../types'

export type { CandlePoint } from '../types'

interface CandleCrosshairOptions {
  hoverX: number
  opacity: number
}

export const BULL = '#22c55e'
export const BEAR = '#ef4444'

// Pre-parsed RGB for fast interpolation
const BULL_RGB = [34, 197, 94] as const
const BEAR_RGB = [239, 68, 68] as const

/** Blend bear→bull by t (0=bear, 1=bull). */
function blendColor(t: number): string {
  const r = Math.round(BEAR_RGB[0] + (BULL_RGB[0] - BEAR_RGB[0]) * t)
  const g = Math.round(BEAR_RGB[1] + (BULL_RGB[1] - BEAR_RGB[1]) * t)
  const b = Math.round(BEAR_RGB[2] + (BULL_RGB[2] - BEAR_RGB[2]) * t)
  return `rgb(${r},${g},${b})`
}

/** Parse "#rrggbb" or "rgb(r,g,b)" to [r,g,b]. */
function parseRgb(color: string): [number, number, number] {
  const hex = color.match(/^#([0-9a-f]{6})$/i)
  if (hex) {
    const h = hex[1]
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const rgb = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]]
  return [128, 128, 128]
}

/** Blend a candle color toward an accent color by t. */
function blendToAccent(candleColor: string, accentColor: string, t: number): string {
  if (t <= 0) return candleColor
  if (t >= 1) return accentColor
  const [r1, g1, b1] = parseRgb(candleColor)
  const [r2, g2, b2] = parseRgb(accentColor)
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return `rgb(${r},${g},${b})`
}

/**
 * Compute pixel dimensions for candle rendering.
 */
function candleDims(layout: ChartLayout, candleWidthSecs: number) {
  const pxPerSec = layout.chartW / (layout.rightEdge - layout.leftEdge)
  const candlePxW = candleWidthSecs * pxPerSec
  const bodyW = Math.max(1, candlePxW * 0.7)
  const wickW = Math.max(0.8, Math.min(2, bodyW * 0.15))
  const radius = bodyW > 6 ? 1.5 : 0
  return { bodyW, wickW, radius }
}

/**
 * Rounded rect helper — draws path only (caller fills/strokes).
 */
function roundedRect(
  ctx: CanvasRenderingContext2D,
  { x, y, w, h, r }: {
    x: number
    y: number
    w: number
    h: number
    r: number
  },
) {
  if (r <= 0 || h < r * 2) {
    ctx.rect(x, y, w, h)
    return
  }
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

/**
 * Draw OHLC candlesticks with live candle glow + scrub dimming.
 * Respects incoming ctx.globalAlpha for cross-fade/reveal support.
 */
export function drawCandlesticks(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  candles: CandlePoint[],
  {
    candleWidthSecs,
    liveTime,
    now_ms,
    scrubX,
    scrubDim,
    liveAlpha = 1,
    liveBullBlend = -1,
    accentColor,
    accentBlend = 0,
  }: {
    candleWidthSecs: number
    liveTime: number
    now_ms: number
    scrubX: number
    scrubDim: number
    liveAlpha?: number
    liveBullBlend?: number
    accentColor?: string
    accentBlend?: number
  },
) {
  if (candles.length === 0) return

  const { toX, toY } = layout
  const { bodyW, wickW, radius } = candleDims(layout, candleWidthSecs)
  const halfBody = bodyW / 2
  const padL = layout.pad.left
  const padR = layout.pad.left + layout.chartW

  // Live pulse: subtle brightness cycle
  const livePulse = 0.12 + Math.sin(now_ms * 0.004) * 0.08

  for (const c of candles) {
    const cx = toX(c.time + candleWidthSecs / 2)
    if (cx + halfBody < padL || cx - halfBody > padR) continue

    const isBull = c.close >= c.open
    const isLive = c.time === liveTime
    let color = isBull ? BULL : BEAR
    if (isLive && liveBullBlend >= 0) color = blendColor(liveBullBlend)
    if (accentColor && accentBlend > 0.01) {
      color = blendToAccent(color, accentColor, accentBlend)
    }

    // Scrub dimming: smooth spatial gradient from cursor position
    let candleAlpha = isLive ? liveAlpha : 1
    if (scrubDim > 0.01 && scrubX > 0) {
      const dist = cx - scrubX
      if (dist > 0) {
        const fadeZone = bodyW * 1.5
        const dimT = Math.min(dist / fadeZone, 1)
        candleAlpha *= 1 - scrubDim * 0.5 * dimT
      }
    }

    const baseAlpha = ctx.globalAlpha
    ctx.globalAlpha = baseAlpha * candleAlpha

    // Body geometry
    const bodyTop = toY(Math.max(c.open, c.close))
    const bodyBottom = toY(Math.min(c.open, c.close))
    const body = {
      x: cx - halfBody,
      y: bodyTop,
      w: bodyW,
      h: Math.max(1, bodyBottom - bodyTop),
      r: radius,
    }

    // Wicks
    const wickTop = toY(c.high)
    const wickBottom = toY(c.low)
    ctx.lineCap = 'round'
    ctx.strokeStyle = color

    if (bodyTop - wickTop > 0.5) {
      ctx.beginPath()
      ctx.moveTo(cx, bodyTop)
      ctx.lineTo(cx, wickTop)
      ctx.lineWidth = wickW
      ctx.stroke()
    }
    if (wickBottom - bodyBottom > 0.5) {
      ctx.beginPath()
      ctx.moveTo(cx, bodyBottom)
      ctx.lineTo(cx, wickBottom)
      ctx.lineWidth = wickW
      ctx.stroke()
    }

    // Body
    ctx.fillStyle = color
    ctx.beginPath()
    roundedRect(ctx, body)
    ctx.fill()

    // Live candle glow
    if (isLive) {
      ctx.save()
      ctx.globalAlpha = baseAlpha * candleAlpha * livePulse
      ctx.shadowColor = color
      ctx.shadowBlur = 8
      ctx.fillStyle = color
      ctx.beginPath()
      roundedRect(ctx, body)
      ctx.fill()
      ctx.restore()
    }

    ctx.globalAlpha = baseAlpha
  }
}

/**
 * Draw a dashed horizontal line at the live close price.
 * Dims when scrubbing, uses candle direction color.
 */
export function drawClosePrice(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  liveCandle: CandlePoint,
  { scrubAmount: scrubDim, liveBullBlend: bullBlend = -1 }: {
    scrubAmount: number
    liveBullBlend?: number
  },
) {
  const y = layout.toY(liveCandle.close)
  if (y < layout.pad.top || y > layout.h - layout.pad.bottom) return

  const isBull = liveCandle.close >= liveCandle.open
  let color = isBull ? BULL : BEAR
  if (bullBlend >= 0) color = blendColor(bullBlend)

  const baseAlpha = ctx.globalAlpha
  ctx.save()
  ctx.setLineDash([4, 4])
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.globalAlpha = baseAlpha * (1 - scrubDim * 0.3) * 0.4
  ctx.beginPath()
  ctx.moveTo(layout.pad.left, y)
  ctx.lineTo(layout.w - layout.pad.right, y)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

/** Candle crosshair: a vertical line through the hovered candle. */
export function drawCandleCrosshair(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  { hoverX, opacity }: CandleCrosshairOptions,
) {
  if (opacity < 0.01) return

  const { h, pad } = layout
  ctx.save()
  ctx.globalAlpha = opacity * 0.5
  ctx.strokeStyle = palette.crosshairLine
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(hoverX, pad.top)
  ctx.lineTo(hoverX, h - pad.bottom)
  ctx.stroke()
  ctx.restore()
}

/** Line-mode crosshair: the vertical line plus a fainter horizontal one through the value. */
export function drawLineModeCrosshair(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  { hoverX, y, opacity }: CandleCrosshairOptions & { y: number },
) {
  if (opacity < 0.01) return

  const { h, pad } = layout
  ctx.save()
  ctx.globalAlpha = opacity * 0.5
  ctx.strokeStyle = palette.crosshairLine
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(hoverX, pad.top)
  ctx.lineTo(hoverX, h - pad.bottom)
  ctx.stroke()

  ctx.globalAlpha = opacity * 0.3
  ctx.beginPath()
  ctx.moveTo(pad.left, y)
  ctx.lineTo(layout.w - pad.right, y)
  ctx.stroke()
  ctx.restore()
}
