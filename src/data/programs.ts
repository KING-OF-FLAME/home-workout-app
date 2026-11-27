import type { Program, Workout, WorkoutItem, Level, Goal } from './types';

type Move = [exerciseId: string, amount: number, sets?: number];

/** Build a workout from a compact list of [exerciseId, reps-or-seconds, sets]. */
function w(id: string, title: string, moves: Move[], rest = 30, description?: string): Workout {
  return {
    id,
    title,
    description,
    restBetweenExercises: rest,
    items: moves.map(([exerciseId, amount, sets = 1]): WorkoutItem => ({
      exerciseId,
      sets,
      restSeconds: rest,
      // amount is reps for rep exercises, seconds for timed ones; resolved by the player.
      reps: amount,
      seconds: amount,
    })),
  };
}

/** Repeat day templates for N weeks with a gentle weekly progression (~8% per week). */
function progressive(
  prefix: string,
  weeks: number,
  templates: { title: string; moves: Move[]; rest?: number }[],
): Workout[] {
  const days: Workout[] = [];
  for (let week = 0; week < weeks; week++) {
    const factor = 1 + week * 0.08;
    templates.forEach((t, i) => {
      const moves = t.moves.map(([id, amt, sets]) => [id, Math.round(amt * factor), sets] as Move);
      const restSec = Math.max(15, (t.rest ?? 30) - week * 2);
      days.push(w(`${prefix}-w${week + 1}d${i + 1}`, `Week ${week + 1} · ${t.title}`, moves, restSec));
    });
  }
  return days;
}

function program(
  p: Omit<Program, 'days' | 'daysPerWeek'> & { templates: { title: string; moves: Move[]; rest?: number }[] },
): Program {
  const days = progressive(p.id, p.weeks, p.templates);
  return {
    id: p.id,
    title: p.title,
    subtitle: p.subtitle,
    description: p.description,
    level: p.level as Level,
    goals: p.goals as Goal[],
    weeks: p.weeks,
    daysPerWeek: p.templates.length,
    icon: p.icon,
    color: p.color,
    days,
  };
}

