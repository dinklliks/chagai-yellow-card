import { describe, expect, it } from 'vitest'
import { share, shareText, siteUrl } from '../src/share.ts'
import type { Sharer } from '../src/share.ts'

const URL_ = 'https://example.github.io/chagai/'

function fakeSharer(opts: { share?: () => Promise<void>; copy?: () => Promise<void> }): Sharer & {
  shared: ShareData[]
  copied: string[]
} {
  const shared: ShareData[] = []
  const copied: string[] = []
  return {
    shared,
    copied,
    share: opts.share
      ? (data) => {
          shared.push(data)
          return opts.share!()
        }
      : undefined,
    clipboard: opts.copy
      ? {
          writeText: (text) => {
            copied.push(text)
            return opts.copy!()
          },
        }
      : undefined,
  }
}

const named = (name: string): Error => Object.assign(new Error(name), { name })

describe('shareText', () => {
  it('builds the Hebrew line with the counts and the link', () => {
    expect(shareText(37, 1, URL_)).toBe(`קיבלתי 37 צהובים ו-1 אדומים מחגי\n${URL_}`)
  })

  it('handles zeros', () => {
    expect(shareText(0, 0, URL_)).toBe(`קיבלתי 0 צהובים ו-0 אדומים מחגי\n${URL_}`)
  })
})

describe('siteUrl', () => {
  it('joins the origin and an absolute base', () => {
    expect(siteUrl('https://example.github.io', '/chagai/')).toBe(URL_)
    expect(siteUrl('http://localhost:5173', '/')).toBe('http://localhost:5173/')
  })

  it('resolves a relative base against the origin', () => {
    expect(siteUrl('https://example.github.io', './')).toBe('https://example.github.io/')
  })
})

describe('share', () => {
  it('uses the share sheet when present', async () => {
    const sharer = fakeSharer({ share: async () => {}, copy: async () => {} })
    expect(await share('hi', sharer)).toBe('shared')
    expect(sharer.shared).toEqual([{ text: 'hi' }])
    expect(sharer.copied).toEqual([])
  })

  it('does nothing more when the user cancels the sheet', async () => {
    const sharer = fakeSharer({
      share: () => Promise.reject(named('AbortError')),
      copy: async () => {},
    })
    expect(await share('hi', sharer)).toBe('cancelled')
    expect(sharer.copied).toEqual([])
  })

  it('falls back to the clipboard when the share sheet fails otherwise', async () => {
    const sharer = fakeSharer({
      share: () => Promise.reject(named('NotAllowedError')),
      copy: async () => {},
    })
    expect(await share('hi', sharer)).toBe('copied')
    expect(sharer.copied).toEqual(['hi'])
  })

  it('copies to the clipboard when there is no share sheet', async () => {
    const sharer = fakeSharer({ copy: async () => {} })
    expect(await share('hi', sharer)).toBe('copied')
    expect(sharer.copied).toEqual(['hi'])
  })

  it('reports failure when neither works, without throwing', async () => {
    expect(await share('hi', fakeSharer({ copy: () => Promise.reject(new Error('denied')) }))).toBe('failed')
    expect(await share('hi', {})).toBe('failed')
    expect(await share('hi', undefined)).toBe('failed')
  })
})
