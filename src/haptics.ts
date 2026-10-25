// Vibration through navigator.vibrate. iPhones (and desktops) don't have it, so every call is a quiet no-op there.

export type Pattern = number | readonly number[]

/** The bit of `navigator` this module uses, so tests can pass a fake. */
export interface Vibrator {
  vibrate?: (pattern: number | number[]) => boolean
}

/** Per tap kind: a tick for a yellow, a thud for a giant, a double hit for a red. */
export const BUZZ = {
  yellow: 30,
  giant: 150,
  red: [100, 50, 300],
} as const satisfies Record<'yellow' | 'giant' | 'red', Pattern>

function defaultVibrator(): Vibrator | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Vibrator)
}

/** Vibrates if the device can. Never throws: missing API, blocked call or bad state all just skip. */
export function buzz(pattern: Pattern, vibrator: Vibrator | undefined = defaultVibrator()): void {
  if (typeof vibrator?.vibrate !== 'function') return
  try {
    vibrator.vibrate(typeof pattern === 'number' ? pattern : [...pattern])
  } catch {
    // ignore: vibration is a bonus
  }
}
