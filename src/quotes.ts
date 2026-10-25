// Hagy's lines. Placeholders: the group swaps in its own, one string per line.

/** Shown on giant yellow and red cards. */
export const QUOTES: readonly string[] = [
  'קוראים לי חגי. שלוש אותיות, בלי א׳.',
  'אין שום א׳ בשם שלי. תבדוק.',
  'עוד חאגאי אחד ואתה בחוץ.',
  'זה לא שם, זה עבירה.',
  'חאגאי זה קרוב משפחה רחוק. אני חגי.',
  'הלכנו לוואר. זה היה חאגאי.',
  'אני לא שורק בשביל הכיף. טוב, קצת.',
  'תגיד את זה לאט: חגי.',
  'גם אמא שלי לא קוראת לי ככה.',
  'עוד פעם אחת ואני מתקשר לוועדת המשמעת.',
  'ראיתי, שמעתי, רשמתי.',
  'זה כרטיס צהוב, לא הזמנה לחתונה.',
  'השם שלי לא מתארך כשאתה צועק.',
  'יש לך מזל שאין לי כרטיס סגול.',
  'חאגאי? מי זה בכלל?',
]

/** Shown when someone taps "חגי" (the right name). */
export const PRAISE: readonly string[] = [
  'יפה! ככה אומרים את השם.',
  'חגי. מושלם. ממשיכים לשחק.',
  'סוף סוף מישהו שמקשיב.',
  'כרטיס ירוק על משחק הוגן.',
  'את זה אני אוהב לשמוע.',
]

/**
 * A random entry, never `previous` again when there is any other choice
 * (so the same line doesn't show twice in a row). `random` returns [0, 1).
 */
export function pick<T>(list: readonly T[], previous?: T, random: () => number = Math.random): T {
  if (list.length === 0) throw new Error('pick: empty list')
  const choices = list.length > 1 ? list.filter((item) => item !== previous) : list
  const pool = choices.length > 0 ? choices : list
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))]
}
