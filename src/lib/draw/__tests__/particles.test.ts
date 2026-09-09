import { describe, expect, it } from 'vitest'
import { createParticleState, drawParticles, spawnOnSwing } from '../particles'

describe('particle bursts', () => {
  it.each(['flat', 'small swing'] as const)('allows a fresh burst after a %s during cooldown', (calm) => {
    const state = createParticleState()
    const swing = { momentum: 'up' as const, swingMagnitude: 0.1, dt: 400 }
    for (let i = 0; i < 3; i++) spawnOnSwing(state, [0, 0], '#3b82f6', swing)
    expect(state.burstCount).toBe(3)

    spawnOnSwing(state, [0, 0], '#3b82f6', {
      momentum: calm === 'flat' ? 'flat' : 'up',
      swingMagnitude: calm === 'flat' ? 0.1 : 0.01,
      dt: 16.67,
    })
    expect(spawnOnSwing(state, [0, 0], '#3b82f6', swing)).toBe(1)
  })

  it('applies the same drag over the same time at different frame rates', () => {
    const particle = { x: 0, y: 0, vx: 100, vy: -100, life: 1, size: 2, color: '#3b82f6' }
    const state60 = { ...createParticleState(), particles: [{ ...particle }] }
    const state120 = { ...createParticleState(), particles: [{ ...particle }] }
    const ctx = { save() {}, restore() {}, beginPath() {}, arc() {}, fill() {} } as unknown as CanvasRenderingContext2D
    drawParticles(ctx, state60, 16.67)
    drawParticles(ctx, state120, 16.67 / 2)
    drawParticles(ctx, state120, 16.67 / 2)
    expect(state60.particles[0].vx).toBeCloseTo(state120.particles[0].vx)
    expect(state60.particles[0].vy).toBeCloseTo(state120.particles[0].vy)
    expect(state60.particles[0].life).toBeCloseTo(state120.particles[0].life)
  })
})
