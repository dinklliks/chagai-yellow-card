// Pure escalation rules: which event a tap triggers, and the suspension it leads to.

/** Every Nth tap shows a giant yellow card. */
export const GIANT_EVERY = 10
/** Every Nth tap is a red card (wins over giant on shared multiples: 50, 100, ...). */
export const RED_EVERY = 25
/** Tap count at which the hidden "חגי" button appears. */
export const REVEAL_AT = 10

export type TapEvent = 'yellow' | 'giant' | 'red'

/**
 * Whether the "חגי" button shows. Derived from the saved yellow total rather than stored, so it stays
 * after a reload and a reset hides it again.
 */
export function isRevealed(yellow: number): boolean {
  return yellow >= REVEAL_AT
}

/** Classifies the nth tap (1-based running yellow total including this tap). */
export function classifyTap(n: number): TapEvent {
  if (n % RED_EVERY === 0) return 'red'
  if (n % GIANT_EVERY === 0) return 'giant'
  return 'yellow'
}

/**
 * Suspension after a red card: `false` while playing, `true` while sent off. It has no timer: once sent
 * off you stay off until you say the name right (the "חגי" button) or reset. In memory only, so a reload
 * clears it.
 */
export type Suspended = boolean

/** What can move the suspension: a tap's event, a "חגי" tap, or a reset. */
export type SuspensionEvent = TapEvent | 'hagy' | 'reset'

/**
 * The suspension after `event`: a red sends you off, "חגי" and reset bring you back, and nothing else
 * (no yellow, no giant, no amount of waiting) changes it.
 */
export function nextSuspended(suspended: Suspended, event: SuspensionEvent): Suspended {
  if (event === 'red') return true
  if (event === 'hagy' || event === 'reset') return false
  return suspended
}
