import type { IconName } from '@/components/ui';
import type { Goal } from './types';

/** Goals the user can pick, in the order onboarding shows them. */
export const GOALS: { id: Goal; title: string; short: string; sub: string; icon: IconName }[] = [
  { id: 'get_fit', title: 'Full body fitness', short: 'Full body', sub: 'Train every muscle, feel fitter every week', icon: 'body' },
  { id: 'lose_weight', title: 'Lose weight', short: 'Lose weight', sub: 'Burn fat with cardio and circuits', icon: 'flame' },
  { id: 'build_muscle', title: 'Gain weight & muscle', short: 'Gain muscle', sub: 'Add size with more sets and steady progress', icon: 'barbell' },
  { id: 'strength', title: 'Build strength & power', short: 'Strength', sub: 'Harder moves, fewer reps, explosive jumps', icon: 'flash' },
  { id: 'kegel', title: 'Pelvic floor (Kegel)', short: 'Kegel', sub: 'Stronger pelvic floor and deep core, for men and women', icon: 'fitness' },
  { id: 'flexibility', title: 'Improve flexibility', short: 'Flexibility', sub: 'Move better, feel less stiff', icon: 'leaf' },
];

export function goalLabel(g: Goal): string {
  return GOALS.find((x) => x.id === g)?.short ?? g;
}
