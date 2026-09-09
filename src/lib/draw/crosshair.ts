import type { LivelinePalette, ChartLayout } from '../types'

export interface CrosshairPoint {
  y: number
  color: string
}

/**
 * Vertical line through the hovered time, with a solid dot where it meets
 * each series. The values themselves live in the readout above the plot.
 */
export function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  layout: ChartLayout,
  palette: LivelinePalette,
  { hoverX, points, opacity }: { hoverX: number; points: CrosshairPoint[]; opacity: number },
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

  // Dots stay fully opaque; their radius carries the appear and disappear.
  const dotRadius = 4 * Math.min(opacity * 3, 1)
  if (dotRadius > 0.5) {
    ctx.globalAlpha = 1
    for (const point of points) {
      // Match the line's clamped position while the range is changing.
      const y = Math.max(pad.top, Math.min(h - pad.bottom, point.y))
      ctx.beginPath()
      ctx.arc(hoverX, y, dotRadius, 0, Math.PI * 2)
      ctx.fillStyle = point.color
      ctx.fill()
    }
  }
  ctx.restore()
}
