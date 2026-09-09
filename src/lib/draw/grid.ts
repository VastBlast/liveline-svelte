import type { LivelinePalette, ChartLayout } from '../types'
import { lerp } from '../math/lerp'
import type { DrawOptions } from './index'

/**
 * Pick a nice interval using TradingView's cycling divisor approach.
 * Hysteresis: once chosen, sticks until spacing falls outside [0.5×, 4×] of minGap.
 */
function pickInterval(
  valRange: number,
  pxPerUnit: number,
  minGap: number,
  prev: number,
): number {
  if (prev > 0) {
    const px = prev * pxPerUnit
    if (px >= minGap * 0.5 && px <= minGap * 4) return prev
  }

  const divisorSets = [[2, 2.5, 2], [2, 2, 2.5], [2.5, 2, 2]]
  let best = Infinity
  for (const divs of divisorSets) {
    let span = Math.min(Number.MAX_VALUE, Math.pow(10, Math.ceil(Math.log10(valRange))))
    let i = 0
    while (span / divs[i % 3] * pxPerUnit >= minGap) {
      span /= divs[i % 3]
      i++
    }
    if (span < best) best = span
  }
  return best === Infinity ? valRange / 5 : best
}

/** Float-safe divisibility check. */
function divisible(val: number, interval: number): boolean {
  const ratio = val / interval
  return Math.abs(ratio - Math.round(ratio)) < 0.01
}

/** Persistent state — interval hysteresis + per-label alpha smoothing. */
export interface GridState {
  interval: number
  labels: Map<number, number> // value → alpha
}

const FADE_IN = 0.18
const FADE_OUT = 0.12

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  { formatValue, gridState: state, dt }: Pick<DrawOptions, 'formatValue' | 'gridState' | 'dt'>,
) {
  const { w, h, pad, valRange, minVal, maxVal, toY } = layout
  const chartH = h - pad.top - pad.bottom
  if (chartH <= 0 || valRange <= 0 || !Number.isFinite(chartH) || !Number.isFinite(valRange)) return
  const pxPerUnit = chartH / valRange
  if (!Number.isFinite(pxPerUnit)) return

  // Coarse interval: always-visible anchor labels
  const coarse = pickInterval(valRange, pxPerUnit, 36, state.interval)
  state.interval = coarse

  // Fine interval: fills the gaps between coarse labels
  const fine = coarse / 2
  if (fine <= 0) return
  const finePx = fine * pxPerUnit

  // Target alpha for fine labels — hide when cramped, fade in with space
  const fineTarget = Math.max(0, Math.min(1, (finePx - 40) / 20))

  // Edge fade
  const fadeZone = 32
  const edgeAlpha = (y: number): number => {
    const fromEdge = Math.min(y - pad.top, h - pad.bottom - y)
    if (fromEdge >= fadeZone) return 1
    if (fromEdge <= 0) return 0
    return fromEdge / fadeZone
  }

  // --- Phase 1: compute target alpha for every current grid label ---
  const targets = new Map<number, number>()
  const firstIndex = Math.ceil(minVal / fine)
  const tickCount = Math.ceil(valRange / fine) + 1
  // Halving intervals such as 2.5 produces three significant digits (1.25).
  const decimals = Math.max(0, 2 - Math.floor(Math.log10(fine)))
  // Index ticks to avoid accumulating rounding error or stalling when fine
  // is smaller than the representable increment at a large value.
  for (let i = 0; i < tickCount; i++) {
    const rawValue = (firstIndex + i) * fine
    const val = decimals <= 100 ? Number(rawValue.toFixed(decimals)) : rawValue
    if (val > maxVal) break
    const y = toY(val)
    if (y < pad.top - 2 || y > h - pad.bottom + 2) continue
    const isCoarse = divisible(val, coarse)
    const target = (isCoarse ? 1 : fineTarget) * edgeAlpha(y)
    targets.set(val, target)
  }

  // --- Phase 2: update all tracked label alphas ---
  for (const [key, alpha] of state.labels) {
    const target = targets.get(key) ?? 0
    const speed = target >= alpha ? FADE_IN : FADE_OUT
    let next = lerp(alpha, target, speed, dt)
    if (Math.abs(next - target) < 0.02) next = target
    if (next < 0.01 && target === 0) {
      state.labels.delete(key)
    } else {
      state.labels.set(key, next)
    }
  }

  // New labels not yet in state
  for (const [key, target] of targets) {
    if (!state.labels.has(key)) {
      state.labels.set(key, target * FADE_IN)
    }
  }

  // --- Phase 3: draw ---
  const baseAlpha = ctx.globalAlpha
  ctx.setLineDash([1, 3])
  ctx.lineWidth = 1
  ctx.font = palette.labelFont
  ctx.textAlign = 'left'

  for (const [val, alpha] of state.labels) {
    if (alpha < 0.02) continue

    const y = toY(val)
    if (y < pad.top - 10 || y > h - pad.bottom + 10) continue

    ctx.save()
    ctx.globalAlpha = baseAlpha * alpha

    ctx.strokeStyle = palette.gridLine
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(w - pad.right, y)
    ctx.stroke()

    ctx.fillStyle = palette.gridLabel
    ctx.fillText(formatValue(val), w - pad.right + 8, y + 4)

    ctx.restore()
  }

  ctx.setLineDash([])
}
