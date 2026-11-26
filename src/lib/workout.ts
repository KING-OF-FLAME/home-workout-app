import { getExercise } from '@/data/exercises';
import type { Equipment, Exercise, Workout, WorkoutItem } from '@/data/types';

export interface Step {
  kind: 'ready' | 'exercise' | 'rest';
  /** Index of the WorkoutItem this step belongs to. */
  itemIndex: number;
  exercise?: Exercise;
  setNumber?: number;
  totalSets?: number;
  /** Seconds for timed steps (rest, ready, timed exercises). */
  seconds?: number;
  /** Reps for rep-based exercises. */
  reps?: number;
  note?: string;
}

export function itemTarget(item: WorkoutItem, ex: Exercise, intensity = 1): { reps?: number; seconds?: number } {
  if (ex.mode === 'time') {
    const base = item.seconds ?? ex.defaultSeconds ?? 30;
    return { seconds: Math.max(10, Math.round(base * intensity)) };
  }
  const base = item.reps ?? ex.defaultReps ?? 10;
  return { reps: Math.max(1, Math.round(base * intensity)) };
}

/** Rough seconds a rep-based set takes (for duration/calorie estimates). */
const SECONDS_PER_REP = 3;

export function buildSteps(workout: Workout, opts: { getReady: number; intensity?: number }): Step[] {
  const steps: Step[] = [];
  const intensity = opts.intensity ?? 1;
  if (opts.getReady > 0) steps.push({ kind: 'ready', itemIndex: 0, seconds: opts.getReady });
  workout.items.forEach((item, itemIndex) => {
    const ex = getExercise(item.exerciseId);
    if (!ex) return;
    const target = itemTarget(item, ex, intensity);
    const sides = ex.perSide ? 2 : 1;
    for (let s = 1; s <= item.sets; s++) {
      steps.push({
        kind: 'exercise',
        itemIndex,
        exercise: ex,
        setNumber: s,
        totalSets: item.sets,
        reps: target.reps ? target.reps * sides : undefined,
        seconds: target.seconds ? target.seconds * sides : undefined,
        note: item.note,
      });
      const isLast = itemIndex === workout.items.length - 1 && s === item.sets;
      if (!isLast) {
        const rest = s < item.sets ? item.restSeconds : workout.restBetweenExercises ?? item.restSeconds;
        if (rest > 0) steps.push({ kind: 'rest', itemIndex: s < item.sets ? itemIndex : itemIndex + 1, seconds: rest });
      }
    }
  });
  return steps;
}

export function stepSeconds(step: Step): number {
  if (step.seconds) return step.seconds;
  if (step.reps) return step.reps * SECONDS_PER_REP;
  return 0;
}

export function estimateMinutes(workout: Workout, intensity = 1): number {
  const total = buildSteps(workout, { getReady: 0, intensity }).reduce((sum, s) => sum + stepSeconds(s), 0);
  return Math.max(1, Math.round(total / 60));
}

/** kcal = MET × 3.5 × kg ÷ 200 × minutes. Shown to users as an estimate. */
export function caloriesFor(met: number, seconds: number, weightKg: number): number {
  return (met * 3.5 * weightKg) / 200 * (seconds / 60);
}

export function estimateCalories(workout: Workout, weightKg: number, intensity = 1): number {
  const steps = buildSteps(workout, { getReady: 0, intensity });
  let kcal = 0;
  for (const s of steps) {
    if (s.kind === 'exercise' && s.exercise) kcal += caloriesFor(s.exercise.met, stepSeconds(s), weightKg);
    if (s.kind === 'rest') kcal += caloriesFor(1.5, stepSeconds(s), weightKg);
  }
  return Math.round(kcal);
}

/** Equipment a workout really needs, so "no equipment" is never a false promise. */
export function equipmentFor(workouts: Workout | Workout[]): Equipment[] {
  const list = Array.isArray(workouts) ? workouts : [workouts];
  const set = new Set<Equipment>();
  for (const wk of list) for (const it of wk.items) {
    const ex = getExercise(it.exerciseId);
    if (ex && ex.equipment !== 'none') set.add(ex.equipment);
  }
  return [...set];
}

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  none: 'No equipment',
  mat: 'Floor or mat',
  chair: 'Sturdy chair',
  wall: 'Wall',
};

export function equipmentSummary(workouts: Workout | Workout[]): string {
  const eq = equipmentFor(workouts).filter((e) => e !== 'mat');
  if (eq.length === 0) return 'No equipment';
  return `Needs: ${eq.map((e) => EQUIPMENT_LABEL[e].toLowerCase()).join(', ')}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
