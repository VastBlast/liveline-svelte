import { describe, expect, it, vi } from 'vitest'
import { drawCrosshair } from '../crosshair'
import { resolveTheme } from '../../theme'
import type { ChartLayout } from '../../types'

describe('crosshair markers', () => {
  it('keeps markers on the plot as a range transition moves values beyond its edges', () => {
    const arc = vi.fn()
    const ctx = {
      save() {}, restore() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc,
    } as unknown as CanvasRenderingContext2D
    const layout: ChartLayout = {
      w: 640, h: 320,
      pad: { top: 44, right: 40, bottom: 28, left: 12 },
      chartW: 588, chartH: 248,
      leftEdge: 0, rightEdge: 60,
      minVal: 0, maxVal: 1, valRange: 1,
      toX: (time) => 12 + time / 60 * 588,
      toY: (value) => 44 + (1 - value) * 248,
    }
    const palette = resolveTheme('#3b82f6', 'dark')

    drawCrosshair(ctx, layout, palette, {
      hoverX: 300,
      opacity: 1,
      points: [2, -1, 0.5].map(value => ({ y: layout.toY(value), color: palette.line })),
    })

    expect(arc.mock.calls.map(([x, y]) => [x, y])).toEqual([
      [300, 44],
      [300, 292],
      [300, 168],
    ])
  })
})
