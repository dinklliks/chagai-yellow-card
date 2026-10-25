import { describe, expect, it } from 'vitest'
import { PRAISE, QUOTES, pick } from '../src/quotes.ts'

describe('quote lists', () => {
  it('ship 15 quotes and 5 praise lines, all non-empty', () => {
    expect(QUOTES).toHaveLength(15)
    expect(PRAISE).toHaveLength(5)
    for (const line of [...QUOTES, ...PRAISE]) expect(line.trim()).not.toBe('')
  })
})

describe('pick', () => {
  it('maps random() onto the list', () => {
    const list = ['a', 'b', 'c']
    expect(pick(list, undefined, () => 0)).toBe('a')
    expect(pick(list, undefined, () => 0.5)).toBe('b')
    expect(pick(list, undefined, () => 0.999)).toBe('c')
  })

  it('never repeats the previous entry when another exists', () => {
    const list = ['a', 'b', 'c']
    for (const r of [0, 0.3, 0.6, 0.999]) expect(pick(list, 'a', () => r)).not.toBe('a')
    expect(pick(list, 'b', () => 0)).toBe('a')
  })

  it('returns the only entry even if it was the previous one', () => {
    expect(pick(['solo'], 'solo', () => 0.7)).toBe('solo')
  })

  it('stays in range if random() returns 1', () => {
    expect(pick(['a', 'b'], undefined, () => 1)).toBe('b')
  })

  it('throws on an empty list', () => {
    expect(() => pick([])).toThrow()
  })
})
