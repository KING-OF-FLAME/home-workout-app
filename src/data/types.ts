export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'core'
  | 'legs'
  | 'glutes'
  | 'fullbody'
  | 'cardio'
  | 'mobility';

/** "none" means truly no equipment. Anything else is shown to the user before they start. */
export type Equipment = 'none' | 'chair' | 'wall' | 'mat';

export type Level = 1 | 2 | 3;

export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  muscles: string[];
  equipment: Equipment;
  level: Level;
  /** reps = user taps Done; time = countdown timer */
  mode: 'reps' | 'time';
  defaultReps?: number;
  defaultSeconds?: number;
  /** Do the reps/time on each side (e.g. lunges). */
  perSide?: boolean;
  /** Metabolic equivalent, used for calorie estimates. */
  met: number;
  steps: string[];
  tip?: string;
  /** Optional image or GIF URL. Leave empty to show the illustrated placeholder. */
  media?: string;
}

export interface WorkoutItem {
  exerciseId: string;
  sets: number;
  reps?: number;
  seconds?: number;
  restSeconds: number;
  note?: string;
}

export interface Workout {
  id: string;
  title: string;
  description?: string;
  items: WorkoutItem[];
  /** Rest between different exercises (sets use the item's restSeconds). */
  restBetweenExercises?: number;
}

export type Goal = 'lose_weight' | 'build_muscle' | 'get_fit' | 'flexibility' | 'strength' | 'kegel';

export interface Program {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: Level;
  goals: Goal[];
  weeks: number;
  daysPerWeek: number;
  icon: string;
  color: string;
  /** One entry per training day, in order. */
  days: Workout[];
}
