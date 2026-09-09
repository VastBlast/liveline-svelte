import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mountLivelineEngine } from '../useLivelineEngine'
import { drawCandleFrame, drawFrame, drawMultiFrame } from '../draw'
import { resolveTheme } from '../theme'

vi.mock('../draw', () => ({
  drawFrame: vi.fn(),
  drawCandleFrame: vi.fn(),
  drawMultiFrame: vi.fn(),
  createShakeState: () => ({}),
  FADE_EDGE_WIDTH: 20,
}))
vi.mock('../draw/loading', () => ({ drawLoading: vi.fn() }))
vi.mock('../draw/empty', () => ({ drawEmpty: vi.fn() }))

class TestElement extends EventTarget {
  parentNode: TestElement | null = null
  textContent = ''
  style = {
    cssText: '',
    setProperty: vi.fn(),
    removeProperty: vi.fn(),
  }
  appendChild(child: TestElement) { child.parentNode = this }
  removeChild(child: TestElement) { child.parentNode = null }
  setAttribute() {}
  getBoundingClientRect() { return { left: 0, width: 640, height: 320 } }
}

type EngineConfig = Parameters<typeof mountLivelineEngine>[2]
const epoch = 1_700_000_000
let elapsed: number
let nextFrameId: number
let frames: Map<number, FrameRequestCallback>
let documentTarget: EventTarget & { hidden: boolean }
let controllers: ReturnType<typeof mountLivelineEngine>[]

function frame(ms = 16.67) {
  elapsed += ms
  const pending = [...frames.values()]
  frames.clear()
  for (const callback of pending) callback(elapsed)
}

function setup(overrides: Partial<EngineConfig> = {}) {
  const container = new TestElement()
  const valueElement = new TestElement()
  const canvas = Object.assign(new TestElement(), {
    width: 640,
    height: 320,
    getContext: () => context,
  })
  const context = {
    canvas,
    setTransform() {},
    clearRect() {},
    save() {},
    restore() {},
    fillRect() {},
    fillText() {},
    measureText: (text: string) => ({ width: text.length * 7 }),
    beginPath() {},
    arc() {},
    fill() {},
    createLinearGradient: () => ({ addColorStop() {} }),
  }
  const config: EngineConfig = {
    data: [{ time: epoch - 20, value: -12 }, { time: epoch, value: -10 }],
    value: -10,
    palette: resolveTheme('#3b82f6', 'light'),
    windowSecs: 60,
    lerpSpeed: 0.08,
    showGrid: false,
    showBadge: false,
    showMomentum: false,
    showFill: false,
    formatValue: String,
    formatTime: String,
    padding: { top: 20, right: 40, bottom: 20, left: 10 },
    showPulse: false,
    scrub: true,
    exaggerate: false,
    badgeTail: true,
    badgeVariant: 'default',
    valueMomentumColor: false,
    valueDisplayElement: valueElement as unknown as HTMLSpanElement,
    mode: 'line',
    ...overrides,
  }
  const controller = mountLivelineEngine(
    canvas as unknown as HTMLCanvasElement,
    container as unknown as HTMLDivElement,
    config,
  )
  controllers.push(controller)
  return { config, controller, container, valueElement }
}

function move(container: TestElement, x: number, pointer: Partial<PointerEvent> = {}) {
  container.dispatchEvent(Object.assign(new Event('pointermove'), { clientX: x, isPrimary: true, pointerType: 'mouse', ...pointer }))
}

/** Dispatches a one-finger touch event and reports whether the chart cancelled it. */
function touch(container: TestElement, type: string, point: [x: number, y: number], cancelable = true) {
  const event = Object.assign(new Event(type, { cancelable }), {
    touches: type === 'touchend' ? [] : [{ clientX: point[0], clientY: point[1] }],
  })
  container.dispatchEvent(event)
  return event.defaultPrevented
}

