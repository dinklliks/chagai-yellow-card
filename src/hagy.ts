// The "חגי" button (the right name): hidden until REVEAL_AT, then it pops in and stays. While sent off it
// swaps into the big spot with "תגיד את השם נכון כדי לחזור למשחק" and the main button shrinks.

const REVEAL_MS = 700
const REVEAL_FADE_MS = 250

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Grows in from nothing with an overshoot and a wobble. */
const revealFrames: Keyframe[] = [
  { transform: 'scale(0.2) rotate(-8deg)', opacity: 0 },
  { transform: 'scale(1.12) rotate(3deg)', opacity: 1, offset: 0.45 },
  { transform: 'scale(0.96) rotate(-2deg)', offset: 0.7 },
  { transform: 'scale(1) rotate(0deg)' },
]

const fadeFrames: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }]

export type HagyControl = {
  /** Shows the button; `animate` for its first arrival, off when restoring it on page load. */
  reveal(animate: boolean): void
  /** Swaps it into the big spot during a suspension (CSS on `.stage.sent-off`), and back. */
  swap(suspended: boolean): void
  /** Hides it again (after a reset); the next pass of REVEAL_AT brings it back with the animation. */
  hide(): void
}

/** `stage` holds both the main button and `button`; the swap is a class on it. */
export function createHagy(button: HTMLButtonElement, stage: HTMLElement): HagyControl {
  return {
    reveal(animate) {
      if (!button.hidden) return
      button.hidden = false
      if (!animate) return
      if (reducedMotion()) button.animate(fadeFrames, { duration: REVEAL_FADE_MS, easing: 'ease-out' })
      else button.animate(revealFrames, { duration: REVEAL_MS, easing: 'ease-out' })
    },
    swap(suspended) {
      stage.classList.toggle('sent-off', suspended)
    },
    hide() {
      for (const animation of button.getAnimations()) animation.cancel()
      button.hidden = true
    },
  }
}
