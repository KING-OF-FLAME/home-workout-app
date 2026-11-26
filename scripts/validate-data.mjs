// Checks the built-in exercise and workout data for mistakes.
// Run: npm run validate-data   (Node 22.18+ strips TypeScript types natively)
import { EXERCISES, EXERCISE_MAP } from '../src/data/exercises.ts';
import { PROGRAMS, QUICK_WORKOUTS } from '../src/data/programs.ts';

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

if (errors.length) {
  console.error(`✖ ${errors.length} problem(s):\n` + errors.map((e) => '  - ' + e).join('\n'));
  process.exit(1);
}
console.log(`✔ ${EXERCISES.length} exercises, ${PROGRAMS.length} programs, ${QUICK_WORKOUTS.length} quick workouts look good.`);
