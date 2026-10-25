// Sent off after a red card: the main button shows "הורחקת" and taps on it bounce off with an
// "אתה בחוץ!" wiggle instead of counting. It never ends on its own, only through the "חגי" button or a
// reset. The rule lives in escalation.ts; this file only draws it.

import { nextSuspended } from './escalation.ts'
import type { Suspended, SuspensionEvent } from './escalation.ts'

/** The locked button's label for as long as the suspension lasts. */
const SENT_OFF_TEXT = 'הורחקת'

const WIGGLE_MS = 350
const MESSAGE_MS = 900

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const wiggleFrames: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-10px) rotate(-1deg)' },
  { transform: 'translateX(10px) rotate(1deg)' },
  { transform: 'translateX(-6px)' },
  { transform: 'translateX(6px)' },
  { transform: 'translateX(0)' },
]

function messageFrames(): Keyframe[] {
  const grow = reducedMotion() ? 'scale(1)' : 'scale(0.7) rotate(-3deg)'
  return [
    { opacity: 0, transform: grow },
    { opacity: 1, transform: 'scale(1) rotate(-3deg)', offset: 0.15 },
    { opacity: 1, transform: 'scale(1) rotate(-3deg)', offset: 0.75 },
    { opacity: 0, transform: 'scale(1) rotate(-3deg)' },
  ]
}

export type SuspensionControl = {
  /** Sends you off (after a red card), until `end()`. */
  start(): void
  /** True while suspended. */
  active(): boolean
  /** A tap on the locked button: short wiggle plus "אתה בחוץ!". */
  bounce(): void
  /** Ends the suspension: the "חגי" button (the way back in) or a reset. */
  end(reason: 'hagy' | 'reset'): void
}

/**
 * Drives the suspension on `button`: `label` shows "הורחקת" in place of its normal text, `message` is the
 * hidden "אתה בחוץ!" note flashed on a bounce. While locked the button has `aria-disabled="true"` (not
 * `disabled`, so taps still arrive and can bounce). `onChange` runs when the suspension starts and when
 * it ends.
 */
export function createSuspension(
  button: HTMLButtonElement,
  label: HTMLElement,
  message: HTMLElement,
  onChange: (suspended: boolean) => void = () => {},
): SuspensionControl {
  const idleText = label.textContent ?? ''
  let suspended: Suspended = false
  let messageAnimation: Animation | undefined

  function apply(event: SuspensionEvent): void {
    const next = nextSuspended(suspended, event)
    if (next === suspended) return
    suspended = next
    if (suspended) {
      button.setAttribute('aria-disabled', 'true')
      label.textContent = SENT_OFF_TEXT
    } else {
      button.removeAttribute('aria-disabled')
      label.textContent = idleText
      messageAnimation?.cancel()
    }
    onChange(suspended)
  }

  return {
    start() {
      apply('red')
    },
    active() {
      return suspended
    },
    bounce() {
      if (!reducedMotion()) button.animate(wiggleFrames, { duration: WIGGLE_MS, easing: 'ease-in-out' })
      messageAnimation?.cancel()
      messageAnimation = message.animate(messageFrames(), { duration: MESSAGE_MS, easing: 'ease-out' })
    },
    end(reason) {
      apply(reason)
    },
  }
}
