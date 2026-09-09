<script lang="ts">
  import { untrack } from 'svelte'
  import type { LivelineTransitionProps } from './types'

  let {
    active,
    duration = 300,
    children,
    class: className = '',
    ...rest
  }: LivelineTransitionProps = $props()

  let mounted = $state([untrack(() => active)])
  let visible = $state(untrack(() => active))

  $effect(() => {
    const next = active
    const transitionDuration = duration

    // Only prop changes should restart a transition, not its own layer updates.
    return untrack(() => {
      if (visible === next && mounted.length === 1) return

      if (!mounted.includes(next)) mounted = [...mounted, next]

      let timeout: number | undefined
      let frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          visible = next
          timeout = window.setTimeout(() => {
            // Rapid switches may leave more than one outgoing layer.
            mounted = [next]
          }, transitionDuration + 50)
        })
      })

      return () => {
        cancelAnimationFrame(frame)
        window.clearTimeout(timeout)
      }
    })
  })
</script>

<div {...rest} class={['liveline-transition', className]}>
  {#each mounted as key (key)}
    <div
      class="liveline-transition__layer"
      aria-hidden={key === visible ? undefined : true}
      inert={key !== visible}
      style={`opacity:${key === visible ? 1 : 0};transition:opacity ${duration}ms ease;pointer-events:${key === visible ? 'auto' : 'none'};`}
    >
      {@render children?.(key)}
    </div>
  {/each}
</div>

<style>
  .liveline-transition {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .liveline-transition__layer {
    position: absolute;
    inset: 0;
  }
</style>
