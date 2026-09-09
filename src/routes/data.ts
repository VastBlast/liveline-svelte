import type { CandlePoint, LivelinePoint, LivelineSeries } from 'liveline-svelte'

const VOLATILITY = { calm: 0.18, normal: 0.75, wild: 2.5 }
export type Volatility = keyof typeof VOLATILITY

export interface MarketData {
  price: LivelinePoint[]
  outcomes: LivelineSeries[]
}

const HISTORY_SECONDS = 360
const BASE_PRICE = 142.5
const OUTCOMES = [
  { id: 'up', label: 'Up', color: '#3b82f6', base: 48 },
  { id: 'flat', label: 'Flat', color: '#8b5cf6', base: 30 },
  { id: 'down', label: 'Down', color: '#f97316', base: 22 },
]

function nextValue(previous: number, base: number, elapsed: number, volatility: Volatility) {
  // Random movement, mean reversion, and occasional spikes in wild mode.
  return Math.max(1, previous
    + (Math.random() + Math.random() + Math.random() - 1.5) * VOLATILITY[volatility] * Math.sqrt(elapsed)
    + (base - previous) * 0.018 * elapsed
    + (volatility === 'wild' && Math.random() < 0.035 ? (Math.random() - 0.5) * 6 : 0))
}

function nextProbabilities(previous: number[], elapsed: number, volatility: Volatility) {
  const values = previous.map((value, index) => nextValue(value, OUTCOMES[index].base, elapsed, volatility))
  const total = values.reduce((sum, value) => sum + value, 0)
  return values.map((value) => value / total * 100)
}

function appendPoint(data: LivelinePoint[], point: LivelinePoint) {
  let start = 0

  // Keep one point before the horizon so interpolation reaches the left edge.
  while (start < data.length - 1 && data[start + 1].time < point.time - HISTORY_SECONDS) start++

  return [...data.slice(start), point]
}

export function seedMarket(volatility: Volatility): MarketData {
  const now = Date.now() / 1000
  const price: LivelinePoint[] = []
  const outcomes: LivelineSeries[] = OUTCOMES.map(({ id, label, color, base }) => ({
    id, label, color, data: [], value: base,
  }))
  let priceValue = BASE_PRICE
  let probabilities = OUTCOMES.map((outcome) => outcome.base)

  for (let offset = HISTORY_SECONDS; offset >= 0; offset -= 0.5) {
    const time = now - offset
    priceValue = nextValue(priceValue, BASE_PRICE, 0.5, volatility)
    probabilities = nextProbabilities(probabilities, 0.5, volatility)
    price.push({ time, value: priceValue })

    for (let index = 0; index < outcomes.length; index++) {
      outcomes[index].value = probabilities[index]
      outcomes[index].data.push({ time, value: probabilities[index] })
    }
  }

  return { price, outcomes }
}

export function advanceMarket(previous: MarketData, volatility: Volatility): MarketData {
  const time = Date.now() / 1000
  const lastPrice = previous.price[previous.price.length - 1]
  if (time <= lastPrice.time) return previous

  // A background tab may skip ticks. Avoid an outsized jump on its return.
  const elapsed = Math.min(time - lastPrice.time, 2)
  const probabilities = nextProbabilities(previous.outcomes.map((outcome) => outcome.value), elapsed, volatility)

  return {
    price: appendPoint(previous.price, { time, value: nextValue(lastPrice.value, BASE_PRICE, elapsed, volatility) }),
    outcomes: previous.outcomes.map((outcome, index) => ({
      ...outcome,
      value: probabilities[index],
      data: appendPoint(outcome.data, { time, value: probabilities[index] }),
    })),
  }
}

export function aggregateCandles(ticks: LivelinePoint[], width: number) {
  const candles: CandlePoint[] = []
  let live: CandlePoint | undefined

  for (const tick of ticks) {
    const time = Math.floor(tick.time / width) * width

    if (!live || live.time !== time) {
      if (live) candles.push(live)
      live = { time, open: tick.value, high: tick.value, low: tick.value, close: tick.value }
    } else {
      live.high = Math.max(live.high, tick.value)
      live.low = Math.min(live.low, tick.value)
      live.close = tick.value
    }
  }

  return { candles, live }
}
