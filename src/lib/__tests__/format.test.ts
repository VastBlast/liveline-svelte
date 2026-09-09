import { describe, expect, it } from 'vitest'
import { defaultFormatTime } from '../format'

const at = new Date(2026, 0, 1, 9, 5, 7).getTime() / 1000

describe('defaultFormatTime', () => {
  it('keeps seconds for an exact moment or a sub-minute step', () => {
    expect(defaultFormatTime(at)).toBe('09:05:07')
    expect(defaultFormatTime(at, 30)).toBe('09:05:07')
  })

  it('drops seconds when the label stands for a minute or more', () => {
    expect(defaultFormatTime(at, 60)).toBe('09:05')
    expect(defaultFormatTime(at, 600)).toBe('09:05')
  })
})