beforeEach(() => {
  vi.clearAllMocks()
  elapsed = 100
  nextFrameId = 0
  frames = new Map()
  controllers = []
  documentTarget = Object.assign(new EventTarget(), {
    hidden: false,
    createElement: () => new TestElement(),
    createElementNS: () => new TestElement(),
  })
  vi.stubGlobal('document', documentTarget)
  vi.stubGlobal('window', {
    devicePixelRatio: 1,
    matchMedia: () => Object.assign(new EventTarget(), { matches: false }),
  })
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    disconnect() {}
  })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++nextFrameId, callback)
    return nextFrameId
  })
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
  vi.spyOn(performance, 'now').mockImplementation(() => elapsed)
  vi.spyOn(Date, 'now').mockImplementation(() => epoch * 1000 + elapsed)
})

afterEach(() => {
  for (const controller of controllers) controller.destroy()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('engine interactions', () => {
  it('ends an active hover when scrubbing is disabled', () => {
    const onHover = vi.fn()
    const { config, controller, container } = setup({ onHover })
    move(container, 400)
    frame()
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ x: 400 }))

    controller.update({ ...config, scrub: false })
    expect(onHover).toHaveBeenLastCalledWith(null)
    onHover.mockClear()
    for (let i = 0; i < 60; i++) frame()
    expect(onHover).not.toHaveBeenCalled()
    expect(vi.mocked(drawFrame).mock.lastCall?.[3].scrubAmount).toBe(0)
  })

  it('locks a sideways touch to scrubbing even when the finger wobbles', () => {
    const onHover = vi.fn()
    const { container } = setup({ onHover })
    touch(container, 'touchstart', [200, 100])
    frame()
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ x: 200 }))

    expect(touch(container, 'touchmove', [210, 103])).toBe(true)
    expect(touch(container, 'touchmove', [230, 160])).toBe(true)
    frame()
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ x: 230 }))

    touch(container, 'touchend', [230, 160])
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('hands a vertical touch to the page', () => {
    const onHover = vi.fn()
    const { container } = setup({ onHover })
    touch(container, 'touchstart', [200, 100])
    expect(touch(container, 'touchmove', [202, 110])).toBe(false)
    expect(onHover).toHaveBeenLastCalledWith(null)
    onHover.mockClear()

    expect(touch(container, 'touchmove', [260, 110])).toBe(false)
    frame()
    expect(onHover).not.toHaveBeenCalled()
  })

  it('leaves a touch the browser already scrolls alone', () => {
    const onHover = vi.fn()
    const { container } = setup({ onHover })
    touch(container, 'touchstart', [200, 100])
    expect(touch(container, 'touchmove', [240, 100], false)).toBe(false)
    expect(onHover).toHaveBeenLastCalledWith(null)
  })

  it('follows only a primary mouse or pen pointer', () => {
    const onHover = vi.fn()
    const { container } = setup({ onHover })
    move(container, 300, { isPrimary: false })
    move(container, 300, { pointerType: 'touch' })
    frame()
    expect(onHover).not.toHaveBeenCalled()
  })

  it('gives each series its own particle emitter judged on its own swing', () => {
    const flat = Array.from({ length: 8 }, (_, i) => ({ time: epoch - 8 + i, value: 10 }))
    const spike = [...flat.slice(0, 6), { time: epoch - 2, value: 10 }, { time: epoch - 1, value: 40 }]
    const palette = resolveTheme('#3b82f6', 'light')
    setup({
      isMultiSeries: true,
      degenOptions: {},
      multiSeries: [
        { id: 'calm', data: flat, value: 10, palette },
        { id: 'jumpy', data: spike, value: 40, palette },
      ],
    })
    frame()
    const opts = vi.mocked(drawMultiFrame).mock.lastCall![2]
    expect([...opts.particleStates!.keys()]).toEqual(['calm', 'jumpy'])
    const [calm, jumpy] = opts.series
    expect(calm.swingMagnitude).toBe(0)
    expect(jumpy.swingMagnitude).toBeGreaterThan(0.5)
    expect(jumpy.momentum).toBe('up')
    expect(opts.shakeState).toBeDefined()
  })

  it('reports the hovered candle close through onHover', () => {
    const onHover = vi.fn()
    const candles = [
      { time: epoch - 20, open: 10, high: 13, low: 9, close: 12 },
      { time: epoch - 10, open: 12, high: 15, low: 11, close: 14 },
    ]
    const { container } = setup({ mode: 'candle', candles, candleWidth: 10, onHover })
    frame()
    const layout = vi.mocked(drawCandleFrame).mock.lastCall![1]
    const x = layout.toX(epoch - 5)
    move(container, x)
    frame()
    expect(onHover).toHaveBeenLastCalledWith(expect.objectContaining({ value: 14, x }))
  })

  it('preserves negative values when momentum coloring is enabled', () => {
    const formatValue = vi.fn(String)
    const { valueElement } = setup({ valueMomentumColor: true, formatValue })
    frame()
    expect(formatValue).toHaveBeenLastCalledWith(-10)
    expect(valueElement.textContent).toBe('-10')
  })

  it('clears the momentum color when the option is disabled', () => {
    const { config, controller, valueElement } = setup({
      valueMomentumColor: true,
      momentumOverride: 'up',
    })
    frame()
    expect(valueElement.style.setProperty).toHaveBeenCalledWith('--liveline-momentum-color', '#22c55e')
    controller.update({ ...config, valueMomentumColor: false })
    frame()
    expect(valueElement.style.removeProperty).toHaveBeenCalledWith('--liveline-momentum-color')
  })
})

