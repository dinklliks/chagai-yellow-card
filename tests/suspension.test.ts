import { afterEach, describe, expect, it, vi } from 'vitest'
import { createSuspension } from '../src/suspension.ts'

// Plain Node, no DOM: just the parts of the elements createSuspension touches.
function fakes() {
  const attrs = new Map<string, string>()
  const button = {
    setAttribute: (name: string, value: string) => attrs.set(name, value),
    removeAttribute: (name: string) => attrs.delete(name),
  }
  const label = { textContent: 'חאגאי' }
  const changes: boolean[] = []
  const suspension = createSuspension(
    button as unknown as HTMLButtonElement,
    label as unknown as HTMLElement,
    {} as HTMLElement,
    (suspended) => changes.push(suspended),
  )
  return { suspension, attrs, label, changes }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createSuspension', () => {
  it('start locks the button and shows "הורחקת"', () => {
    const { suspension, attrs, label, changes } = fakes()
    suspension.start()
    expect(suspension.active()).toBe(true)
    expect(attrs.get('aria-disabled')).toBe('true')
    expect(label.textContent).toBe('הורחקת')
    expect(changes).toEqual([true])
  })

  it('never ends on its own', () => {
    vi.useFakeTimers()
    const { suspension, changes } = fakes()
    suspension.start()
    vi.advanceTimersByTime(60_000)
    expect(suspension.active()).toBe(true)
    expect(changes).toEqual([true])
  })

  it('"חגי" ends it and restores the button', () => {
    const { suspension, attrs, label, changes } = fakes()
    suspension.start()
    suspension.end('hagy')
    expect(suspension.active()).toBe(false)
    expect(attrs.has('aria-disabled')).toBe(false)
    expect(label.textContent).toBe('חאגאי')
    expect(changes).toEqual([true, false])
  })

  it('a reset ends it too', () => {
    const { suspension } = fakes()
    suspension.start()
    suspension.end('reset')
    expect(suspension.active()).toBe(false)
  })

  it('reports only real changes', () => {
    const { suspension, changes } = fakes()
    suspension.end('reset')
    suspension.start()
    suspension.start()
    suspension.end('hagy')
    suspension.end('hagy')
    expect(changes).toEqual([true, false])
  })
})
