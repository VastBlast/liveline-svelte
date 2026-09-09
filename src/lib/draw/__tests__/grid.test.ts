import { describe, expect, it, vi } from 'vitest'
import { drawGrid } from '../grid'
import { resolveTheme } from '../../theme'
import type { ChartLayout } from '../../types'

function renderGrid(minVal: number, maxVal: number, height = 300, interval = 0) {
  const formatValue = vi.fn(String)
  const layout: ChartLayout = {
    w: 400, h: height,
    pad: { left: 0, right: 60, top: 0, bottom: 0 },
    chartW: 340, chartH: height,
    minVal, maxVal, valRange: maxVal - minVal,
    leftEdge: 0, rightEdge: 60,
    toX: (time) => time / 60 * 340,
    toY: (value) => (1 - (value - minVal) / (maxVal - minVal)) * height,
  }
  const ctx = {
    globalAlpha: 1,
    save() {}, restore() {}, setLineDash() {},
    beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText() {},
  } as unknown as CanvasRenderingContext2D
  drawGrid(ctx, layout, resolveTheme('#3b82f6', 'light'), {
    formatValue, gridState: { interval, labels: new Map() }, dt: 16.67,
  })
  return formatValue.mock.calls.map(([value]) => value)
}

describe('grid labels', () => {
  it('preserves precision for values below one thousandth', () => {
    const values = renderGrid(0.000001, 0.000002)
    expect(values.length).toBeGreaterThan(2)
    expect(new Set(values).size).toBe(values.length)
    expect(values.every((value) => value > 0.000001 && value < 0.000002)).toBe(true)
  })

  it('does not expose accumulated floating point errors to formatters', () => {
    const values = renderGrid(0.1, 0.9)
    expect(values).toContain(0.3)
    expect(values.every((value) => value === Number(value.toFixed(2)))).toBe(true)
  })

  it.each([1, 0.01, 0.0001])('preserves fractional ticks with three significant digits at scale %s', (scale) => {
    // Hysteresis retains the coarse interval as the chart grows, exposing fine labels.
    const values = renderGrid(0, 20 * scale, 1000, 2.5 * scale)
    expect(values).toContain(1.25 * scale)
    expect(values).toContain(3.75 * scale)
  })

  it('finishes when tick spacing is below the representable increment', () => {
    const values = renderGrid(1e15, 1e15 + 1)
    expect(values.length).toBeGreaterThan(0)
    expect(values.length).toBeLessThan(20)
    expect(new Set(values).size).toBe(values.length)
  })

  it('handles finite ranges whose next power of ten overflows', () => {
    const values = renderGrid(0, 1.5e308)
    expect(values.length).toBeGreaterThan(0)
    expect(values.length).toBeLessThan(20)
    expect(values.every(Number.isFinite)).toBe(true)
  })
})
