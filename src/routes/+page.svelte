<script lang="ts">
  import { onMount } from 'svelte'
  import { Liveline, LivelineTransition, type LivelinePoint, type ThemeMode } from 'liveline-svelte'
  import { advanceMarket, aggregateCandles, seedMarket, type MarketData, type Volatility } from './data'

  type Scenario = 'live' | 'loading' | 'empty'
  const packageManagers = [
    { label: 'npm', command: 'npm install liveline-svelte' },
    { label: 'pnpm', command: 'pnpm add liveline-svelte' },
    { label: 'Yarn', command: 'yarn add liveline-svelte' },
    { label: 'Bun', command: 'bun add liveline-svelte' },
  ]
  const colors = [
    { label: 'Orange', value: '#f97316' },
    { label: 'Blue', value: '#3b82f6' },
    { label: 'Green', value: '#10b981' },
    { label: 'Violet', value: '#8b5cf6' },
    { label: 'Rose', value: '#f43f5e' },
  ]
  const icons = {
    line: 'M2 12.5C5 12.5 5 5.5 8 5.5S11 10 13 10s3-5.5 5-5.5',
    multi: 'M2 6c4 0 4 7 8 7s5-9 8-9M2 14c4 0 4-8 8-8s5 7 8 7',
    candle: 'M6 2v3m0 8v5M4 5h4v8H4zM14 2v6m0 7v3m-2-10h4v7h-4z',
    sun: 'M10 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8M10 1v1m0 16v1M1 10h1m16 0h1M3.6 3.6l.8.8m11.2 11.2.8.8M3.6 16.4l.8-.8M15.6 4.4l.8-.8',
    moon: 'M17 12.1A7.5 7.5 0 0 1 7.9 3 7.5 7.5 0 1 0 17 12.1Z',
    arrow: 'M5 15 15 5M5 5h10v10',
    play: 'm7 4 9 6-9 6Z',
    pause: 'M6 4v12M14 4v12',
    replay: 'M4 7a7 7 0 1 1-1 6M4 2v5h5',
    copy: 'M7 7h10v10H7zM13 7V3H3v10h4',
    check: 'm4 10 4 4 8-8',
    chevron: 'm6 8 4 4 4-4',
  }
  const formatPrice = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format
  const emptyData: LivelinePoint[] = []

  let theme = $state<ThemeMode>('light')
  let mode = $state<'line' | 'multi' | 'candle'>('line')
  let scenario = $state<Scenario>('loading')
  let pausedMarket = $state.raw<MarketData | null>(null)
  let volatility = $state<Volatility>('normal')
  let tickRate = $state(200)
  let windowSecs = $state(30)
  let candleWidth = $state(2)
  let lineMode = $state(false)
  let color = $state(colors[0].value)
  let market = $state.raw<MarketData>({ price: [], outcomes: [] })
  let features = $state({
    grid: true, fill: true, badge: true, momentum: true,
    pulse: true, scrub: true, exaggerate: false, degen: false,
  })
  let copied = $state<'install' | 'example' | null>(null)
  let copyError = $state('')
  let packageManager = $state(1)
  let replayTimer: number | undefined
  let copyTimer: number | undefined

  let installCommand = $derived(packageManagers[packageManager].command)
  let paused = $derived(pausedMarket !== null)
  let displayedMarket = $derived(pausedMarket ?? market)
  let value = $derived(displayedMarket.price[displayedMarket.price.length - 1]?.value ?? 0)
  let data = $derived(scenario === 'live' ? displayedMarket.price : emptyData)
  let series = $derived(scenario === 'live'
    ? displayedMarket.outcomes
    : displayedMarket.outcomes.map((outcome) => ({ ...outcome, data: emptyData })))
  let candleData = $derived(aggregateCandles(data, candleWidth))
  let status = $derived.by(() => {
    if (scenario === 'loading') return 'Loading'
    if (scenario === 'empty') return 'No data'
    return paused ? 'Paused' : 'Live'
  })

  function setScenario(next: Scenario) {
    window.clearTimeout(replayTimer)
    scenario = next
    pausedMarket = null
  }

  function selectPackageManager(next: number) {
    packageManager = next
    window.clearTimeout(copyTimer)
    copied = null
    copyError = ''
  }

  function handlePackageKeydown(event: KeyboardEvent) {
    let next = packageManager

    switch (event.key) {
      case 'ArrowLeft': next = (packageManager + packageManagers.length - 1) % packageManagers.length; break
      case 'ArrowRight': next = (packageManager + 1) % packageManagers.length; break
      case 'Home': next = 0; break
      case 'End': next = packageManagers.length - 1; break
      default: return
    }

    event.preventDefault()
    selectPackageManager(next)
    ;(event.currentTarget as HTMLDivElement).querySelector<HTMLButtonElement>(`#install-tab-${packageManagers[next].label}`)?.focus()
  }

  async function copy(text: string, source: 'install' | 'example') {
    window.clearTimeout(copyTimer)
    copied = null
    copyError = ''

    try {
      await navigator.clipboard.writeText(text)
      if (source === 'install' && text !== installCommand) return
      copied = source
      copyTimer = window.setTimeout(() => { copied = null }, 2000)
    } catch {
      if (source === 'install' && text !== installCommand) return
      copyError = 'Select the code to copy it from this browser.'
    }
  }

  onMount(() => {
    let timer: number
    market = seedMarket(volatility)
    replayTimer = window.setTimeout(() => { scenario = 'live' }, 650)

    function advance() {
      if (!document.hidden) market = advanceMarket(market, volatility)
      timer = window.setTimeout(advance, tickRate)
    }

    timer = window.setTimeout(advance, tickRate)

    return () => {
      window.clearTimeout(timer)
      window.clearTimeout(replayTimer)
      window.clearTimeout(copyTimer)
    }
  })

  const example = `<script lang="ts">
  import { onMount } from 'svelte'
  import { Liveline, type LivelinePoint } from 'liveline-svelte'

  let data = $state.raw<LivelinePoint[]>([])
  let value = $state(100)

  onMount(() => {
    // Replace this timer with your WebSocket or polling feed.
    const timer = setInterval(() => {
      value += (Math.random() - 0.5) * 0.8
      data = [...data, { time: Date.now() / 1000, value }].slice(-1200)
    }, 200)

    return () => clearInterval(timer)
  })
\x3C/script>

<div style="height: 300px">
  <Liveline {data} {value} color="#f97316" theme="light" />
</div>`
</script>

