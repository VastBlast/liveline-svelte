/** Default value formatter: two decimals. */
export const defaultFormatValue = (value: number) => value.toFixed(2)

/**
 * Default time formatter: a 24-hour `HH:MM:SS`, or `HH:MM` when the label
 * stands for a whole minute or more, such as an axis tick or a candle.
 */
export function defaultFormatTime(time: number, step?: number): string {
  const date = new Date(time * 1000)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  if (step !== undefined && step >= 60) return `${hours}:${minutes}`
  return `${hours}:${minutes}:${date.getSeconds().toString().padStart(2, '0')}`
}
