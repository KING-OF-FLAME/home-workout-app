import { EXERCISES } from '@/data/exercises';
import type { Exercise, Goal, Level, MuscleGroup, Workout, WorkoutItem } from '@/data/types';
import { estimateMinutes } from './workout';

/** Plan length in days. 0 means it keeps going with no end date. */
export type PlanLength = 30 | 60 | 90 | 365 | 0;
export type SessionMinutes = 10 | 20 | 30 | 45;
export type FocusArea = 'full' | 'abs' | 'arms' | 'chest' | 'back' | 'legs' | 'glutes';

export interface MyPlan {
  id: string;
  createdAt: number;
  length: PlanLength;
  daysPerWeek: number;
  minutes: SessionMinutes;
  focus: FocusArea[];
  /** false = floor-only moves, true = a chair and a wall can be used too. */
  useChair: boolean;
  goal: Goal;
  level: Level;
  /** Index of every finished session. */
  completed: number[];
  /** 1 = as generated. Nudged by the "how did it feel?" answer. */
  intensity: number;
  /** Workouts the user changed by hand, by session index. They replace the generated ones. */
  edits?: Record<string, WorkoutItem[]>;
  /** Exercises the user swapped everywhere: generated id -> the user's pick. */
  swaps?: Record<string, string>;
}

export const PLAN_LENGTHS: { value: PlanLength; title: string; sub: string }[] = [
  { value: 30, title: '30 days', sub: 'Kick-start: build the habit and learn the moves' },
  { value: 60, title: '60 days', sub: 'Visible change: steady progress, harder moves' },
  { value: 90, title: '90 days', sub: 'Transformation: full foundation, build and peak' },
  { value: 365, title: '365 days', sub: 'A full year: 4-week cycles that keep progressing' },
  { value: 0, title: 'Keep going', sub: 'No end date. New workouts every week, forever' },
];

export const FOCUS_AREAS: { id: FocusArea; label: string }[] = [
  { id: 'full', label: 'Full body' },
  { id: 'abs', label: 'Abs' },
  { id: 'arms', label: 'Arms' },
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'legs', label: 'Legs' },
  { id: 'glutes', label: 'Glutes' },
];

const FOCUS_GROUPS: Record<FocusArea, MuscleGroup[]> = {
  full: ['fullbody'],
  abs: ['core'],
  arms: ['arms', 'shoulders'],
  chest: ['chest'],
  back: ['back'],
  legs: ['legs'],
  glutes: ['glutes'],
};

type DayType = 'full' | 'upper' | 'lower' | 'core' | 'hiit' | 'mobility' | 'focus' | 'pelvic' | 'power';

const DAY_CYCLE: Record<Goal, DayType[]> = {
  lose_weight: ['hiit', 'full', 'core', 'lower', 'hiit', 'upper', 'full'],
  build_muscle: ['upper', 'lower', 'core', 'upper', 'lower', 'full', 'core'],
  get_fit: ['full', 'core', 'lower', 'upper', 'hiit', 'mobility', 'full'],
  flexibility: ['mobility', 'core', 'mobility', 'full', 'mobility', 'lower', 'mobility'],
  strength: ['upper', 'lower', 'power', 'core', 'upper', 'lower', 'full'],
  kegel: ['pelvic', 'pelvic', 'core', 'pelvic', 'mobility', 'pelvic', 'lower'],
};

const DAY_TITLE: Record<DayType, string> = {
  full: 'Full body',
  upper: 'Upper body',
  lower: 'Legs & glutes',
  core: 'Core & abs',
  hiit: 'Fat-burn HIIT',
  mobility: 'Mobility & stretch',
  focus: 'Focus',
  pelvic: 'Pelvic floor',
  power: 'Power & jumps',
};

const DAY_GROUPS: Record<Exclude<DayType, 'focus' | 'pelvic'>, MuscleGroup[]> = {
  full: ['fullbody', 'legs', 'chest', 'core', 'glutes', 'back'],
  upper: ['chest', 'arms', 'shoulders', 'back'],
  lower: ['legs', 'glutes'],
  core: ['core'],
  hiit: ['cardio', 'fullbody', 'legs', 'core'],
  mobility: ['mobility'],
  power: ['cardio', 'legs', 'fullbody'],
};

/** Pelvic floor days: Kegels first, then moves that train the deep core and hips around it. */
const PELVIC_MAIN = ['kegel-hold', 'kegel-flicks', 'bridge-squeeze'];
const PELVIC_SUPPORT = ['glute-bridge', 'dead-bug', 'bird-dog', 'fire-hydrants', 'squats', 'sumo-squats', 'reverse-crunches', 'single-leg-bridge'];
const PELVIC_COOL = ['deep-squat-hold', 'butterfly-stretch', 'child-pose', 'cat-cow'];

const VOLUME: Record<SessionMinutes, { warm: number; main: number; sets: number; cool: number }> = {
  10: { warm: 1, main: 4, sets: 2, cool: 1 },
  20: { warm: 2, main: 5, sets: 3, cool: 2 },
  30: { warm: 2, main: 7, sets: 3, cool: 2 },
  45: { warm: 3, main: 8, sets: 4, cool: 3 },
};

