// Sound: three short clips played through Web Audio, plus the persisted mute switch.
// iOS only lets audio start inside a user gesture, so nothing is created or decoded until the first
// tap/click/key anywhere on the page; that same gesture then plays its own sound once decoding is done.

import { defaultStorage } from './state.ts'
import type { KeyValueStorage } from './state.ts'

export type SoundName = 'whistle-short' | 'whistle-long' | 'crowd-ooh'

export const SOUNDS: readonly SoundName[] = ['whistle-short', 'whistle-long', 'crowd-ooh']

export const MUTE_KEY = 'chagai:muted'

/** A sound asked for while its clip is still decoding plays late, but only this late; after that it's dropped. */
const LATE_MS = 300

/** Where a clip is served from; files live in `public/sounds/`, under Vite's base path. */
export function soundUrl(name: SoundName, base: string = import.meta.env.BASE_URL): string {
  return `${base}sounds/${name}.wav`
}

/** Saved mute switch. Sound starts on, so anything other than a saved "true" means unmuted. */
export function loadMuted(storage: KeyValueStorage | undefined = defaultStorage()): boolean {
  try {
    return storage?.getItem(MUTE_KEY) === 'true'
  } catch {
    return false
  }
}

export function saveMuted(muted: boolean, storage: KeyValueStorage | undefined = defaultStorage()): void {
  try {
    storage?.setItem(MUTE_KEY, String(muted))
  } catch {
    // ignore: the switch still works for this visit
  }
}

let muted = loadMuted()
let context: AudioContext | undefined
let master: GainNode | undefined
const buffers = new Map<SoundName, AudioBuffer>()
let loading: Promise<void> | undefined

/** Creates the audio context and decodes every clip. Idempotent; must first run inside a user gesture. */
function unlock(): void {
  if (context || typeof AudioContext === 'undefined') return
  context = new AudioContext()
  // A compressor keeps a pile of overlapping whistles from clipping when someone spams the button.
  const compressor = context.createDynamicsCompressor()
  master = context.createGain()
  master.gain.value = muted ? 0 : 1
  master.connect(compressor).connect(context.destination)
  void context.resume().catch(() => {})
  const ctx = context
  loading = Promise.all(
    SOUNDS.map(async (name) => {
      try {
        const response = await fetch(soundUrl(name))
        if (!response.ok) throw new Error(`${response.status} for ${name}`)
        buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()))
      } catch (error) {
        console.warn('Sound failed to load:', name, error)
      }
    }),
  ).then(() => {})
}

/**
 * Listens for the first user gesture to start audio. Capture phase on window, so it runs before the
 * button's own click handler and that first tap can already ask for its whistle.
 */
export function initAudio(): void {
  const events = ['touchend', 'click', 'keydown'] as const
  const onGesture = (): void => {
    unlock()
    for (const type of events) window.removeEventListener(type, onGesture, true)
  }
  for (const type of events) window.addEventListener(type, onGesture, true)
}

function start(name: SoundName): void {
  const buffer = buffers.get(name)
  if (!context || !master || !buffer || muted) return
  // iOS suspends the context after interruptions (calls, backgrounding); a tap is allowed to resume it.
  if (context.state !== 'running') void context.resume().catch(() => {})
  // A fresh source node per call: sources are one-shot, and this lets fast taps overlap.
  const source = context.createBufferSource()
  source.buffer = buffer
  source.connect(master)
  source.start()
}

/** Plays a clip, unless muted or audio isn't available. Never throws, never blocks. */
export function play(name: SoundName): void {
  if (muted) return
  if (buffers.has(name)) return start(name)
  if (!loading) return
  const askedAt = performance.now()
  void loading.then(() => {
    if (performance.now() - askedAt <= LATE_MS) start(name)
  })
}

export function isMuted(): boolean {
  return muted
}

/** Switches sound on or off (cutting off anything playing) and remembers the choice. */
export function setMuted(value: boolean): void {
  muted = value
  saveMuted(value)
  if (master && context) master.gain.setValueAtTime(value ? 0 : 1, context.currentTime)
}
