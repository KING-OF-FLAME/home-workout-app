import { PROGRAM_MAP, QUICK_MAP } from '@/data/programs';
import type { Workout } from '@/data/types';
import { getAssignment } from '@/services/cloud';
import type { WorkoutSourceKind } from '@/store/AppStore';
import { planLengthLabel, planWorkout, type MyPlan } from './planGenerator';

export interface ResolvedWorkout {
  workout: Workout;
  title: string;
  subtitle?: string;
  /** Present for assignments, so completions can be shared with the trainer. */
  trainerId?: string;
  assignmentId?: string;
}

/** Find the workout behind a route like /player?kind=program&id=abs-21&day=3 */
export async function resolveWorkout(
  kind: WorkoutSourceKind,
  id: string,
  day: number | undefined,
  custom: Workout[],
  plan?: MyPlan | null,
): Promise<ResolvedWorkout | null> {
  switch (kind) {
    case 'program': {
      const p = PROGRAM_MAP[id];
      const w = p?.days[day ?? 0];
      return w ? { workout: w, title: w.title, subtitle: p.title } : null;
    }
    case 'quick': {
      const w = QUICK_MAP[id];
      return w ? { workout: w, title: w.title } : null;
    }
    case 'custom': {
      const w = custom.find((x) => x.id === id);
      return w ? { workout: w, title: w.title, subtitle: 'My workout' } : null;
    }
    case 'plan': {
      if (!plan || plan.id !== id) return null;
      const w = planWorkout(plan, day ?? 0);
      return { workout: w, title: w.title, subtitle: `${planLengthLabel(plan.length)} · Workout ${(day ?? 0) + 1}` };
    }
    case 'assignment': {
      const a = await getAssignment(id);
      const w = a?.workoutPlan?.days[day ?? 0];
      return a && w
        ? { workout: w, title: w.title || `Day ${(day ?? 0) + 1}`, subtitle: `${a.title} · from ${a.trainerName}`, trainerId: a.trainerId, assignmentId: a.id }
        : null;
    }
  }
}
