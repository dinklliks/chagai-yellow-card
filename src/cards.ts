// Flying cards: one element per tap, animated with the Web Animations API, removed when done.

export type CardKind = 'yellow' | 'green'

/** A viewport point (client coordinates) the card starts from. */
export type Origin = { x: number; y: number }

/** Most cards on screen at once; past this the oldest jumps to its end and is removed. */
export const MAX_VISIBLE = 12

const FLIGHT_MS = 900
const FADE_MS = 300

/** Running animations, oldest first. */
const visible: Animation[] = []

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const random = (min: number, max: number): number => min + Math.random() * (max - min)

function flightFrames(origin: Origin): Keyframe[] {
  // Up and off the top of the screen, drifting sideways and spinning.
  const rise = origin.y + window.innerHeight * 0.25 + 120
  const drift = random(-0.4, 0.4) * window.innerWidth
  const spin = random(-540, 540)
  const tilt = random(-20, 20)
  return [
    { transform: `translate(0, 0) rotate(${tilt}deg) scale(0.6)`, opacity: 1 },
    { transform: `translate(${drift * 0.2}px, -60px) rotate(${tilt + spin * 0.2}deg) scale(1.15)`, opacity: 1, offset: 0.15 },
    { transform: `translate(${drift}px, ${-rise}px) rotate(${tilt + spin}deg) scale(0.9)`, opacity: 0.9 },
  ]
}

const fadeFrames: Keyframe[] = [
  { transform: 'scale(0.9)', opacity: 0 },
  { transform: 'scale(1)', opacity: 1, offset: 0.3 },
  { transform: 'scale(1)', opacity: 0 },
]

/** Flies one card from `origin`. Under prefers-reduced-motion it fades in place instead. */
export function fly(kind: CardKind, origin: Origin): void {
  const card = document.createElement('div')
  card.className = `flying-card flying-card-${kind}`
  card.setAttribute('aria-hidden', 'true')
  card.style.left = `${origin.x}px`
  card.style.top = `${origin.y}px`
  document.body.append(card)

  const animation = reducedMotion()
    ? card.animate(fadeFrames, { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' })
    : card.animate(flightFrames(origin), {
        duration: FLIGHT_MS,
        easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)',
        fill: 'forwards',
      })

  const done = (): void => {
    card.remove()
    const i = visible.indexOf(animation)
    if (i !== -1) visible.splice(i, 1)
  }
  animation.addEventListener('finish', done, { once: true })
  animation.addEventListener('cancel', done, { once: true })

  visible.push(animation)
  while (visible.length > MAX_VISIBLE) {
    // Drop it from the queue now: the finish event fires asynchronously.
    visible.shift()?.finish()
  }
}
