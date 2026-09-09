import type { LivelinePoint } from '../types'

/** Copy the inclusive time range from points sorted by ascending time. */
export function sliceTimeRange<T extends { time: number }>(
  points: readonly T[],
  from: number,
  to: number,
): T[] {
  if (!(from <= to)) return []

  let lo = 0
  let hi = points.length
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (points[mid].time < from) lo = mid + 1
    else hi = mid
  }
  const start = lo

  hi = points.length
  while (lo < hi) {
    const mid = lo + Math.floor((hi - lo) / 2)
    if (points[mid].time <= to) lo = mid + 1
    else hi = mid
  }
  return points.slice(start, lo)
}

/**
 * Binary search to find interpolated value at a given time.
 * Clamps outside the data range; returns null for empty data.
 */
export function interpolateAtTime(
  points: LivelinePoint[],
  time: number,
): number | null {
  if (points.length === 0) return null
  if (time <= points[0].time) return points[0].value
  if (time >= points[points.length - 1].time) return points[points.length - 1].value

  // Binary search for the interval containing `time`
  let lo = 0
  let hi = points.length - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].time <= time) lo = mid
    else hi = mid
  }

  const p1 = points[lo]
  const p2 = points[hi]
  const dt = p2.time - p1.time
  if (dt === 0) return p1.value
  const t = (time - p1.time) / dt
  return p1.value + (p2.value - p1.value) * t
}
