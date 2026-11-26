import { PROGRAMS } from '@/data/programs';
import type { Goal, Level, Program } from '@/data/types';
import type { ProgramProgress } from '@/store/AppStore';

export function recommendedPrograms(goal: Goal, level: Level): Program[] {
  return [...PROGRAMS].sort((a, b) => score(b, goal, level) - score(a, goal, level));
}

function score(p: Program, goal: Goal, level: Level): number {
  let s = 0;
  if (p.goals[0] === goal) s += 6;
  else if (p.goals.includes(goal)) s += 4;
  s -= Math.abs(p.level - level) * 2;
  if (p.level > level) s -= 1; // prefer slightly easier over harder
  return s;
}

/** The program the user is currently working through, if any. */
export function activeProgram(progress: Record<string, ProgramProgress>): { program: Program; nextDay: number } | null {
  const started = PROGRAMS.map((p) => ({ p, pr: progress[p.id] }))
    .filter((x) => x.pr && x.pr.completedDays.length < x.p.days.length)
    .sort((a, b) => (b.pr!.startedAt ?? 0) - (a.pr!.startedAt ?? 0));
  if (!started.length) return null;
  const { p, pr } = started[0];
  return { program: p, nextDay: nextDayIndex(p, pr) };
}

export function nextDayIndex(p: Program, pr?: ProgramProgress): number {
  if (!pr) return 0;
  for (let i = 0; i < p.days.length; i++) if (!pr.completedDays.includes(i)) return i;
  return p.days.length - 1;
}

export const TIPS = [
  'Drink a glass of water before and after your workout.',
  'Form beats speed. Slow, controlled reps build more strength.',
  'Sore today? A light mobility session helps you recover faster.',
  'Sleep 7–9 hours: it is when your muscles actually grow.',
  'Protein at every meal helps you recover and stay full.',
  'Consistency wins. Three short workouts beat one long one.',
  'Breathe out on the hard part of every rep.',
  'Warm up for 3–5 minutes to prevent injuries.',
];

export function tipOfTheDay(): string {
  const day = Math.floor(Date.now() / 86400000);
  return TIPS[day % TIPS.length];
}