const WARMUP_IDS = ['jumping-jacks', 'march-in-place', 'arm-circles', 'hip-circles', 'high-knees', 'butt-kicks', 'cat-cow', 'inchworms'];
const COOLDOWN_IDS = ['child-pose', 'cobra', 'hamstring-stretch', 'quad-stretch', 'figure-four', 'chest-opener', 'spinal-twist', 'neck-rolls'];

export interface PlanPhase {
  name: string;
  detail: string;
  deload: boolean;
}

export function totalSessions(plan: Pick<MyPlan, 'length' | 'daysPerWeek'>): number {
  return plan.length ? Math.max(1, Math.round((plan.length / 7) * plan.daysPerWeek)) : Number.POSITIVE_INFINITY;
}

export function totalWeeks(plan: Pick<MyPlan, 'length'>): number {
  return plan.length ? Math.ceil(plan.length / 7) : Number.POSITIVE_INFINITY;
}

export function weekOf(plan: Pick<MyPlan, 'daysPerWeek'>, session: number): number {
  return Math.floor(session / plan.daysPerWeek) + 1;
}

/** Training phase for a given week. Every 4th week is lighter so the body can recover. */
export function phaseFor(plan: Pick<MyPlan, 'length'>, week: number): PlanPhase {
  const weeks = totalWeeks(plan);
  if (Number.isFinite(weeks) && week === weeks && weeks >= 4) {
    return { name: 'Final week', detail: 'Test yourself: see how far you have come.', deload: false };
  }
  if (week % 4 === 0) return { name: 'Recovery week', detail: 'Lighter week so your muscles rebuild stronger.', deload: true };
  const frac = Number.isFinite(weeks) ? week / weeks : ((week - 1) % 12) / 12;
  if (frac <= 0.25 || week <= 2) return { name: 'Foundation', detail: 'Learn clean form and build the habit.', deload: false };
  if (frac <= 0.65) return { name: 'Build', detail: 'More reps, shorter rests, harder moves.', deload: false };
  return { name: 'Peak', detail: 'Your strongest weeks. Push the pace.', deload: false };
}

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function pick<T>(list: T[], n: number, rand: () => number, avoid = new Set<T>()): T[] {
  const pool = list.filter((x) => !avoid.has(x));
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

/** Level the user trains at in a given week: moves get harder as the plan goes on. */
function levelFor(plan: MyPlan, week: number): Level {
  const bump = (week >= 6 ? 1 : 0) + (week >= 16 ? 1 : 0);
  return Math.min(3, plan.level + bump) as Level;
}

function allowed(ex: Exercise, plan: MyPlan, level: Level): boolean {
  if (ex.level > level) return false;
  if (ex.equipment === 'chair' || ex.equipment === 'wall') return plan.useChair;
  return true;
}

function dayTypeFor(plan: MyPlan, session: number): DayType {
  const cycle = DAY_CYCLE[plan.goal];
  const specific = plan.focus.filter((f) => f !== 'full');
  // Every third workout trains the areas the user picked.
  if (specific.length && session % 3 === 2) return 'focus';
  return cycle[session % plan.daysPerWeek % cycle.length];
}

function poolFor(groups: MuscleGroup[], plan: MyPlan, level: Level): Exercise[] {
  const list = EXERCISES.filter((e) => groups.includes(e.group) && allowed(e, plan, level));
  // Prefer moves close to the current level, so advanced users don't get only beginner moves.
  const close = list.filter((e) => e.level >= level - 1);
  return close.length >= 4 ? close : list;
}

/**
 * The workout for session number `session` (0-based), with the user's own
 * changes applied: a day they edited replaces the generated one, and swapped
 * exercises are replaced everywhere.
 */
export function planWorkout(plan: MyPlan, session: number): Workout {
  const w = generatedWorkout(plan, session);
  const edited = plan.edits?.[String(session)];
  if (edited) return { ...w, items: edited };
  const swaps = plan.swaps;
  if (swaps && Object.keys(swaps).length) {
    return { ...w, items: w.items.map((it) => (swaps[it.exerciseId] ? { ...it, exerciseId: swaps[it.exerciseId] } : it)) };
  }
  return w;
}

/** Build the generated workout for a session. Same inputs always give the same workout. */
export function generatedWorkout(plan: MyPlan, session: number): Workout {
  const week = weekOf(plan, session);
  const phase = phaseFor(plan, week);
  const level = levelFor(plan, week);
  const type = dayTypeFor(plan, session);
  const rand = rng(hash(plan.id) + session * 7919);
  const vol = VOLUME[plan.minutes];
  const specific = plan.focus.filter((f) => f !== 'full');

  const groups =
    type === 'focus' ? specific.flatMap((f) => FOCUS_GROUPS[f]) : type === 'pelvic' ? (['core'] as MuscleGroup[]) : DAY_GROUPS[type];
  const byId = (ids: string[]) => EXERCISES.filter((e) => ids.includes(e.id) && allowed(e, plan, 3));
  const used = new Set<Exercise>();
  const take = (list: Exercise[], n: number) => {
    const out = pick(list, n, rand, used);
    out.forEach((e) => used.add(e));
    return out;
  };
  const pelvicDay = type === 'pelvic';
  const warm = take(byId(pelvicDay ? ['cat-cow', 'hip-circles', 'march-in-place'] : WARMUP_IDS), vol.warm);
  const cool = take(byId(pelvicDay ? PELVIC_COOL : COOLDOWN_IDS), vol.cool);

  // Leave one slot for the user's focus areas on normal training days.
  const focusSlot = type !== 'focus' && type !== 'mobility' && type !== 'pelvic' && specific.length > 0 ? 1 : 0;
  let main = pelvicDay
    ? [...take(byId(PELVIC_MAIN), PELVIC_MAIN.length), ...take(byId(PELVIC_SUPPORT), Math.max(1, vol.main - PELVIC_MAIN.length))]
    : take(poolFor(groups, plan, level), vol.main - focusSlot);
  if (focusSlot) main = [...main, ...take(poolFor(FOCUS_GROUPS[specific[session % specific.length]], plan, level), 1)];
  // Fill up from other moves if the pool was small.
  if (main.length < vol.main) main = [...main, ...take(poolFor(['fullbody', 'core', 'legs', 'glutes'], plan, level), vol.main - main.length)];

  // Progression: +4% per week up to +70%, recovery weeks drop back 20%.
  // Strength: fewer, harder reps with longer rests. Gaining muscle: an extra set.
  const goalFactor = plan.goal === 'lose_weight' ? 1.05 : plan.goal === 'strength' ? 0.8 : 1;
  let factor = Math.min(1.7, 1 + 0.04 * (week - 1)) * goalFactor;
  if (phase.deload) factor *= 0.8;
  const extraSet = plan.goal === 'build_muscle' || plan.goal === 'strength' ? 1 : 0;
  const sets = Math.max(1, (phase.deload ? vol.sets - 1 : vol.sets) + extraSet);
  const baseRest =
    plan.goal === 'lose_weight' ? 20 : plan.goal === 'strength' ? 55 : plan.goal === 'build_muscle' ? 45 : plan.goal === 'kegel' ? 20 : 30;
  const rest = Math.max(15, Math.round(baseRest - (phase.name === 'Peak' ? 5 : 0)));

  const item = (e: Exercise, s: number, f: number, note?: string): WorkoutItem => ({
    exerciseId: e.id,
    sets: s,
    reps: e.mode === 'reps' ? Math.max(4, Math.round((e.defaultReps ?? 10) * f)) : undefined,
    seconds: e.mode === 'time' ? Math.max(15, Math.round(((e.defaultSeconds ?? 30) * f) / 5) * 5) : undefined,
    restSeconds: rest,
    note,
  });

  const mobilityDay = type === 'mobility';
  const items: WorkoutItem[] = [
    ...warm.map((e) => item(e, 1, 1, 'Warm-up')),
    ...main.map((e) => item(e, mobilityDay ? Math.min(2, sets) : sets, mobilityDay ? 1 : factor)),
    ...cool.map((e) => item(e, 1, 1, 'Cool-down')),
  ];

  // Keep the workout close to the time the user chose: drop sets from the longest moves first.
  const draft = (): Workout => ({ id: '', title: '', items, restBetweenExercises: rest + 10 });
  for (let guard = 0; guard < 20 && estimateMinutes(draft()) > plan.minutes * 1.3; guard++) {
    const biggest = items.reduce((best, it, i) => (it.sets > items[best].sets ? i : best), 0);
    if (items[biggest].sets <= 1) break;
    items[biggest] = { ...items[biggest], sets: items[biggest].sets - 1 };
  }

  const focusTitle = specific.map((f) => FOCUS_AREAS.find((x) => x.id === f)!.label).join(' + ');
  const title = type === 'focus' ? `${focusTitle} focus` : DAY_TITLE[type];
  return {
    id: `plan-${plan.id}-${session}`,
    title,
    description: `Week ${week} · ${phase.name}. ${phase.detail}`,
    items,
    restBetweenExercises: rest + 10,
  };
}

export function nextSession(plan: MyPlan): number {
  const done = new Set(plan.completed);
  let i = 0;
  while (done.has(i)) i++;
  return i;
}

/** Calendar day of the plan (1-based), counted from the day it was created. */
export function planDay(plan: MyPlan, now = Date.now()): number {
  const start = new Date(plan.createdAt);
  start.setHours(0, 0, 0, 0);
  return Math.floor((now - start.getTime()) / 86400000) + 1;
}

export function planFinished(plan: MyPlan): boolean {
  return Number.isFinite(totalSessions(plan)) && plan.completed.length >= totalSessions(plan);
}

export function planLengthLabel(length: PlanLength): string {
  return length ? `${length}-day plan` : 'Ongoing plan';
}
