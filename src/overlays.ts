// Full-screen milestone overlays: the giant yellow card and the red card ("הורחקת!" plus a screen shake).
// One overlay at a time; a new one replaces the old. Overlays ignore pointer events, so taps land on the
// buttons underneath (main.ts ignores taps on both buttons while a giant yellow or red card is up).

const GIANT_MS = 1800
// Short, so the locked "הורחקת" button and the big "חגי" way back in show soon after the card.
const RED_MS = 1500
const SHAKE_MS = 500
const REDUCED_FADE_MS = 200

const reducedMotion = (): boolean =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

let current: Animation | undefined

function bigCard(kind: 'yellow' | 'red', quote: string): HTMLElement {
  const card = document.createElement('div')
  card.className = `big-card big-card-${kind}`
  const text = document.createElement('p')
  text.className = 'big-card-quote'
  text.textContent = quote
  card.append(text)
  return card
}

/** Backdrop: fades in, holds, fades out. */
function fadeFrames(duration: number): Keyframe[] {
  const edge = Math.min(0.25, REDUCED_FADE_MS / duration)
  return [{ opacity: 0 }, { opacity: 1, offset: edge }, { opacity: 1, offset: 1 - edge }, { opacity: 0 }]
}

/** Card and banner: slam in with a spin, settle, grow slightly as they fade. */
const popFrames: Keyframe[] = [
  { transform: 'scale(0.3) rotate(-12deg)' },
  { transform: 'scale(1.06) rotate(2deg)', offset: 0.12 },
  { transform: 'scale(1) rotate(0deg)', offset: 0.2 },
  { transform: 'scale(1) rotate(0deg)', offset: 0.85 },
  { transform: 'scale(1.1) rotate(0deg)' },
]

/** Resolves once the overlay is gone: its fade finished (also under reduced motion) or a new one replaced it. */
function show(className: string, children: HTMLElement[], duration: number): Promise<void> {
  current?.cancel()

  const overlay = document.createElement('div')
  overlay.className = `overlay ${className}`
  // Announced to screen readers as it appears.
  overlay.setAttribute('role', 'alert')
  const content = document.createElement('div')
  content.className = 'overlay-content'
  content.append(...children)
  overlay.append(content)
  document.body.append(overlay)

  const animation = overlay.animate(fadeFrames(duration), { duration, easing: 'linear', fill: 'forwards' })
  if (!reducedMotion()) content.animate(popFrames, { duration, easing: 'ease-out' })
  current = animation
  return new Promise((resolve) => {
    const done = (): void => {
      overlay.remove()
      if (current === animation) current = undefined
      resolve()
    }
    animation.addEventListener('finish', done, { once: true })
    animation.addEventListener('cancel', done, { once: true })
  })
}

let shakeTimer: ReturnType<typeof setTimeout> | undefined

/** Shakes the page (CSS on `body.shake`; skipped under reduced motion by the stylesheet). */
function shake(): void {
  const body = document.body
  clearTimeout(shakeTimer)
  body.classList.remove('shake')
  // Force a style flush so re-adding the class restarts the animation.
  void body.offsetWidth
  body.classList.add('shake')
  shakeTimer = setTimeout(() => body.classList.remove('shake'), SHAKE_MS)
}

/** Giant yellow card filling the screen, with a Hagy quote. Resolves once it is gone. */
export function showGiantYellow(quote: string): Promise<void> {
  return show('overlay-giant', [bigCard('yellow', quote)], GIANT_MS)
}

/** Red card with a quote, the "הורחקת!" banner, and a screen shake. Resolves once it is gone. */
export function showRed(quote: string): Promise<void> {
  const banner = document.createElement('div')
  banner.className = 'sent-off-banner'
  banner.textContent = 'הורחקת!'
  const gone = show('overlay-red', [banner, bigCard('red', quote)], RED_MS)
  shake()
  return gone
}

const PRAISE_MS = 1600

let praiseBox: HTMLElement | undefined
let praiseAnimation: Animation | undefined

/** Praise frames: drop in from above, hold, fade. Reduced motion keeps only the fade. */
function praiseFrames(): Keyframe[] {
  const from = reducedMotion() ? 'translateY(0)' : 'translateY(-16px) scale(0.9)'
  return [
    { opacity: 0, transform: from },
    { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.12 },
    { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.8 },
    { opacity: 0, transform: 'translateY(0) scale(1)' },
  ]
}

/**
 * A short green praise line near the top of the screen (the "חגי" button). Separate from the milestone
 * overlays, so it never cuts a giant yellow or red card short; a new line replaces the previous one.
 */
export function showPraise(line: string): void {
  showPill(line)
}

/** A brief note ("הועתק") in the same pill and live region as the praise; either replaces the other. */
export function showToast(line: string): void {
  showPill(line)
}

function showPill(line: string): void {
  if (!praiseBox) {
    praiseBox = document.createElement('div')
    praiseBox.className = 'praise'
    // One persistent live region, so screen readers announce each new line.
    praiseBox.setAttribute('role', 'status')
    document.body.append(praiseBox)
  }
  praiseBox.textContent = line
  praiseAnimation?.cancel()
  praiseAnimation = praiseBox.animate(praiseFrames(), { duration: PRAISE_MS, easing: 'ease-out' })
}
