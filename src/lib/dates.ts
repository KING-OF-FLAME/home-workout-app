/** Local calendar day key, e.g. 2026-11-26. */
export function dayKey(d: Date | number = new Date()): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

/** Start of the week (Monday) for a date. */
export function startOfWeek(d: Date): Date {
  const c = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (c.getDay() + 6) % 7;
  c.setDate(c.getDate() - diff);
  return c;
}

/** Current and best streak of consecutive active days. */
export function streaks(activeDays: Set<string>, today = new Date()): { current: number; best: number } {
  let current = 0;
  let cursor = today;
  // A streak stays alive until the end of today even if you have not trained yet.
  if (!activeDays.has(dayKey(cursor))) cursor = addDays(cursor, -1);
  while (activeDays.has(dayKey(cursor))) {
    current++;
    cursor = addDays(cursor, -1);
  }
  const sorted = [...activeDays].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const k of sorted) {
    if (prev && dayKey(addDays(new Date(prev + 'T12:00:00'), 1)) === k) run++;
    else run = 1;
    best = Math.max(best, run);
    prev = k;
  }
  return { current, best: Math.max(best, current) };
}

export function friendlyDate(ts: number): string {
  const d = new Date(ts);
  const today = dayKey();
  const key = dayKey(d);
  if (key === today) return 'Today';
  if (key === dayKey(addDays(new Date(), -1))) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
