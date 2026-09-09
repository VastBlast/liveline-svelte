import type { LivelinePalette } from '../types'

/** One entry of the readout: an optional series dot and label, then the value. */
export interface ReadoutItem {
  value: string
  label?: string
  /** Series colour, drawn as a dot before the text. */
  dot?: string
  /** Text colour of the value (default: the tooltip text colour). */
  color?: string
}

interface PlacedItem {
  item: ReadoutItem
  x: number
  row: number
  labelWidth: number
}

export interface ReadoutLayout {
  items: PlacedItem[]
  rows: number
  /** Width each item took, in order. */
  widths: number[]
}

const LINE_HEIGHT = 18
/** Space between the readout and the plot below it. */
const PLOT_GAP = 6
const ITEM_GAP = 14
const DOT_RADIUS = 3.5
/** The dot plus the space before the text that follows it. */
const DOT_WIDTH = 12

/** Height the readout band takes above the plot for `rows` rows. */
export function readoutHeight(rows: number): number {
  return rows > 0 ? rows * LINE_HEIGHT + PLOT_GAP : 0
}

/**
 * Flows the items left to right, starting a new row when one would not fit.
 * `minWidths` holds each item's slot open at least that wide, so a value
 * that narrows does not pull the items after it back and forth.
 */
export function layoutReadout(
  ctx: CanvasRenderingContext2D,
  palette: LivelinePalette,
  items: ReadoutItem[],
  { maxWidth, minWidths = [] }: { maxWidth: number; minWidths?: number[] },
): ReadoutLayout {
  ctx.font = palette.readoutFont
  const placed: PlacedItem[] = []
  const widths: number[] = []
  let x = 0
  let row = 0
  for (const [index, item] of items.entries()) {
    const labelWidth = item.label ? ctx.measureText(`${item.label} `).width : 0
    const width = Math.max(
      (item.dot ? DOT_WIDTH : 0) + labelWidth + ctx.measureText(item.value).width,
      minWidths[index] ?? 0,
    )
    if (x > 0 && x + width > maxWidth) {
      x = 0
      row++
    }
    placed.push({ item, x, row, labelWidth })
    widths.push(width)
    x += width + ITEM_GAP
  }
  return { items: placed, rows: items.length > 0 ? row + 1 : 0, widths }
}

export function drawReadout(
  ctx: CanvasRenderingContext2D,
  palette: LivelinePalette,
  layout: ReadoutLayout,
  { x: left, y: top, alpha }: { x: number; y: number; alpha: number },
) {
  if (alpha < 0.01) return
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.font = palette.readoutFont
  ctx.textAlign = 'left'
  ctx.textBaseline = 'middle'
  for (const { item, x, row, labelWidth } of layout.items) {
    let cx = left + x
    const cy = top + row * LINE_HEIGHT + LINE_HEIGHT / 2
    if (item.dot) {
      ctx.beginPath()
      ctx.arc(cx + DOT_RADIUS, cy, DOT_RADIUS, 0, Math.PI * 2)
      ctx.fillStyle = item.dot
      ctx.fill()
      cx += DOT_WIDTH
    }
    if (item.label) {
      ctx.fillStyle = palette.gridLabel
      ctx.fillText(item.label, cx, cy)
      cx += labelWidth
    }
    ctx.fillStyle = item.color ?? palette.tooltipText
    ctx.fillText(item.value, cx, cy)
  }
  ctx.restore()
}