describe('paused data', () => {
  it('keeps paused line points independent of consumer mutations', () => {
    const { config } = setup({ paused: true })
    frame()
    config.data[0].value = 500
    frame()
    expect(vi.mocked(drawFrame).mock.lastCall?.[3].visible[0].value).toBe(-12)
  })

  it('keeps paused series points independent of consumer mutations', () => {
    const { config, controller } = setup({ paused: true })
    const series = { id: 'one', data: config.data, value: -10, palette: config.palette }
    controller.update({
      ...config,
      isMultiSeries: true,
      multiSeries: [series],
    })
    frame()
    config.data[0].value = 500
    series.value = -9.999
    frame()
    const drawn = vi.mocked(drawMultiFrame).mock.lastCall![2].series[0]
    expect(drawn.visible[0].value).toBe(-12)
    expect(drawn.smoothValue).toBe(-10)
    config.data.length = 0
    frame()
    expect(vi.mocked(drawMultiFrame).mock.lastCall![2].series[0].visible).toHaveLength(2)
  })

  it('keeps paused candles independent of consumer mutations', () => {
    const candles = [
      { time: epoch - 20, open: 10, high: 13, low: 9, close: 12 },
      { time: epoch - 10, open: 12, high: 15, low: 11, close: 14 },
    ]
    const liveCandle = { time: epoch, open: 14, high: 16, low: 13, close: 15 }
    setup({ mode: 'candle', candles, liveCandle, candleWidth: 10, paused: true })
    frame()
    candles[0].close = 500
    liveCandle.close = 500
    frame()
    expect(vi.mocked(drawCandleFrame).mock.lastCall?.[3].candles[0].close).toBe(12)
    expect(vi.mocked(drawCandleFrame).mock.lastCall?.[3].closePriceCandle?.close).toBe(15)
  })

  it('holds the paused time window across slow frames and hidden tabs', () => {
    setup({ paused: true })
    for (let i = 0; i < 100; i++) frame()
    const leftEdge = vi.mocked(drawFrame).mock.lastCall![1].leftEdge
    frame(5000)
    expect(vi.mocked(drawFrame).mock.lastCall![1].leftEdge).toBeCloseTo(leftEdge, 5)

    documentTarget.hidden = true
    frame()
    elapsed += 30_000
    documentTarget.hidden = false
    documentTarget.dispatchEvent(new Event('visibilitychange'))
    frame()
    expect(vi.mocked(drawFrame).mock.lastCall![1].leftEdge).toBeCloseTo(leftEdge, 5)
  })
})
