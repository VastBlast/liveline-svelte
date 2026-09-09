import { describe, expect, it } from 'vitest'
import { layoutReadout, readoutHeight, type ReadoutItem } from '../readout'
import { resolveTheme } from '../../theme'

// Eight pixels per character, so widths are easy to reason about.
const ctx = {
  font: '',
  measureText: (text: string) => ({ width: text.length * 8 }),
} as unknown as CanvasRenderingContext2D
const palette = resolveTheme('#3b82f6', 'dark')

const items: ReadoutItem[] = [
  { dot: '#0f0', label: 'Longs', value: '$299K' },   // 12 + 48 + 40 = 100
  { dot: '#f00', label: 'Shorts', value: '$4.13K' }, // 12 + 56 + 48 = 116
  { value: '18:56:00' },                             // 64
]

describe('readout layout', () => {
  it('keeps everything on one row when it fits', () => {
    const layout = layoutReadout(ctx, palette, items, { maxWidth: 400 })
    expect(layout.rows).toBe(1)
    expect(layout.items.map((placed) => placed.x)).toEqual([0, 114, 244])
  })

  it('wraps items that would overrun the width', () => {
    const layout = layoutReadout(ctx, palette, items, { maxWidth: 240 })
    expect(layout.rows).toBe(2)
    expect(layout.items.map((placed) => placed.row)).toEqual([0, 0, 1])
  })

  it('holds a slot open at its widest so later items stay put', () => {
    const wide = layoutReadout(ctx, palette, items, { maxWidth: 400 })
    const narrower = [{ ...items[0], value: '$3' }, items[1], items[2]]
    expect(layoutReadout(ctx, palette, narrower, { maxWidth: 400 }).items[1].x).toBe(90)
    expect(layoutReadout(ctx, palette, narrower, { maxWidth: 400, minWidths: wide.widths }).items[1].x).toBe(114)
  })

  it('reserves no band without items', () => {
    expect(layoutReadout(ctx, palette, [], { maxWidth: 240 }).rows).toBe(0)
    expect(readoutHeight(0)).toBe(0)
    expect(readoutHeight(2)).toBeGreaterThan(readoutHeight(1))
  })
})
