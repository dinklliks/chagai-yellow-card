import { describe, expect, it } from 'vitest'
import { BUZZ, buzz } from '../src/haptics.ts'
import type { Vibrator } from '../src/haptics.ts'

function fakeVibrator(): Vibrator & { calls: (number | number[])[] } {
  const calls: (number | number[])[] = []
  return {
    calls,
    vibrate: (pattern) => {
      calls.push(pattern)
      return true
    },
  }
}

describe('buzz', () => {
  it('passes the pattern to vibrate when present', () => {
    const vibrator = fakeVibrator()
    buzz(BUZZ.yellow, vibrator)
    buzz(BUZZ.giant, vibrator)
    buzz(BUZZ.red, vibrator)
    expect(vibrator.calls).toEqual([30, 150, [100, 50, 300]])
  })

  it('skips silently when vibrate is missing', () => {
    expect(() => buzz(BUZZ.red, {})).not.toThrow()
    expect(() => buzz(BUZZ.red, undefined)).not.toThrow()
  })

  it('swallows a vibrate that throws', () => {
    const broken: Vibrator = {
      vibrate: () => {
        throw new Error('blocked')
      },
    }
    expect(() => buzz(BUZZ.giant, broken)).not.toThrow()
  })

  it('works with the real global navigator (no vibrate in Node)', () => {
    expect(() => buzz(BUZZ.yellow)).not.toThrow()
  })
})