export const PROGRAMS: Program[] = [
  program({
    id: 'beginner-full-body',
    title: 'Beginner Full Body',
    subtitle: '4 weeks · 3 days/week',
    description: 'Learn the basics and build a daily habit. Short sessions that work every major muscle with zero equipment.',
    level: 1, goals: ['get_fit', 'lose_weight'], weeks: 4, icon: 'body', color: '#FF5A36',
    templates: [
      { title: 'Foundations', moves: [['march-in-place', 40], ['squats', 10, 2], ['knee-push-ups', 8, 2], ['glute-bridge', 12, 2], ['plank', 20, 2], ['bird-dog', 8]] },
      { title: 'Move & Breathe', moves: [['jumping-jacks', 25], ['reverse-lunges', 8, 2], ['floor-dips', 10, 2], ['dead-bug', 10, 2], ['superman', 20], ['child-pose', 30]] },
      { title: 'Total Body', moves: [['butt-kicks', 30], ['sumo-squats', 12, 2], ['knee-push-ups', 10, 2], ['donkey-kicks', 10, 2], ['heel-taps', 16], ['cobra', 30]] },
    ],
  }),
  program({
    id: 'fat-burn-hiit',
    title: 'Fat Burn HIIT',
    subtitle: '4 weeks · 4 days/week',
    description: 'Fast, sweaty intervals that raise your heart rate. Low-impact swaps are suggested on every move.',
    level: 2, goals: ['lose_weight'], weeks: 4, icon: 'flame', color: '#FF4D5E',
    templates: [
      { title: 'Cardio Blast', rest: 20, moves: [['jumping-jacks', 40], ['high-knees', 30, 2], ['half-burpees', 10, 2], ['mountain-climbers', 30, 2], ['skaters', 30, 2]] },
      { title: 'Legs on Fire', rest: 20, moves: [['butt-kicks', 30], ['squats', 15, 2], ['reverse-lunges', 10, 2], ['skaters', 30, 2], ['wall-sit', 30]] },
      { title: 'Core Cardio', rest: 20, moves: [['high-knees', 30], ['plank-jacks', 30, 2], ['bicycle-crunches', 20, 2], ['mountain-climbers', 30, 2], ['flutter-kicks', 30]] },
      { title: 'Full Body Burn', rest: 20, moves: [['shadow-boxing', 40], ['burpees', 6, 2], ['push-ups', 8, 2], ['jump-squats', 10, 2], ['plank', 40]] },
    ],
  }),
  program({
    id: 'abs-21',
    title: 'Abs & Core 21',
    subtitle: '3 weeks · 7 short sessions/week',
    description: 'Ten minutes a day for a stronger, more stable core. Builds from basic holds to advanced moves.',
    level: 2, goals: ['get_fit', 'build_muscle'], weeks: 3, icon: 'fitness', color: '#3DDC97',
    templates: [
      { title: 'Core Basics', moves: [['crunches', 15, 2], ['dead-bug', 12], ['plank', 30, 2]] },
      { title: 'Obliques', moves: [['russian-twists', 20, 2], ['heel-taps', 20], ['side-plank', 20, 2]] },
      { title: 'Lower Abs', moves: [['leg-raises', 10, 2], ['flutter-kicks', 30], ['bird-dog', 10]] },
      { title: 'Plank Power', moves: [['plank', 35], ['plank-shoulder-taps', 16, 2], ['plank-jacks', 25]] },
      { title: 'Burner', moves: [['bicycle-crunches', 20, 2], ['mountain-climbers', 30], ['hollow-hold', 15, 2]] },
      { title: 'Control', moves: [['dead-bug', 14], ['v-ups', 8, 2], ['side-plank', 25]] },
      { title: 'Recovery Core', moves: [['cat-cow', 40], ['bird-dog', 10], ['cobra', 30], ['child-pose', 40]] },
    ],
  }),
  program({
    id: 'strength-no-equipment',
    title: 'Home Strength',
    subtitle: '6 weeks · 4 days/week',
    description: 'An upper/lower split that builds real strength with your bodyweight. Uses a sturdy chair for a few moves.',
    level: 3, goals: ['strength', 'build_muscle'], weeks: 6, icon: 'barbell', color: '#5B8DEF',
    templates: [
      { title: 'Upper Push', rest: 45, moves: [['arm-circles', 30], ['push-ups', 12, 3], ['pike-push-ups', 8, 3], ['chair-dips', 10, 3], ['diamond-push-ups', 6, 2]] },
      { title: 'Lower Body', rest: 45, moves: [['hip-circles', 30], ['squats', 20, 3], ['bulgarian-split-squats', 8, 3], ['single-leg-bridge', 10, 3], ['calf-raises', 20, 2]] },
      { title: 'Upper Pull & Core', rest: 45, moves: [['cat-cow', 30], ['doorway-rows', 12, 3], ['reverse-snow-angels', 12, 3], ['superman', 30, 2], ['hollow-hold', 20, 2]] },
      { title: 'Legs & Power', rest: 45, moves: [['jumping-jacks', 40], ['jump-squats', 12, 3], ['lunges', 10, 3], ['step-ups', 10, 3], ['wall-sit', 45]] },
    ],
  }),
  program({
    id: 'glutes-legs',
    title: 'Glutes & Legs',
    subtitle: '4 weeks · 3 days/week',
    description: 'Shape and strengthen your lower body with focused glute work you can do on a mat.',
    level: 1, goals: ['build_muscle', 'get_fit'], weeks: 4, icon: 'walk', color: '#FF5FA2',
    templates: [
      { title: 'Glute Activation', moves: [['glute-bridge', 15, 2], ['donkey-kicks', 12, 2], ['fire-hydrants', 12, 2], ['sumo-squats', 15, 2], ['figure-four', 30]] },
      { title: 'Leg Day', moves: [['squats', 15, 2], ['reverse-lunges', 10, 2], ['side-lunges', 8, 2], ['calf-raises', 20, 2], ['quad-stretch', 30]] },
      { title: 'Burn Out', moves: [['single-leg-bridge', 10, 2], ['side-leg-raises', 15, 2], ['wall-sit', 30, 2], ['skaters', 30], ['hamstring-stretch', 30]] },
    ],
  }),
  program({
    id: 'daily-mobility',
    title: 'Daily Mobility',
    subtitle: '2 weeks · 5 days/week · 8 minutes',
    description: 'Ease stiffness from sitting and move better every day. Perfect on rest days.',
    level: 1, goals: ['flexibility'], weeks: 2, icon: 'leaf', color: '#8BD17C',
    templates: [
      { title: 'Wake Up Flow', rest: 10, moves: [['neck-rolls', 30], ['cat-cow', 40], ['worlds-greatest-stretch', 30], ['hip-circles', 30], ['chest-opener', 30]] },
      { title: 'Hips & Back', rest: 10, moves: [['cat-cow', 40], ['child-pose', 40], ['figure-four', 30], ['spinal-twist', 30], ['cobra', 30]] },
      { title: 'Desk Reset', rest: 10, moves: [['neck-rolls', 30], ['arm-circles', 30], ['chest-opener', 30], ['quad-stretch', 30], ['hamstring-stretch', 30]] },
      { title: 'Lower Body Release', rest: 10, moves: [['hip-circles', 30], ['quad-stretch', 30], ['hamstring-stretch', 30], ['figure-four', 30], ['child-pose', 40]] },
      { title: 'Full Body Stretch', rest: 10, moves: [['worlds-greatest-stretch', 30], ['cobra', 30], ['spinal-twist', 30], ['chest-opener', 30], ['child-pose', 45]] },
    ],
  }),
  program({
    id: 'pelvic-floor',
    title: 'Pelvic Floor Basics',
    subtitle: '4 weeks · 5 days/week · 10 minutes',
    description: 'Kegel holds, quick squeezes and bridges for a stronger pelvic floor and deep core. For men and women. Talk to a doctor first if you are pregnant, recovering from birth or surgery, or have pelvic pain.',
    level: 1, goals: ['kegel'], weeks: 4, icon: 'fitness', color: '#B07CFF',
    templates: [
      { title: 'Learn the squeeze', rest: 15, moves: [['cat-cow', 30], ['kegel-hold', 50], ['kegel-flicks', 30], ['bridge-squeeze', 8], ['child-pose', 40]] },
      { title: 'Hold & lift', rest: 15, moves: [['hip-circles', 30], ['kegel-hold', 60, 2], ['bridge-squeeze', 10, 2], ['dead-bug', 30], ['deep-squat-hold', 30]] },
      { title: 'Quick squeezes', rest: 15, moves: [['march-in-place', 30], ['kegel-flicks', 40, 2], ['glute-bridge', 12], ['bird-dog', 30], ['butterfly-stretch', 40]] },
      { title: 'Strong core', rest: 15, moves: [['cat-cow', 30], ['kegel-hold', 60], ['reverse-crunches', 10], ['fire-hydrants', 10], ['deep-squat-hold', 40]] },
      { title: 'Relax & reset', rest: 10, moves: [['kegel-flicks', 30], ['kegel-hold', 50], ['bridge-squeeze', 10], ['butterfly-stretch', 40], ['child-pose', 45]] },
    ],
  }),
];

