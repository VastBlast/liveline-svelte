# liveline-svelte

`liveline-svelte` is an independently developed chart library for Svelte 5.

It began as a Svelte fork of [Liveline](https://github.com/benjitaylor/liveline) by Benji Taylor and now follows its own direction. APIs, features, and behavior evolve around Svelte and its use cases; maintaining 1:1 parity or compatibility with the original project is not a direct goal. Use this repository's documentation and releases when integrating the library.

Real-time animated charts for Svelte. Line, multi-series, and candlestick modes, canvas-rendered, 60fps, no CSS imports.

## Install

```bash
pnpm add liveline-svelte
```

```
yarn add liveline-svelte
```

```bash
npm install liveline-svelte
```

Peer dependency: `svelte ^5`.

## Quick Start

```svelte
<script lang="ts">
  import { Liveline } from 'liveline-svelte'
  import type { LivelinePoint } from 'liveline-svelte'

  let data = $state.raw<LivelinePoint[]>([])
  let value = $state(0)
</script>

<div style="height: 320px;">
  <Liveline data={data} {value} color="#3b82f6" theme="dark" />
</div>
```

The component fills its parent container. Set a height on the parent, then pass a growing `data` array and the latest `value`. Liveline handles the interpolation and drawing loop internally. Points and candles should be ordered by ascending `time` (Unix seconds).

The examples use `$state.raw` for arrays that are replaced on updates, such as `data = [...data, point]`, avoiding deep proxy overhead for historical data. Use `$state` instead if you prefer to mutate arrays or individual points in place.

## Props

Any standard `div` attributes such as `class`, `style`, `id`, `data-*`, or `aria-*` are forwarded to the root container.

### Data

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `LivelinePoint[]` | required | Array of `{ time, value }` points |
| `value` | `number` | required | Latest value |

### Appearance

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `theme` | `'light' \| 'dark'` | `'dark'` | Color scheme |
| `color` | `string` | `'#3b82f6'` | Accent color used to derive the palette |
| `grid` | `boolean` | `true` | Y-axis grid lines and labels |
| `badge` | `boolean` | `true` | Value pill tracking the chart tip |
| `badgeVariant` | `'default' \| 'minimal'` | `'default'` | Accent badge or neutral badge |
| `badgeTail` | `boolean` | `true` | Pointed tail on the badge pill |
| `fill` | `boolean` | `true` | Gradient under the curve |
| `pulse` | `boolean` | `true` | Pulsing ring on the live dot |
| `lineWidth` | `number` | `2` | Main line width in pixels |

### Features

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `momentum` | `boolean \| Momentum` | `true` | Dot glow and arrows. `true` auto-detects, or pass `'up' \| 'down' \| 'flat'` |
| `scrub` | `boolean` | `true` | Crosshair scrubbing on hover. On touch, a drag that starts sideways scrubs and stays locked to the chart; one that starts up or down scrolls the page |
| `exaggerate` | `boolean` | `false` | Tight Y-axis range so smaller moves fill more height |
| `showValue` | `boolean` | `false` | Large live value overlay |
| `valueMomentumColor` | `boolean` | `false` | Colors the value overlay by momentum |
| `degen` | `boolean \| DegenOptions` | `false` | Particle bursts and shake on strong swings |

### Candlestick

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `'line' \| 'candle'` | `'line'` | Chart type |
| `candles` | `CandlePoint[]` | — | Committed OHLC candles |
| `candleWidth` | `number` | — | Seconds per candle |
| `liveCandle` | `CandlePoint` | — | Current in-progress candle |
| `lineMode` | `boolean` | `false` | Morph candles toward a line view |
| `lineData` | `LivelinePoint[]` | — | Tick-level data for density blending in line mode |
| `lineValue` | `number` | — | Current tick value for line mode |
| `onModeChange` | `(mode) => void` | — | Callback for the built-in candle/line toggle |

When `mode="candle"`, pass `candles`, `liveCandle`, and `candleWidth`. If you also pass `lineMode`, `lineData`, and `lineValue`, Liveline smoothly morphs candle bodies into a denser line representation.

### Multi-series

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `series` | `LivelineSeries[]` | — | Overlapping line series `{ id, data, value, color, label? }` |
| `onSeriesToggle` | `(id, visible) => void` | — | Called when a built-in series chip is toggled |
| `showSeriesToggle` | `boolean` | `true` | Show built-in series chips; disable to manage series externally |
| `seriesToggleCompact` | `boolean` | `false` | Dot-only series toggle chips |

When `series` is provided, Liveline disables single-series badge, fill, and momentum affordances automatically, and the right gutter shrinks to fit the grid labels.

### State

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loading` | `boolean` | `false` | Shows the breathing loading line |
| `paused` | `boolean` | `false` | Freezes scrolling while preserving visual continuity |
| `emptyText` | `string` | `'No data to display'` | Empty-state label |

### Time

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `window` | `number` | `30` | Visible time window in seconds |
| `windows` | `WindowOption[]` | — | Built-in time horizon buttons |
| `onWindowChange` | `(secs) => void` | — | Called when a horizon button is clicked |
| `windowStyle` | `'default' \| 'rounded' \| 'text'` | `'default'` | Time-button visual style |

### Crosshair

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `tooltipY` | `number` | `14` | Tooltip vertical offset |
| `tooltipOutline` | `boolean` | `true` | Stroke outline on tooltip text |

### Orderbook

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `orderbook` | `OrderbookData` | — | Bid/ask depth data `{ bids, asks }` |

### Advanced

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `referenceLine` | `ReferenceLine` | — | Horizontal reference line `{ value, label? }` |
| `formatValue` | `(v: number) => string` | `v.toFixed(2)` | Value formatter |
| `formatTime` | `(t: number) => string` | `HH:MM:SS` | Time formatter |
| `lerpSpeed` | `number` | `0.08` | Interpolation speed |
| `padding` | `Padding` | `{ top: 12, right: auto, bottom: 28, left: 12 }` | Chart padding override; `right` defaults to 80 with a badge, 54 with grid labels, else 12 |
| `onHover` | `(point \| null) => void` | — | Hover callback with `{ time, value, x, y }` |
| `cursor` | `string` | `'crosshair'` | Canvas hover cursor |

## Examples

### Basic line

```svelte
<script lang="ts">
  import { Liveline } from 'liveline-svelte'
  import type { LivelinePoint } from 'liveline-svelte'

  let data = $state.raw<LivelinePoint[]>([])
  let value = $state(0)
</script>

<div style="height: 300px;">
  <Liveline data={data} {value} color="#3b82f6" theme="dark" />
</div>
```

### Candlestick with built-in line toggle

```svelte
<script lang="ts">
  import { Liveline } from 'liveline-svelte'
  import type { CandlePoint, LivelinePoint } from 'liveline-svelte'

  let ticks = $state.raw<LivelinePoint[]>([])
  let value = $state(0)
  let candles = $state.raw<CandlePoint[]>([])
  let liveCandle = $state.raw<CandlePoint>()
  let lineMode = $state(true)
</script>

<div style="height: 360px;">
  <Liveline
    data={ticks}
    {value}
    mode="candle"
    {candles}
    candleWidth={60}
    {liveCandle}
    {lineMode}
    lineData={ticks}
    lineValue={value}
    onModeChange={(mode) => (lineMode = mode === 'line')}
    color="#f97316"
    formatValue={(amount) =>
      `$${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`
    }
  />
</div>
```

### Multi-series

```svelte
<script lang="ts">
  import { Liveline } from 'liveline-svelte'
  import type { LivelinePoint, LivelineSeries } from 'liveline-svelte'

  let alpha = $state.raw<LivelinePoint[]>([])
  let beta = $state.raw<LivelinePoint[]>([])
  let alphaValue = $state(0)
  let betaValue = $state(0)

  let series = $derived<LivelineSeries[]>([
    { id: 'alpha', label: 'Alpha', data: alpha, value: alphaValue, color: '#3b82f6' },
    { id: 'beta', label: 'Beta', data: beta, value: betaValue, color: '#f97316' }
  ])
</script>

<div style="height: 320px;">
  <Liveline data={alpha} value={alphaValue} {series} />
</div>
```

### Transitioning between chart scenes

`LivelineTransition` uses a Svelte snippet instead of React-style keyed children:

```svelte
<script lang="ts">
  import { Liveline, LivelineTransition } from 'liveline-svelte'
  import type { CandlePoint, LivelinePoint } from 'liveline-svelte'

  let active = $state<'line' | 'candle'>('line')
  let data = $state.raw<LivelinePoint[]>([])
  let value = $state(0)
  let candles = $state.raw<CandlePoint[]>([])
  let liveCandle = $state.raw<CandlePoint>()
</script>

<div style="height: 360px;">
  <LivelineTransition {active}>
    {#snippet children(key)}
      {#if key === 'line'}
        <Liveline {data} {value} color="#22c55e" />
      {:else if key === 'candle'}
        <Liveline
          {data}
          {value}
          mode="candle"
          {candles}
          candleWidth={60}
          {liveCandle}
          color="#f97316"
        />
      {/if}
    {/snippet}
  </LivelineTransition>
</div>
```

## Notes

- Liveline ships as a Svelte 5 component library and forwards standard root `div` attributes.
- The package has no runtime dependencies beyond `svelte`.
- The drawing engine stays framework-neutral and runs outside Svelte’s templating work, which keeps updates cheap even under rapid tick streams.
- The project builds on Benji Taylor's original Liveline work. Original attribution is preserved in [LICENSE](./LICENSE).

## Development

Use Node.js 24 and pnpm 12, then start the showcase:

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite (normally `http://localhost:5173/`). The root page showcases streaming line, multi-series, and candlestick charts, theme and appearance controls, and loading, empty, and paused states. Its data is simulated; no API keys or external feed are needed.

```text
src/lib/        Library components, public types, drawing engine, and unit tests
src/routes/     SvelteKit showcase page and demo helpers
src/app.html    Demo HTML template
vite.config.ts  SvelteKit, static adapter, preprocessing, and package alias
wrangler.jsonc  Cloudflare static asset configuration
dist/           Generated npm package
build/          Prerendered static showcase
```

The demo imports from `liveline-svelte`, just like a consumer. The alias in `vite.config.ts` resolves that name to `src/lib/index.ts` for Vite and TypeScript, so library edits update the demo without a separate build. `svelte-package` builds only `src/lib`; the demo is excluded from the published package.

```bash
pnpm check       # Svelte/TypeScript and lint checks
pnpm test        # Library unit tests
pnpm package     # Build the library into dist/
pnpm build:site  # Prerender the static showcase into build/
pnpm build       # Build both the showcase and the library
pnpm preview     # Preview the built showcase locally
```

### Demo deployment

Connect this repository to a Cloudflare Worker named `liveline-svelte`. Set the root directory to the repository root, use `pnpm build:site` as the build command, and keep `npx wrangler deploy` as the deploy command. The included `wrangler.jsonc` serves `build/` as [static assets](https://developers.cloudflare.com/workers/static-assets/). No Worker script, server runtime, or Wrangler dependency is needed.

For Cloudflare Pages, use the same `pnpm build:site` build command and set the build output directory to `build`. Select the **None** framework preset if needed to enter these settings manually.

Set `PNPM_VERSION=12.3.4` in Cloudflare's build environment. The `.node-version` file selects Node.js 24 for the build.
