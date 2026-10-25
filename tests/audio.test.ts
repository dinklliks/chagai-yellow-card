import { describe, expect, it } from 'vitest'
import { MUTE_KEY, loadMuted, saveMuted, soundUrl } from '../src/audio.ts'
import type { KeyValueStorage } from '../src/state.ts'

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map(Object.entries(initial))
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
}

describe('mute persistence', () => {
  it('defaults to unmuted', () => {
    expect(loadMuted(memoryStorage())).toBe(false)
    expect(loadMuted(undefined)).toBe(false)
  })

  it('round-trips under chagai:muted', () => {
    const storage = memoryStorage()
    expect(MUTE_KEY).toBe('chagai:muted')
    saveMuted(true, storage)
    expect(storage.data.get(MUTE_KEY)).toBe('true')
    expect(loadMuted(storage)).toBe(true)
    saveMuted(false, storage)
    expect(loadMuted(storage)).toBe(false)
  })

  it('treats junk as unmuted', () => {
    expect(loadMuted(memoryStorage({ [MUTE_KEY]: 'yes' }))).toBe(false)
  })

  it('survives storage that throws', () => {
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {},
    }
    expect(loadMuted(broken)).toBe(false)
    expect(() => saveMuted(true, broken)).not.toThrow()
  })
})

describe('soundUrl', () => {
  it('builds the URL under the base path', () => {
    expect(soundUrl('whistle-short', '/chagai/')).toBe('/chagai/sounds/whistle-short.wav')
    expect(soundUrl('crowd-ooh', '/')).toBe('/sounds/crowd-ooh.wav')
  })
})
