import { describe, expect, it } from 'vitest'
import {
  BANNED_RED,
  BANNED_YELLOW,
  SERIAL_RED,
  SERIAL_YELLOW,
  STORAGE_KEY,
  load,
  rankFor,
  reset,
  save,
} from '../src/state.ts'
import type { KeyValueStorage } from '../src/state.ts'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

const ZEROS = { yellow: 0, red: 0, green: 0 }

describe('load / save / reset', () => {
  it('round-trips totals under chagai:v1', () => {
    const storage = memoryStorage()
    save({ yellow: 37, red: 1, green: 4 }, storage)
    expect(storage.data.has(STORAGE_KEY)).toBe(true)
    expect(STORAGE_KEY).toBe('chagai:v1')
    expect(load(storage)).toEqual({ yellow: 37, red: 1, green: 4 })
  })

  it('returns zeros when nothing is stored', () => {
    expect(load(memoryStorage())).toEqual(ZEROS)
  })

  it('returns zeros when storage is unavailable', () => {
    expect(load(undefined)).toEqual(ZEROS)
  })

  it('returns zeros for bad JSON', () => {
    expect(load(memoryStorage({ [STORAGE_KEY]: '{not json' }))).toEqual(ZEROS)
  })

  it('returns zeros for JSON that is not an object', () => {
    for (const raw of ['null', '42', '"text"', '[]']) {
      expect(load(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual(ZEROS)
    }
  })

  it('zeroes individual fields that are not non-negative integers', () => {
    const raw = JSON.stringify({ yellow: 12, red: -1, green: 'x' })
    expect(load(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual({ yellow: 12, red: 0, green: 0 })
  })

  it('returns zeros when reading throws', () => {
    const throwing: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {},
      removeItem: () => {},
    }
    expect(load(throwing)).toEqual(ZEROS)
  })

  it('ignores write failures', () => {
    const throwing: KeyValueStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(() => save({ yellow: 1, red: 0, green: 0 }, throwing)).not.toThrow()
    expect(reset(throwing)).toEqual(ZEROS)
  })

  it('reset clears storage and returns zeros', () => {
    const storage = memoryStorage()
    save({ yellow: 5, red: 0, green: 2 }, storage)
    expect(reset(storage)).toEqual(ZEROS)
    expect(storage.data.has(STORAGE_KEY)).toBe(false)
    expect(load(storage)).toEqual(ZEROS)
  })
})

describe('rankFor', () => {
  it('starts at the lowest rank', () => {
    expect(rankFor(0, 0)).toBe('עבירה קלה')
    expect(rankFor(SERIAL_YELLOW - 1, SERIAL_RED - 1)).toBe('עבירה קלה')
  })

  it('climbs to the middle rank at either threshold', () => {
    expect(rankFor(SERIAL_YELLOW, 0)).toBe('עבריין סדרתי')
    expect(rankFor(0, SERIAL_RED)).toBe('עבריין סדרתי')
    expect(rankFor(BANNED_YELLOW - 1, BANNED_RED - 1)).toBe('עבריין סדרתי')
  })

  it('reaches the top rank at either threshold', () => {
    expect(rankFor(BANNED_YELLOW, 0)).toBe('מורחק לצמיתות')
    expect(rankFor(0, BANNED_RED)).toBe('מורחק לצמיתות')
    expect(rankFor(10_000, 400)).toBe('מורחק לצמיתות')
  })
})