/** One-off workouts for the "Quick start" row. */
export const QUICK_WORKOUTS: Workout[] = [
  w('quick-7-minute', '7-Minute Workout', [
    ['jumping-jacks', 30], ['wall-sit', 30], ['push-ups', 10], ['crunches', 15], ['step-ups', 10], ['squats', 15],
    ['chair-dips', 10], ['plank', 30], ['high-knees', 30], ['lunges', 8], ['plank-shoulder-taps', 12], ['side-plank', 20],
  ], 10, 'The classic high-intensity circuit. Needs a wall and a sturdy chair.'),
  w('quick-morning', 'Morning Energiser', [
    ['march-in-place', 40], ['arm-circles', 30], ['squats', 12], ['inchworms', 5], ['worlds-greatest-stretch', 30], ['jumping-jacks', 30],
  ], 15, 'Wake up your body in under 6 minutes.'),
  w('quick-core', 'Core Crusher', [
    ['crunches', 15], ['bicycle-crunches', 20], ['leg-raises', 10], ['russian-twists', 20], ['plank', 40], ['mountain-climbers', 30],
  ], 20, 'Six moves, zero equipment, serious burn.'),
  w('quick-desk', 'Desk Break Stretch', [
    ['neck-rolls', 30], ['chest-opener', 30], ['arm-circles', 30], ['quad-stretch', 30], ['hip-circles', 30],
  ], 10, 'Undo hours of sitting in 4 minutes.'),
  w('quick-hiit', '10-Min HIIT', [
    ['jumping-jacks', 40], ['high-knees', 30], ['half-burpees', 10], ['mountain-climbers', 30], ['jump-squats', 12],
    ['skaters', 30], ['plank-jacks', 30], ['burpees', 6],
  ], 20, 'Maximum effort, minimum time.'),
  w('quick-sleep', 'Bedtime Wind-down', [
    ['cat-cow', 40], ['child-pose', 45], ['figure-four', 30], ['spinal-twist', 30], ['hamstring-stretch', 30],
  ], 10, 'Gentle stretches to relax before sleep.'),
];

export const PROGRAM_MAP: Record<string, Program> = Object.fromEntries(PROGRAMS.map((p) => [p.id, p]));
export const QUICK_MAP: Record<string, Workout> = Object.fromEntries(QUICK_WORKOUTS.map((q) => [q.id, q]));
