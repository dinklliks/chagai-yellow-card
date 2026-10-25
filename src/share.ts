// Sharing the score: the native share sheet where there is one, otherwise a copy to the clipboard.

/** "קיבלתי X צהובים ו-Y אדומים מחגי" followed by the site link. */
export function shareText(yellow: number, red: number, url: string): string {
  return `קיבלתי ${yellow} צהובים ו-${red} אדומים מחגי\n${url}`
}

/** The site's own address: the page origin plus Vite's base ('/chagai-yellow-card/' in production; './' resolves too). */
export function siteUrl(origin: string, base: string): string {
  return new URL(base, origin + '/').href
}

/** The bits of `navigator` this module uses, so tests can pass a fake. */
export interface Sharer {
  share?: (data: ShareData) => Promise<void>
  clipboard?: { writeText(text: string): Promise<void> }
}

/**
 * - `shared`: the share sheet completed
 * - `cancelled`: the user closed the share sheet (no fallback, nothing to show)
 * - `copied`: written to the clipboard (show "הועתק")
 * - `failed`: neither worked
 */
export type ShareOutcome = 'shared' | 'cancelled' | 'copied' | 'failed'

function defaultSharer(): Sharer | undefined {
  return typeof navigator === 'undefined' ? undefined : (navigator as Sharer)
}

const isAbort = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { name?: unknown }).name === 'AbortError'

/**
 * Shares `text` with `navigator.share` when present. A cancelled sheet (AbortError) stops there; any other
 * share failure (unsupported, blocked) falls through to the clipboard. Never throws.
 */
export async function share(text: string, sharer: Sharer | undefined = defaultSharer()): Promise<ShareOutcome> {
  if (typeof sharer?.share === 'function') {
    try {
      await sharer.share({ text })
      return 'shared'
    } catch (error) {
      if (isAbort(error)) return 'cancelled'
    }
  }
  if (typeof sharer?.clipboard?.writeText === 'function') {
    try {
      await sharer.clipboard.writeText(text)
      return 'copied'
    } catch {
      // fall through
    }
  }
  return 'failed'
}