<svelte:head>
  <title>Liveline for Svelte</title>
  <meta name="theme-color" content={theme === 'light' ? '#ffffff' : '#111111'} />
</svelte:head>

{#snippet icon(name: keyof typeof icons)}
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d={icons[name]} />
  </svg>
{/snippet}

<div class="page" id="top" data-theme={theme} style:color-scheme={theme}>
  <div class="layout">
    <header class="site-header">
      <a class="wordmark" href="#top" aria-label="Liveline for Svelte home">
        <span class="brand-mark">{@render icon('line')}</span>
        Liveline <span class="svelte-tag">Svelte</span>
      </a>
      <nav class="header-links" aria-label="Project">
        <a class="docs-link" href="https://github.com/VastBlast/liveline-svelte#readme">Docs</a>
        <a href="https://github.com/VastBlast/liveline-svelte">GitHub {@render icon('arrow')}</a>
        <span class="nav-divider"></span>
        <button
          class="icon-button"
          type="button"
          aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
          onclick={() => { theme = theme === 'light' ? 'dark' : 'light' }}
        >
          {@render icon(theme === 'light' ? 'moon' : 'sun')}
        </button>
      </nav>
    </header>

    <main>
      <section class="intro" aria-labelledby="intro-title">
        <p class="eyebrow">Real-time charts for Svelte 5</p>
        <h1 id="intro-title">Bring your data to life.</h1>
        <p class="intro-description">Smooth lines, live candles, and every point in between.<br class="desktop-break" /> A small chart component for things that keep moving.</p>
        <div class="install-widget">
          <div class="install-tabs" role="tablist" tabindex="-1" aria-label="Package manager" onkeydown={handlePackageKeydown}>
            {#each packageManagers as manager, index (manager.label)}
              <button
                type="button"
                role="tab"
                id={`install-tab-${manager.label}`}
                class={['install-tab', { selected: packageManager === index }]}
                aria-selected={packageManager === index}
                aria-controls="install-command"
                tabindex={packageManager === index ? 0 : -1}
                onclick={() => selectPackageManager(index)}
              >{manager.label}</button>
            {/each}
          </div>
          <div class="install-command" id="install-command" role="tabpanel" aria-labelledby={`install-tab-${packageManagers[packageManager].label}`}>
            <span class="prompt" aria-hidden="true">$</span>
            <code>{installCommand}</code>
            <button
              type="button"
              class="icon-button"
              aria-label={copied === 'install' ? 'Install command copied' : 'Copy install command'}
              onclick={() => copy(installCommand, 'install')}
            >
              {@render icon(copied === 'install' ? 'check' : 'copy')}
            </button>
          </div>
        </div>
      </section>

      <section class="playground" aria-label="Interactive chart showcase">
        <div class="mode-bar">
          <div class="mode-options" role="group" aria-label="Chart type">
            {#each ([
              { id: 'line', label: 'Line chart' },
              { id: 'multi', label: 'Multi-series' },
              { id: 'candle', label: 'Candlestick' },
            ] as const) as option (option.id)}
              <button type="button" class={['mode-button', { selected: mode === option.id }]} aria-pressed={mode === option.id} onclick={() => {
                if (mode === option.id) return
                pausedMarket = null
                mode = option.id
              }}>
                {@render icon(option.id)}
                {option.label}
              </button>
            {/each}
          </div>
          <span class="demo-label">Interactive demo</span>
        </div>

        <div class="chart-content">
          <div class="chart-heading">
            <div>
              <p class="chart-label">{mode === 'multi' ? 'Market outlook' : 'Liveline index'}</p>
              <h2 class="chart-value">{mode === 'multi' ? 'Three possibilities.' : scenario === 'live' ? formatPrice(value) : '—'}</h2>
              <p class="chart-subtitle">{mode === 'multi' ? 'Simulated outcomes · probability' : 'Simulated price · USD'}</p>
            </div>
            <div class="live-controls">
              <span class={['status', { streaming: scenario === 'live' && !paused }]} role="status">
                <span class="status-dot"></span>{status}
              </span>
              <button class="icon-button pause-button" type="button" disabled={scenario !== 'live'} aria-label={paused ? 'Resume chart' : 'Pause chart'} aria-pressed={paused} onclick={() => { pausedMarket = paused ? null : market }}>
                {@render icon(paused ? 'play' : 'pause')}
              </button>
            </div>
          </div>

          <div class="chart-stage">
            <LivelineTransition active={mode}>
              {#snippet children(key)}
                <div class="chart-scene">
                  <Liveline
                    {data}
                    {value}
                    {theme}
                    {color}
                    {paused}
                    {...features}
                    window={windowSecs}
                    loading={scenario === 'loading'}
                    badgeVariant="minimal"
                    emptyText="Your next data point starts here"
                    padding={{ top: 20, bottom: 28, left: 12 }}
                    mode={key === 'candle' ? 'candle' : 'line'}
                    series={key === 'multi' ? series : undefined}
                    candles={key === 'candle' ? candleData.candles : undefined}
                    liveCandle={key === 'candle' ? candleData.live : undefined}
                    candleWidth={key === 'candle' ? candleWidth : undefined}
                    lineMode={key === 'candle' && lineMode}
                    lineData={key === 'candle' ? data : undefined}
                    lineValue={key === 'candle' ? value : undefined}
                    formatValue={key === 'multi' ? (amount) => `${amount.toFixed(1)}%` : formatPrice}
                    windowStyle="text"
                    role="img"
                    aria-label={key === 'multi' ? 'Live probabilities for up, flat, and down outcomes' : `Live ${key === 'candle' && !lineMode ? 'candlestick' : 'line'} chart of a simulated price in US dollars`}
                  />
                </div>
              {/snippet}
            </LivelineTransition>
          </div>

          <div class="chart-toolbar">
            <div class="horizon-options" role="group" aria-label="Time horizon">
              {#each [
                { label: '15s', secs: 15 },
                { label: '30s', secs: 30 },
                { label: '1m', secs: 60 },
                { label: '5m', secs: 300 },
              ] as horizon (horizon.secs)}
                <button type="button" class={['small-button', { selected: windowSecs === horizon.secs }]} aria-pressed={windowSecs === horizon.secs} onclick={() => { windowSecs = horizon.secs }}>
                  {horizon.label}
                </button>
              {/each}
            </div>
            {#if mode === 'candle'}
              <div class="morph-options" role="group" aria-label="Candlestick display">
                <button type="button" class={['small-button', { selected: !lineMode }]} aria-pressed={!lineMode} onclick={() => { lineMode = false }}>
                  {@render icon('candle')} Candles
                </button>
                <button type="button" class={['small-button', { selected: lineMode }]} aria-pressed={lineMode} onclick={() => { lineMode = true }}>
                  {@render icon('line')} Line
                </button>
              </div>
            {:else}
              <span class="chart-hint">{mode === 'multi' ? 'Tap a label to toggle a series' : features.scrub ? 'Hover or touch to explore' : 'Follow the live feed'}</span>
            {/if}
          </div>
        </div>

        <div class="scenario-bar">
          <div class="scenario-options" role="group" aria-label="Data state">
            <span class="control-caption">State</span>
            {#each ['live', 'loading', 'empty'] as state (state)}
              <button type="button" class={['text-button', { selected: scenario === state }]} aria-pressed={scenario === state} onclick={() => setScenario(state as Scenario)}>
                {state === 'live' ? 'Live' : state === 'loading' ? 'Loading' : 'Empty'}
              </button>
            {/each}
          </div>
          <button class="text-button replay-button" type="button" onclick={() => {
            setScenario('loading')
            replayTimer = window.setTimeout(() => { scenario = 'live' }, 1500)
          }}>
            {@render icon('replay')} Replay loading
          </button>
        </div>
      </section>

      <section class="customize" aria-label="Chart controls">
        <div class="control-row">
          <label class="select-control">
            <span class="control-caption">Volatility</span>
            <select bind:value={volatility}>
              <option value="calm">Calm</option>
              <option value="normal">Normal</option>
              <option value="wild">Wild</option>
            </select>
          </label>
          <label class="select-control">
            <span class="control-caption">Update interval</span>
            <select bind:value={tickRate}>
              <option value={80}>80 ms</option>
              <option value={200}>200 ms</option>
              <option value={500}>500 ms</option>
              <option value={1000}>1 second</option>
            </select>
          </label>
          {#if mode === 'candle'}
            <label class="select-control">
              <span class="control-caption">Candle interval</span>
              <select bind:value={candleWidth}>
                <option value={1}>1 second</option>
                <option value={2}>2 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
              </select>
            </label>
          {:else}
            <p class="feed-note">A continuous feed.<br /><span>New data, every {tickRate < 1000 ? `${tickRate} ms` : 'second'}.</span></p>
          {/if}
          <fieldset class="color-control" disabled={mode === 'multi'}>
            <legend class="control-caption">Line color</legend>
            <div class="color-options">
              {#each colors as option (option.value)}
                <button
                  type="button"
                  class={['color-button', { selected: color === option.value }]}
                  style:--swatch={option.value}
                  aria-label={`${option.label} line`}
                  aria-pressed={color === option.value}
                  onclick={() => { color = option.value }}
                ><span></span></button>
              {/each}
            </div>
          </fieldset>
        </div>

        <details class="appearance">
          <summary>Appearance & interaction {@render icon('chevron')}</summary>
          <div class="feature-options">
            {#each ([
              { key: 'grid', label: 'Grid' },
              { key: 'fill', label: 'Area fill' },
              { key: 'badge', label: 'Value badge' },
              { key: 'momentum', label: 'Momentum' },
              { key: 'pulse', label: 'Live pulse' },
              { key: 'scrub', label: 'Crosshair' },
              { key: 'exaggerate', label: 'Tight scale' },
              { key: 'degen', label: 'Particles' },
            ] as const) as option (option.key)}
              {@const unavailable = mode === 'multi' && ['fill', 'badge', 'momentum', 'degen'].includes(option.key)}
              <label class={['feature-control', { unavailable }]}>
                <input type="checkbox" bind:checked={features[option.key]} disabled={unavailable} />
                <span>{option.label}</span>
              </label>
            {/each}
          </div>
          {#if mode === 'multi'}<p class="control-note">Multi-series charts use individual colors and a shared scale.</p>{/if}
        </details>
      </section>

      <section class="getting-started" aria-labelledby="usage-title">
        <div class="usage-intro">
          <p class="eyebrow">A few lines to get moving</p>
          <h2 id="usage-title">Your data. A live chart.</h2>
          <p>Give the chart a height, an array of points, and the latest value. Liveline takes care of the motion.</p>
          <p>Use Svelte’s <code>$state</code> to keep the feed reactive, then connect your own data source.</p>
          <a class="inline-link" href="https://github.com/VastBlast/liveline-svelte#props">Explore the API {@render icon('arrow')}</a>
          <div class="package-notes">
            <span>Svelte 5</span><span>Canvas rendered</span><span>No CSS imports</span>
          </div>
        </div>
        <div class="code-block">
          <div class="code-heading">
            <span><span class="file-dot"></span>Chart.svelte</span>
            <button class="icon-button" type="button" aria-label={copied === 'example' ? 'Example copied' : 'Copy Svelte example'} onclick={() => copy(example, 'example')}>
              {@render icon(copied === 'example' ? 'check' : 'copy')}
            </button>
          </div>
          <!-- The overflowing code region must be focusable for keyboard scrolling. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <pre tabindex="0" role="region" aria-label="Svelte usage example"><code>{example}</code></pre>
        </div>
      </section>
      <p class="copy-status" role="status">{copyError || (copied ? 'Copied to clipboard.' : '')}</p>
    </main>

    <footer>
      <span>Liveline for Svelte</span>
      <div><span>MIT licensed</span><a href="https://github.com/VastBlast/liveline-svelte">View source {@render icon('arrow')}</a></div>
    </footer>
  </div>
</div>

<style>
  :global(*) { box-sizing: border-box; }
  :global(body) { margin: 0; }
  :global(button), :global(select), :global(input) { font: inherit; }
  :global(button), :global(a), :global(select), :global(input), :global(summary), :global(pre) { -webkit-tap-highlight-color: transparent; }

  .page {
    --background: #fff;
    --foreground: #242424;
    --secondary: #737373;
    --muted: #8b8b8b;
    --border: #eaeaea;
    --soft: #f7f7f7;
    --hover: #efefef;
    --accent: #ea580c;
    --live: #15965c;
    min-height: 100vh;
    background: var(--background);
    color: var(--foreground);
    font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }

  .page[data-theme='dark'] {
    --background: #111;
    --foreground: #ededed;
    --secondary: #a1a1a1;
    --muted: #818181;
    --border: #2a2a2a;
    --soft: #191919;
    --hover: #252525;
    --accent: #fb923c;
    --live: #4ade80;
  }

  .layout { max-width: 1080px; margin: 0 auto; padding: 0 40px; }
  a { color: inherit; text-decoration: none; }
  button { color: inherit; background: transparent; border: 0; cursor: pointer; }
  button:disabled { cursor: default; opacity: 0.4; }
  a:hover { color: var(--foreground); }
  button, a, select, summary { transition: color 150ms, background 150ms, border-color 150ms; }
  :global(:focus-visible) { outline: 2px solid var(--accent, #ea580c); outline-offset: 4px; }

  .site-header { height: 96px; display: flex; align-items: center; justify-content: space-between; }
  .wordmark { display: inline-flex; align-items: center; gap: 9px; font-size: 19px; font-weight: 650; letter-spacing: -0.5px; }
  .brand-mark { display: flex; color: var(--accent); }
  .brand-mark :global(svg) { height: 25px; width: 25px; stroke-width: 1.8px; }
  .svelte-tag { margin-left: 2px; padding: 2px 7px; border: 1px solid var(--border); border-radius: 5px; color: var(--secondary); font-size: 11px; font-weight: 500; letter-spacing: 0; }
  .header-links { display: flex; align-items: center; gap: 24px; color: var(--secondary); font-size: 13px; }
  .header-links a, footer a, .inline-link { display: inline-flex; align-items: center; gap: 5px; }
  .header-links a :global(svg), footer :global(svg) { width: 14px; height: 14px; }
  .nav-divider { width: 1px; height: 17px; background: var(--border); margin-left: -3px; margin-right: -12px; }
  .icon-button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 6px; color: var(--secondary); }
  .icon-button:hover:not(:disabled) { background: var(--hover); color: var(--foreground); }

  .intro { padding: 47px 0 42px; }
  .eyebrow { margin: 0 0 14px; color: var(--accent); font-size: 11px; font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; }
  h1 { margin: 0; font-size: clamp(34px, 5.2vw, 48px); font-weight: 550; letter-spacing: -2px; line-height: 1.15; }
  .intro-description { color: var(--secondary); font-size: 16px; line-height: 1.65; margin: 18px 0 24px; }
  .install-widget { display: inline-flex; flex-direction: column; width: 310px; max-width: 100%; border: 1px solid var(--border); border-radius: 7px; background: var(--soft); }
  .install-tabs { display: flex; padding: 0 11px; border-bottom: 1px solid var(--border); }
  .install-tab { position: relative; flex: 1; padding: 8px 4px; font-size: 11px; color: var(--secondary); }
  .install-tab:hover, .install-tab.selected { color: var(--foreground); }
  .install-tab.selected::after { position: absolute; content: ''; bottom: -1px; left: 13px; right: 13px; height: 2px; background: var(--accent); }
  .install-command { display: flex; gap: 10px; align-items: center; padding: 7px 7px 7px 14px; }
  code, pre { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; }
  .install-command code { font-size: 12px; white-space: nowrap; }
  .prompt { font-family: monospace; color: var(--muted); }
  .install-command .icon-button { margin-left: auto; flex-shrink: 0; height: 27px; width: 27px; }
  .install-command :global(svg) { width: 15px; height: 15px; }

  .playground { border: 1px solid var(--border); border-radius: 12px; }
  .mode-bar { display: flex; align-items: center; justify-content: space-between; padding: 0 24px; border-bottom: 1px solid var(--border); }
  .mode-options { display: flex; align-items: stretch; gap: 26px; }
  .mode-button { position: relative; display: flex; align-items: center; gap: 7px; padding: 18px 0; font-size: 12px; color: var(--secondary); white-space: nowrap; }
  .mode-button:hover, .mode-button.selected { color: var(--foreground); }
  .mode-button.selected::after { position: absolute; content: ''; height: 2px; bottom: -1px; left: 0; right: 0; background: var(--accent); }
  .mode-button :global(svg) { width: 16px; height: 16px; }
  .demo-label { color: var(--muted); font-size: 11px; }
  .chart-content { padding: 28px 24px 16px; }
  .chart-heading { display: flex; justify-content: space-between; align-items: flex-start; padding: 0 12px; }
  .chart-label { margin: 0 0 4px; font-size: 12px; color: var(--secondary); }
  .chart-value { margin: 0; min-height: 41px; font-size: 30px; font-weight: 500; font-variant-numeric: tabular-nums; letter-spacing: -1px; line-height: 1.35; }
  .chart-subtitle { margin: 3px 0 0; font-size: 11px; color: var(--muted); }
  .live-controls { display: flex; gap: 14px; align-items: center; margin-top: 5px; }
  .status { display: inline-flex; align-items: center; gap: 6px; color: var(--secondary); font-size: 11px; }
  .status-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
  .status.streaming { color: var(--live); }
  .pause-button { border: 1px solid var(--border); width: 29px; height: 29px; }
  .pause-button :global(svg) { width: 14px; height: 14px; }
  .chart-stage { height: 275px; margin-top: 18px; }
  .chart-scene { display: flex; flex-direction: column; height: 100%; }
  .chart-scene :global(.liveline-root) { flex: 1; min-height: 0; height: auto; }
  .chart-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 10px 12px 0; }
  .horizon-options, .morph-options { display: flex; gap: 3px; }
  .small-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 30px; padding: 5px 11px; font-size: 11px; border-radius: 5px; color: var(--secondary); }
  .small-button:hover { color: var(--foreground); background: var(--soft); }
  .small-button.selected { color: var(--foreground); background: var(--hover); }
  .small-button :global(svg) { width: 13px; height: 13px; }
  .chart-hint { color: var(--muted); font-size: 10px; }
  .scenario-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 28px; gap: 10px; background: var(--soft); border-top: 1px solid var(--border); border-radius: 0 0 11px 11px; }
  .scenario-options { display: flex; align-items: center; gap: 6px; }
  .control-caption { font-size: 11px; color: var(--secondary); }
  .scenario-options .control-caption { margin-right: 10px; }
  .text-button { display: inline-flex; align-items: center; gap: 6px; padding: 5px 9px; border-radius: 5px; font-size: 11px; color: var(--secondary); }
  .text-button:hover { background: var(--hover); color: var(--foreground); }
  .text-button.selected { color: var(--foreground); background: var(--background); box-shadow: 0 0 0 1px var(--border); }
  .replay-button :global(svg) { width: 13px; height: 13px; }

  .customize { padding: 25px 4px 0; }
  .control-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; align-items: end; gap: 30px; }
  .select-control { display: flex; flex-direction: column; gap: 9px; }
  select { width: 100%; height: 35px; padding: 0 9px; border: 1px solid var(--border); border-radius: 6px; background: var(--background); color: var(--foreground); font-size: 12px; cursor: pointer; }
  select:hover { border-color: var(--secondary); }
  .feed-note { margin: 0 0 4px; font-size: 11px; color: var(--foreground); line-height: 1.8; }
  .feed-note span { color: var(--muted); }
  .color-control { border: 0; margin: 0; padding: 0; }
  .color-control legend { padding: 0; margin-bottom: 7px; }
  .color-control:disabled { opacity: 0.4; }
  .color-options { display: flex; gap: 6px; align-items: center; height: 35px; }
  .color-button { display: grid; place-items: center; height: 25px; width: 25px; padding: 4px; border: 1px solid transparent; border-radius: 50%; }
  .color-button span { width: 15px; height: 15px; background: var(--swatch); border-radius: 50%; }
  .color-button.selected { border-color: var(--swatch); }
  .appearance { margin-top: 20px; font-size: 11px; }
  .appearance summary { display: flex; justify-content: space-between; align-items: center; list-style: none; padding: 10px 0; color: var(--secondary); cursor: pointer; width: fit-content; gap: 10px; }
  .appearance summary::-webkit-details-marker { display: none; }
  .appearance summary :global(svg) { width: 13px; height: 13px; transition: transform 150ms; }
  .appearance[open] summary :global(svg) { transform: rotate(180deg); }
  .appearance summary:hover { color: var(--foreground); }
  .feature-options { display: flex; flex-wrap: wrap; gap: 14px 22px; margin: 10px 0; }
  .feature-control { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; }
  .feature-control input { margin: 0; height: 13px; width: 13px; accent-color: var(--accent); }
  .feature-control.unavailable { opacity: 0.4; cursor: default; }
  .control-note { color: var(--secondary); font-size: 11px; margin: 12px 0 0; }

  .getting-started { display: grid; grid-template-columns: 0.8fr 1.4fr; gap: 50px; padding-top: 55px; margin-top: 44px; border-top: 1px solid var(--border); }
  .usage-intro { padding-top: 4px; }
  .usage-intro .eyebrow { margin-bottom: 12px; font-size: 10px; }
  .usage-intro h2 { margin: 0 0 16px; font-size: 25px; font-weight: 500; letter-spacing: -0.7px; }
  .usage-intro p:not(.eyebrow) { color: var(--secondary); font-size: 13px; line-height: 1.8; margin: 0 0 14px; }
  .usage-intro code { color: var(--foreground); font-size: 12px; }
  .inline-link { margin-top: 5px; font-size: 12px; }
  .inline-link:hover { color: var(--accent); }
  .inline-link :global(svg) { width: 14px; height: 14px; }
  .package-notes { display: flex; flex-direction: column; gap: 9px; margin-top: 32px; font-size: 11px; color: var(--secondary); }
  .package-notes span::before { display: inline-block; width: 4px; height: 4px; content: ''; margin: 0 8px 2px 0; background: var(--muted); border-radius: 50%; }
  .code-block { min-width: 0; border: 1px solid var(--border); border-radius: 8px; background: var(--soft); overflow: hidden; }
  .code-heading { display: flex; align-items: center; justify-content: space-between; padding: 7px 13px 7px 18px; border-bottom: 1px solid var(--border); color: var(--secondary); font-family: monospace; font-size: 11px; }
  .code-heading > span { display: inline-flex; align-items: center; gap: 7px; }
  .file-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--accent); }
  .code-heading .icon-button { height: 25px; width: 25px; }
  .code-heading :global(svg) { height: 14px; width: 14px; }
  pre { margin: 0; padding: 18px; overflow-x: auto; color: var(--secondary); font-size: 10px; line-height: 1.9; tab-size: 2; }
  .copy-status { min-height: 18px; text-align: right; color: var(--secondary); font-size: 11px; }
  footer { display: flex; align-items: center; justify-content: space-between; margin-top: 48px; padding: 24px 0 32px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
  footer > div { display: flex; gap: 24px; align-items: center; }

  @media (max-width: 760px) {
    .layout { padding: 0 24px; }
    .site-header { height: 80px; }
    .intro { padding: 35px 0; }
    .mode-bar { padding: 0 18px; }
    .mode-options { gap: 20px; }
    .demo-label { display: none; }
    .chart-content { padding: 24px 12px 14px; }
    .chart-stage { height: 260px; }
    .scenario-bar { padding: 12px 18px; }
    .control-row { gap: 18px; grid-template-columns: 1fr 1fr; }
    .feed-note { order: 4; }
    .getting-started { grid-template-columns: 1fr; gap: 24px; margin-top: 32px; padding-top: 34px; }
    .usage-intro { max-width: 470px; }
    .package-notes { flex-direction: row; flex-wrap: wrap; gap: 16px; margin-top: 24px; }
    pre { font-size: 11px; }
  }

  @media (max-width: 460px) {
    .layout { padding: 0 18px; }
    .wordmark { gap: 6px; font-size: 17px; }
    .svelte-tag { font-size: 10px; padding: 1px 5px; }
    .header-links { gap: 13px; font-size: 12px; }
    .docs-link, .nav-divider { display: none; }
    .intro { padding-top: 24px; }
    h1 { font-size: 35px; letter-spacing: -1.5px; max-width: 290px; }
    .intro-description { font-size: 14px; }
    .desktop-break { display: none; }
    .mode-bar { padding: 0 13px; }
    .mode-options { width: 100%; justify-content: space-between; gap: 10px; }
    .mode-button { gap: 5px; padding: 15px 0; font-size: 10px; }
    .mode-button :global(svg) { width: 14px; height: 14px; }
    .chart-content { padding: 21px 6px 13px; }
    .chart-heading { padding: 0 10px; }
    .chart-value { font-size: 26px; min-height: 35px; }
    .chart-subtitle { font-size: 10px; }
    .live-controls { gap: 9px; }
    .status { font-size: 10px; }
    .chart-stage { height: 225px; margin-top: 16px; }
    .chart-toolbar { padding: 10px 9px 0; gap: 8px; flex-wrap: wrap; }
    .horizon-options { gap: 1px; }
    .small-button { padding: 5px 9px; }
    .chart-hint { font-size: 9px; }
    .scenario-bar { padding: 10px 12px; flex-wrap: wrap; gap: 6px; }
    .scenario-options { gap: 4px; }
    .scenario-options .control-caption { margin-right: 3px; }
    .text-button { padding: 5px 7px; font-size: 10px; }
    .replay-button { margin-left: auto; }
    .control-row { gap: 18px 20px; }
    .customize { padding-top: 21px; }
    .package-notes { gap: 12px; font-size: 10px; }
    footer { margin-top: 25px; font-size: 10px; }
    footer > div { gap: 12px; }
  }

  @media (prefers-reduced-motion: reduce) {
    button, a, select, summary { transition: none; }
    .appearance summary :global(svg) { transition: none; }
  }
</style>
