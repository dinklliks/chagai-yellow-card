// Builds public/sounds/*.wav. Not part of the app or the build; run by hand when the clips need remaking.
//
//   node scripts/make-sounds.mjs path/to/218318_splicesound_referee-whistle-blow-gymnasium.wav
//
// The whistles are cut from a CC0 recording (SpliceSound on Freesound, mirrored on Wikimedia Commons;
// see README). The crowd "ooh" is synthesized here from scratch: a few dozen voices through "oo" vowel
// formants plus breathy noise, swelling up and sagging down.
// Output: 24 kHz mono 16-bit WAV, which every browser (iOS Safari included) decodes.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const RATE = 24000
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sounds')

// ---------- WAV I/O ----------

function readWav(path) {
  const b = readFileSync(path)
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV')
  let off = 12
  let fmt
  let data
  while (off + 8 <= b.length) {
    const id = b.toString('ascii', off, off + 4)
    const size = b.readUInt32LE(off + 4)
    if (id === 'fmt ') {
      fmt = { format: b.readUInt16LE(off + 8), channels: b.readUInt16LE(off + 10), rate: b.readUInt32LE(off + 12), bits: b.readUInt16LE(off + 22) }
    } else if (id === 'data') data = b.subarray(off + 8, off + 8 + size)
    off += 8 + size + (size & 1)
  }
  if (!fmt || !data || fmt.format !== 1 || ![16, 24].includes(fmt.bits)) throw new Error('need 16/24-bit PCM')
  const bytes = fmt.bits / 8
  const frames = Math.floor(data.length / (bytes * fmt.channels))
  const out = new Float64Array(frames)
  const scale = 2 ** (fmt.bits - 1)
  for (let i = 0; i < frames; i++) {
    let sum = 0
    for (let c = 0; c < fmt.channels; c++) sum += data.readIntLE((i * fmt.channels + c) * bytes, bytes) / scale
    out[i] = sum / fmt.channels
  }
  return { rate: fmt.rate, samples: out }
}

function writeWav(name, samples) {
  const n = samples.length
  const b = Buffer.alloc(44 + n * 2)
  b.write('RIFF', 0, 'ascii')
  b.writeUInt32LE(36 + n * 2, 4)
  b.write('WAVEfmt ', 8, 'ascii')
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20) // PCM
  b.writeUInt16LE(1, 22) // mono
  b.writeUInt32LE(RATE, 24)
  b.writeUInt32LE(RATE * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36, 'ascii')
  b.writeUInt32LE(n * 2, 40)
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2)
  mkdirSync(outDir, { recursive: true })
  writeFileSync(join(outDir, name), b)
  console.log(`${name}: ${(n / RATE).toFixed(2)}s, ${b.length} bytes`)
}

// ---------- helpers ----------

/** Windowed-sinc resampler (low-passes below the new Nyquist, so no aliasing when going down). */
function resample(input, from, to) {
  if (from === to) return Float64Array.from(input)
  const ratio = to / from
  const cutoff = Math.min(1, ratio) * 0.95
  const half = 32
  const out = new Float64Array(Math.floor(input.length * ratio))
  for (let i = 0; i < out.length; i++) {
    const center = i / ratio
    const start = Math.ceil(center - half / cutoff)
    const end = Math.floor(center + half / cutoff)
    let sum = 0
    for (let j = Math.max(0, start); j <= Math.min(input.length - 1, end); j++) {
      const x = (j - center) * cutoff
      const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x)
      const w = 0.5 + 0.5 * Math.cos((Math.PI * (j - center) * cutoff) / half)
      sum += input[j] * sinc * w * cutoff
    }
    out[i] = sum
  }
  return out
}

const sec = (s) => Math.round(s * RATE)

function normalize(samples, peak) {
  let max = 0
  for (const v of samples) max = Math.max(max, Math.abs(v))
  return samples.map((v) => (v * peak) / max)
}

/** Linear fades at both ends (fade lengths in seconds). */
function fade(samples, fadeIn, fadeOut) {
  const out = Float64Array.from(samples)
  const a = sec(fadeIn)
  const b = sec(fadeOut)
  for (let i = 0; i < a && i < out.length; i++) out[i] *= i / a
  for (let i = 0; i < b && i < out.length; i++) out[out.length - 1 - i] *= i / b
  return out
}

/** Concatenates parts, overlapping each join by `overlap` samples with an equal-power crossfade. */
function crossfadeJoin(parts, overlap) {
  const total = parts.reduce((sum, p) => sum + p.length, 0) - overlap * (parts.length - 1)
  const out = new Float64Array(total)
  let pos = 0
  parts.forEach((part, k) => {
    for (let i = 0; i < part.length; i++) {
      let g = 1
      if (k > 0 && i < overlap) g = Math.sin((Math.PI / 2) * (i / overlap))
      if (k < parts.length - 1 && i >= part.length - overlap) g *= Math.cos((Math.PI / 2) * ((i - (part.length - overlap)) / overlap))
      out[pos + i] += part[i] * g
    }
    pos += part.length - overlap
  })
  return out
}

