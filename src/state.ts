// Lifetime totals, persisted in localStorage, plus the wrong-name rank.

export const STORAGE_KEY = 'chagai:v1'

export type Totals = {
  yellow: number
  red: number
  green: number
}

/** The subset of the Web Storage API this module uses (lets tests pass a fake). */
export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const zeros = (): Totals => ({ yellow: 0, red: 0, green: 0 })

/** localStorage when available; undefined in private modes or non-browser runtimes that throw or lack it. */
export function defaultStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage ?? undefined
  } catch {
    return undefined
  }
}

const count = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0

/** Reads saved totals. Missing, unreadable or corrupt storage yields zeros (per field for bad values). */
export function load(storage: KeyValueStorage | undefined = defaultStorage()): Totals {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    if (raw == null) return zeros()
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return zeros()
    const data = parsed as Record<string, unknown>
    return { yellow: count(data.yellow), red: count(data.red), green: count(data.green) }
  } catch {
    return zeros()
  }
}

/** Writes totals. Storage failures (quota, private mode) are ignored: the game keeps working in memory. */
export function save(totals: Totals, storage: KeyValueStorage | undefined = defaultStorage()): void {
  try {
    const { yellow, red, green } = totals
    storage?.setItem(STORAGE_KEY, JSON.stringify({ yellow, red, green }))
  } catch {
    // ignore
  }
}

/** Clears saved totals and returns fresh zeros. */
export function reset(storage: KeyValueStorage | undefined = defaultStorage()): Totals {
  try {
    storage?.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
  return zeros()
}

export const RANKS = ['עבירה קלה', 'עבריין סדרתי', 'מורחק לצמיתות'] as const
export type Rank = (typeof RANKS)[number]

/*
 * Rank thresholds. A rank is reached when EITHER its yellow or its red threshold is met.
 * Every tap adds a yellow and every 25th tap is a red, so the two line up:
 *   - "עבירה קלה":      the starting rank (below both thresholds of the next rank)
 *   - "עבריין סדרתי":   yellow >= 25 or red >= 1   (the first red card)
 *   - "מורחק לצמיתות":  yellow >= 100 or red >= 4  (tap 100)
 */
export const SERIAL_YELLOW = 25
export const SERIAL_RED = 1
export const BANNED_YELLOW = 100
export const BANNED_RED = 4

export function rankFor(yellow: number, red: number): Rank {
  if (yellow >= BANNED_YELLOW || red >= BANNED_RED) return RANKS[2]
  if (yellow >= SERIAL_YELLOW || red >= SERIAL_RED) return RANKS[1]
  return RANKS[0]
}
