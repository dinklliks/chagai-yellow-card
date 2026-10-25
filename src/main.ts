import './style.css'
import { load, rankFor, reset, save } from './state.ts'
import type { Totals } from './state.ts'
import { fly } from './cards.ts'
import type { Origin } from './cards.ts'
import { classifyTap, isRevealed } from './escalation.ts'
import { showGiantYellow, showPraise, showRed, showToast } from './overlays.ts'
import { createSuspension } from './suspension.ts'
import { createHagy } from './hagy.ts'
import { PRAISE, QUOTES, pick } from './quotes.ts'
import { initAudio, isMuted, play, setMuted } from './audio.ts'
import { BUZZ, buzz } from './haptics.ts'
import { share, shareText, siteUrl } from './share.ts'

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id)
  if (!el) throw new Error(`Missing #${id} in index.html`)
  return el as T
}

const yellowCount = byId('yellow-count')
const redCount = byId('red-count')
const rankText = byId('rank-text')
const mainBtn = byId<HTMLButtonElement>('main-btn')
const hagyBtn = byId<HTMLButtonElement>('hagy-btn')
const muteBtn = byId<HTMLButtonElement>('mute-btn')
const resetBtn = byId<HTMLButtonElement>('reset-btn')
const shareBtn = byId<HTMLButtonElement>('share-btn')
const hagy = createHagy(hagyBtn, byId('stage'))
const suspension = createSuspension(mainBtn, byId('main-label'), byId('out-msg'), (suspended) =>
  hagy.swap(suspended),
)

function renderMeter(totals: Totals): void {
  yellowCount.textContent = String(totals.yellow)
  redCount.textContent = String(totals.red)
  rankText.textContent = rankFor(totals.yellow, totals.red)
}

function renderMute(muted: boolean): void {
  muteBtn.setAttribute('aria-pressed', String(muted))
  muteBtn.textContent = muted ? '🔇' : '🔊'
}

/** The tap point, or the button's center for keyboard activation (detail 0, no pointer coordinates). */
function tapOrigin(event: MouseEvent, button: HTMLElement): Origin {
  if (event.detail > 0) return { x: event.clientX, y: event.clientY }
  const rect = button.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

const totals = load()
renderMeter(totals)
renderMute(isMuted())
initAudio()
// Already earned on an earlier visit: back in place, without the arrival animation.
if (isRevealed(totals.yellow)) hagy.reveal(false)

let lastQuote: string | undefined
function nextQuote(): string {
  lastQuote = pick(QUOTES, lastQuote)
  return lastQuote
}

let lastPraise: string | undefined
function nextPraise(): string {
  lastPraise = pick(PRAISE, lastPraise)
  return lastPraise
}

// Held while a giant yellow or red card is up, so the card gets read rather than tapped past: taps on
// either button are silently ignored until it is gone. Without it, fast tapping after a red lands on "חגי"
// (swapped into the big spot under the card) and ends the suspension at once. Not a suspension itself:
// no "אתה בחוץ!", and it neither starts nor ends one.
let held = false

function holdUntil(gone: Promise<void>): void {
  held = true
  mainBtn.classList.add('held')
  hagyBtn.classList.add('held')
  void gone.then(() => {
    held = false
    mainBtn.classList.remove('held')
    hagyBtn.classList.remove('held')
  })
}

mainBtn.addEventListener('click', (event) => {
  if (held) return
  // Sent off: the tap doesn't count.
  if (suspension.active()) {
    suspension.bounce()
    return
  }
  // Every tap counts as a yellow (rank thresholds rely on it); a red tap also adds a red.
  totals.yellow += 1
  const kind = classifyTap(totals.yellow)
  if (kind === 'red') totals.red += 1
  save(totals)
  fly('yellow', tapOrigin(event, mainBtn))
  if (kind === 'red') {
    play('whistle-long')
    play('crowd-ooh')
  } else play('whistle-short')
  buzz(BUZZ[kind])
  if (kind === 'giant') holdUntil(showGiantYellow(nextQuote()))
  else if (kind === 'red') {
    holdUntil(showRed(nextQuote()))
    suspension.start()
  }
  if (isRevealed(totals.yellow)) hagy.reveal(true)
  renderMeter(totals)
})

// The right name: a green card and praise, never touching yellow or red. While sent off it gets you back in.
hagyBtn.addEventListener('click', (event) => {
  if (held) return
  totals.green += 1
  save(totals)
  fly('green', tapOrigin(event, hagyBtn))
  showPraise(nextPraise())
  if (suspension.active()) suspension.end('hagy')
})

muteBtn.addEventListener('click', () => {
  setMuted(!isMuted())
  renderMute(isMuted())
})

// One share at a time: a second navigator.share() while the sheet is open would reject.
let sharing = false
shareBtn.addEventListener('click', async () => {
  if (sharing) return
  sharing = true
  try {
    const url = siteUrl(location.origin, import.meta.env.BASE_URL)
    const outcome = await share(shareText(totals.yellow, totals.red, url))
    if (outcome === 'copied') showToast('הועתק')
    else if (outcome === 'failed') showToast('לא הצלחנו לשתף')
  } finally {
    sharing = false
  }
})

// Back to zero: totals, meter, the "חגי" button (earned again at REVEAL_AT) and any running suspension.
resetBtn.addEventListener('click', () => {
  if (!confirm('לאפס את כל הספירה?')) return
  Object.assign(totals, reset())
  // A fresh start isn't sent off; ending it also swaps "חגי" back before it is hidden.
  suspension.end('reset')
  hagy.hide()
  renderMeter(totals)
})