/** RBJ band-pass biquad (constant 0 dB peak gain). */
function bandpass(freq, q) {
  const w = (2 * Math.PI * freq) / RATE
  const alpha = Math.sin(w) / (2 * q)
  const a0 = 1 + alpha
  const b0 = alpha / a0
  const b2 = -alpha / a0
  const a1 = (-2 * Math.cos(w)) / a0
  const a2 = (1 - alpha) / a0
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0
  return (x) => {
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2
    x2 = x1; x1 = x; y2 = y1; y1 = y
    return y
  }
}

/** Seeded PRNG (mulberry32) so the synthesized clip is the same every run. */
function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------- whistles ----------

function whistles(sourcePath) {
  const src = readWav(sourcePath)
  const s = resample(src.samples, src.rate, RATE)
  // The source is one ~0.45s blow starting at ~0.08s, then gymnasium reverb.

  // Short: the blow's start (a quick "tweet"), cut clean so fast taps don't smear into each other.
  const short = fade(s.slice(sec(0.085), sec(0.42)), 0.004, 0.07)
  writeWav('whistle-short.wav', normalize(short, 0.9))

  // Long: the attack, then the steady middle stretched to ~1.4s by overlap-adding windowed grains of it,
  // then the original release and part of the room tail.
  const attackEnd = sec(0.2)
  const steady = s.slice(sec(0.2), sec(0.46))
  const release = s.slice(sec(0.46), sec(1.1))
  const sustainLen = sec(1.2)
  const grain = sec(0.12)
  const hop = grain / 2
  const sustain = new Float64Array(sustainLen + grain)
  const random = rng(7)
  for (let pos = 0; pos < sustainLen; pos += hop) {
    const from = Math.floor(random() * (steady.length - grain))
    for (let i = 0; i < grain; i++) {
      const w = Math.sin((Math.PI * i) / grain) // sin window: overlap at 50% keeps power steady
      sustain[pos + i] += steady[from + i] * w
    }
  }
  // Skip the first half-grain (it only has one grain in it), then splice: real attack, sustain, real release.
  const attack = s.slice(sec(0.085), attackEnd)
  const xf = sec(0.04)
  const long = crossfadeJoin([attack, sustain.slice(hop, hop + sustainLen), release], xf)
  writeWav('whistle-long.wav', normalize(fade(long, 0.004, 0.25), 0.9))
}

// ---------- crowd "ooh" ----------

function crowdOoh() {
  const random = rng(42)
  const length = sec(1.9)
  const out = new Float64Array(length)
  const VOICES = 48
  // /u/ formants, a little open toward "oh" (F1, F2, F3 in Hz with their weights).
  const formants = [
    [350, 1],
    [800, 0.5],
    [2400, 0.12],
  ]
  for (let v = 0; v < VOICES; v++) {
    const female = random() < 0.35
    const base = (female ? 190 : 105) * 2 ** ((random() - 0.5) * 0.6)
    const onset = random() * 0.18 + (random() < 0.2 ? 0.1 : 0)
    const peak = onset + 0.35 + random() * 0.15
    const end = 1.35 + random() * 0.45
    const vibRate = 4.5 + random() * 2
    const vibDepth = 0.01 + random() * 0.015
    const gain = 0.5 + random() * 0.5
    const spread = 1 + (random() - 0.5) * 0.08 // each throat is a bit different
    const filters = formants.map(([f]) => bandpass(f * spread, 6))
    let phase = random()
    for (let i = sec(onset); i < length && i < sec(end); i++) {
      const t = i / RATE
      // Pitch swells up then sags: "ooOOOoohh".
      const contour = t < peak ? ((t - onset) / (peak - onset)) * 4 : 4 - ((t - peak) / (end - peak)) * 8
      const f0 = base * 2 ** (contour / 12) * (1 + vibDepth * Math.sin(2 * Math.PI * vibRate * t + v))
      phase += f0 / RATE
      phase -= Math.floor(phase)
      // Soft glottal-ish pulse: a sawtooth with its top rounded off.
      const source = Math.tanh(3 * (phase - 0.5)) + (random() - 0.5) * 0.25
      let voiced = 0
      for (let k = 0; k < filters.length; k++) voiced += filters[k](source) * formants[k][1]
      const env =
        t < peak
          ? Math.sin((Math.PI / 2) * Math.min(1, (t - onset) / (peak - onset)))
          : Math.max(0, 1 - (t - peak) / (end - peak)) ** 1.5
      out[i] += voiced * env * gain
    }
  }
  // Breath and room: band-passed noise following the same swell.
  const breath = [bandpass(600, 0.7), bandpass(1600, 1.2)]
  for (let i = 0; i < length; i++) {
    const t = i / RATE
    const env = t < 0.55 ? Math.sin((Math.PI / 2) * (t / 0.55)) : Math.max(0, 1 - (t - 0.55) / 1.3) ** 1.3
    const n = random() * 2 - 1
    out[i] += (breath[0](n) * 0.6 + breath[1](n) * 0.25) * env * 2.5
  }
  writeWav('crowd-ooh.wav', normalize(fade(out, 0.01, 0.2), 0.8))
}

const source = process.argv[2]
if (!source) {
  console.error('usage: node scripts/make-sounds.mjs <referee-whistle-source.wav>')
  process.exit(1)
}
whistles(source)
crowdOoh()
