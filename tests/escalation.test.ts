import { describe, expect, it } from 'vitest'
import {
  GIANT_EVERY,
  RED_EVERY,
  REVEAL_AT,
  classifyTap,
  isRevealed,
  nextSuspended,
} from '../src/escalation.ts'

describe('classifyTap', () => {
  it('plain taps are yellow', () => {
    expect(classifyTap(1)).toBe('yellow')
    expect(classifyTap(9)).toBe('yellow')
  })

  it('every 10th tap is giant', () => {
    expect(classifyTap(10)).toBe('giant')
    expect(classifyTap(20)).toBe('giant')
  })

  it('every 25th tap is red', () => {
    expect(classifyTap(25)).toBe('red')
  })

  it('red wins over giant on shared multiples', () => {
    expect(classifyTap(50)).toBe('red')
    expect(classifyTap(100)).toBe('red')
  })
})

describe('isRevealed', () => {
  it('hides the "חגי" button before REVEAL_AT and shows it from then on', () => {
    expect(isRevealed(0)).toBe(false)
    expect(isRevealed(REVEAL_AT - 1)).toBe(false)
    expect(isRevealed(REVEAL_AT)).toBe(true)
    expect(isRevealed(REVEAL_AT + 1)).toBe(true)
    expect(isRevealed(1000)).toBe(true)
  })
})

describe('constants', () => {
  it('match the plan', () => {
    expect(GIANT_EVERY).toBe(10)
    expect(RED_EVERY).toBe(25)
    expect(REVEAL_AT).toBe(10)
  })
})

describe('nextSuspended', () => {
  it('a red sends you off', () => {
    expect(nextSuspended(false, 'red')).toBe(true)
    expect(nextSuspended(true, 'red')).toBe(true)
  })

  it('only "חגי" or a reset brings you back', () => {
    expect(nextSuspended(true, 'hagy')).toBe(false)
    expect(nextSuspended(true, 'reset')).toBe(false)
  })

  it('yellow and giant taps leave it as it is', () => {
    expect(nextSuspended(true, 'yellow')).toBe(true)
    expect(nextSuspended(true, 'giant')).toBe(true)
    expect(nextSuspended(false, 'yellow')).toBe(false)
    expect(nextSuspended(false, 'giant')).toBe(false)
  })

  it('"חגי" and reset while playing keep playing', () => {
    expect(nextSuspended(false, 'hagy')).toBe(false)
    expect(nextSuspended(false, 'reset')).toBe(false)
  })
})
