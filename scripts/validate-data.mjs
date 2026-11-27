// Checks the built-in exercise and workout data for mistakes.
// Run: npm run validate-data   (Node 22.18+ strips TypeScript types natively)
import { EXERCISES, EXERCISE_MAP } from '../src/data/exercises.ts';
import { PROGRAMS, QUICK_WORKOUTS } from '../src/data/programs.ts';
import { readFileSync, existsSync } from 'node:fs';
import { MUSCLE_INFO, BODY_LABEL } from '../src/data/muscles.ts';
import { planWorkout, totalSessions } from '../src/lib/planGenerator.ts';
import { estimateMinutes } from '../src/lib/workout.ts';

const errors = [];
const ids = new Set();
for (const e of EXERCISES) {
  if (ids.has(e.id)) errors.push(`Duplicate exercise id: ${e.id}`);
  ids.add(e.id);
  if (e.mode === 'time' && !e.defaultSeconds) errors.push(`${e.id}: timed exercise without defaultSeconds`);
  if (e.mode === 'reps' && !e.defaultReps) errors.push(`${e.id}: rep exercise without defaultReps`);
  if (!e.steps?.length) errors.push(`${e.id}: no steps`);
  if (!(e.met > 0)) errors.push(`${e.id}: missing MET`);
}

const checkWorkout = (w, where) => {
  if (!w.items.length) errors.push(`${where}: empty workout`);
  for (const it of w.items) {
    if (!EXERCISE_MAP[it.exerciseId]) errors.push(`${where}: unknown exercise "${it.exerciseId}"`);
    if (!(it.sets >= 1)) errors.push(`${where}: invalid sets for ${it.exerciseId}`);
  }
};

for (const p of PROGRAMS) {
  if (p.days.length !== p.weeks * p.daysPerWeek) errors.push(`${p.id}: day count mismatch`);
  p.days.forEach((d) => checkWorkout(d, `${p.id}/${d.id}`));
  // A subtitle must never promise "no equipment" (equipment is computed from the moves).
  if (/no equipment/i.test(p.subtitle)) errors.push(`${p.id}: do not hard-code "no equipment" in subtitle`);
}
QUICK_WORKOUTS.forEach((w) => checkWorkout(w, `quick/${w.id}`));

// Every exercise needs muscle data for the body map, using known body regions.
for (const e of EXERCISES) {
  const info = MUSCLE_INFO[e.id];
  if (!info) { errors.push(`${e.id}: no muscle info in muscles.ts`); continue; }
  if (!info.primary.length) errors.push(`${e.id}: no primary muscles`);
  for (const s of [...info.primary, ...info.secondary]) if (!BODY_LABEL[s]) errors.push(`${e.id}: unknown body region "${s}"`);
}
for (const id of Object.keys(MUSCLE_INFO)) if (!EXERCISE_MAP[id]) errors.push(`muscles.ts: unknown exercise "${id}"`);

// Demo photos listed in exerciseMedia.ts must exist and belong to real exercises.
const media = readFileSync(new URL('../src/data/exerciseMedia.ts', import.meta.url), 'utf8');
let demos = 0;
for (const [, id, f0, f1] of media.matchAll(/'([a-z0-9-]+)': \[require\('([^']+)'\), require\('([^']+)'\)\]/g)) {
  demos++;
  if (!EXERCISE_MAP[id]) errors.push(`exerciseMedia.ts: unknown exercise "${id}"`);
  for (const f of [f0, f1]) if (!existsSync(new URL(f.replace('../../', '../'), import.meta.url))) errors.push(`exerciseMedia.ts: missing file ${f}`);
}

// Personal plans: every combination must give valid workouts of about the chosen length.
let plans = 0;
for (const goal of ['lose_weight', 'build_muscle', 'get_fit', 'flexibility'])
  for (const level of [1, 2, 3])
    for (const minutes of [10, 20, 30, 45])
      for (const useChair of [true, false])
        for (const focus of [['full'], ['abs'], ['arms', 'glutes'], ['chest', 'back', 'legs']]) {
          const plan = { id: `t-${goal}-${level}-${minutes}`, createdAt: 0, length: 90, daysPerWeek: 4, minutes, focus, useChair, goal, level, completed: [], intensity: 1 };
          plans++;
          for (const s of [0, 1, 2, 3, 13, 25, Math.min(50, totalSessions(plan) - 1)]) {
            const w = planWorkout(plan, s);
            const where = `plan ${goal}/L${level}/${minutes}min/${focus.join('+')}/session ${s}`;
            checkWorkout(w, where);
            if (new Set(w.items.map((i) => i.exerciseId)).size !== w.items.length) errors.push(`${where}: repeated exercise`);
            if (!useChair && w.items.some((i) => ['chair', 'wall'].includes(EXERCISE_MAP[i.exerciseId]?.equipment))) errors.push(`${where}: uses chair/wall`);
            const mins = estimateMinutes(w);
            if (mins < minutes * 0.5 || mins > minutes * 1.9) errors.push(`${where}: ~${mins} min for a ${minutes} min plan`);
          }
        }

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✔ ${EXERCISES.length} exercises (${demos} with demo photos), ${PROGRAMS.length} programs, ${QUICK_WORKOUTS.length} quick workouts, ${plans} plan setups look good.`);
