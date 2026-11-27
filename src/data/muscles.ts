import type { Exercise, MuscleGroup } from './types';

/** Body regions drawn on the body map (react-native-body-highlighter slugs). */
export type BodySlug =
  | 'abs'
  | 'adductors'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'lower-back'
  | 'neck'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back';

export const BODY_LABEL: Record<BodySlug, string> = {
  abs: 'Abs',
  adductors: 'Inner thighs',
  biceps: 'Biceps',
  calves: 'Calves',
  chest: 'Chest',
  deltoids: 'Shoulders',
  forearm: 'Forearms',
  gluteal: 'Glutes',
  hamstring: 'Hamstrings',
  'lower-back': 'Lower back',
  neck: 'Neck',
  obliques: 'Obliques',
  quadriceps: 'Quads',
  tibialis: 'Shins',
  trapezius: 'Traps',
  triceps: 'Triceps',
  'upper-back': 'Upper back',
};

/** What getting stronger in each region does for you. Shown on the body map. */
export const BODY_BENEFIT: Record<BodySlug, string> = {
  abs: 'A stronger core protects your back and improves posture.',
  adductors: 'Steadier knees and hips when you walk, run or change direction.',
  biceps: 'Easier lifting and carrying in daily life.',
  calves: 'Better balance, ankle stability and a springier stride.',
  chest: 'Pushing strength for daily tasks and a fuller upper body.',
  deltoids: 'Healthier shoulders and easier overhead reaching.',
  forearm: 'A stronger grip for carrying and holding.',
  gluteal: 'Powerful hips, less knee and back pain, better posture.',
  hamstring: 'Faster running and fewer pulled muscles.',
  'lower-back': 'Less back pain and a safer way to bend and lift.',
  neck: 'Less stiffness from screens and long sitting.',
  obliques: 'Rotational strength and a tighter waist.',
  quadriceps: 'Strong legs for stairs, standing up and jumping.',
  tibialis: 'Healthier shins and ankles when you walk and run.',
  trapezius: 'Better posture and less neck and shoulder tension.',
  triceps: 'Stronger pushing and firmer upper arms.',
  'upper-back': 'Upright posture and balanced shoulders.',
};

interface MuscleInfo {
  primary: BodySlug[];
  secondary: BodySlug[];
  mistakes: string[];
}

const m = (primary: BodySlug[], secondary: BodySlug[], ...mistakes: string[]): MuscleInfo => ({ primary, secondary, mistakes });

/** Muscles worked and common mistakes for every built-in exercise. */
export const MUSCLE_INFO: Record<string, MuscleInfo> = {
  'jumping-jacks': m(['calves', 'deltoids'], ['quadriceps', 'gluteal', 'adductors'], 'Landing flat-footed and heavy.', 'Bending the arms so they never reach overhead.'),
  'march-in-place': m(['quadriceps'], ['calves', 'abs'], 'Leaning back as the knee comes up.', 'Letting the pace drop too slow to raise your heart rate.'),
  'high-knees': m(['quadriceps', 'abs'], ['calves', 'hamstring'], 'Knees stopping below hip height.', 'Leaning back instead of staying tall.'),
  'butt-kicks': m(['hamstring'], ['calves', 'quadriceps'], 'Knees drifting forward.', 'Landing on the heels.'),
  skaters: m(['gluteal', 'quadriceps'], ['adductors', 'calves'], 'Landing with a stiff, locked knee.', 'Rushing so the landing is wobbly.'),
  burpees: m(['quadriceps', 'chest', 'deltoids'], ['abs', 'triceps', 'gluteal', 'calves'], 'Letting the hips sag in the plank.', 'Landing the jump with stiff legs.'),
  'half-burpees': m(['quadriceps', 'abs'], ['chest', 'deltoids', 'gluteal'], 'Rounding the back when you reach the floor.', 'Sagging hips in the plank.'),
  'mountain-climbers': m(['abs', 'deltoids'], ['quadriceps', 'chest', 'triceps'], 'Bouncing the hips high in the air.', 'Hands drifting in front of the shoulders.'),
  'jump-squats': m(['quadriceps', 'gluteal'], ['calves', 'hamstring'], 'Knees caving in on landing.', 'Landing loud and stiff instead of soft.'),
  'shadow-boxing': m(['deltoids'], ['triceps', 'obliques', 'calves'], 'Dropping the guard between punches.', 'Punching only with the arm, no hip turn.'),

  'push-ups': m(['chest', 'triceps'], ['deltoids', 'abs'], 'Hips sagging or piking up.', 'Elbows flaring straight out to the sides.'),
  'knee-push-ups': m(['chest', 'triceps'], ['deltoids', 'abs'], 'Bending at the hips instead of keeping a straight line from knees.', 'Only going half way down.'),
  'incline-push-ups': m(['chest', 'triceps'], ['deltoids', 'abs'], 'Using a chair that can slide.', 'Letting the head drop towards the chair first.'),
  'wide-push-ups': m(['chest'], ['deltoids', 'triceps', 'abs'], 'Hands so wide the shoulders hurt.', 'Hips sagging.'),
  'diamond-push-ups': m(['triceps'], ['chest', 'deltoids'], 'Elbows flaring out wide.', 'Shoulders shrugging up to the ears.'),
  'decline-push-ups': m(['chest', 'deltoids'], ['triceps', 'abs'], 'Hips piking up.', 'Placing feet on something unstable.'),
  'wall-push-ups': m(['chest'], ['triceps', 'deltoids'], 'Standing too close to the wall.', 'Moving only the head instead of the whole body.'),
  'chair-dips': m(['triceps'], ['deltoids', 'chest'], 'Shoulders rolling forward and up.', 'Going so deep that the shoulders hurt.'),
  'floor-dips': m(['triceps'], ['deltoids'], 'Fingers pointing away from you.', 'Using the legs to push up.'),
  'pike-push-ups': m(['deltoids'], ['triceps', 'trapezius'], 'Hips dropping so it turns into a normal push-up.', 'Head going in front of the hands.'),
  'arm-circles': m(['deltoids'], ['trapezius'], 'Shrugging the shoulders.', 'Making the circles too fast and sloppy.'),
  'plank-shoulder-taps': m(['abs', 'deltoids'], ['obliques', 'triceps'], 'Hips rocking side to side.', 'Feet too close together.'),
  inchworms: m(['hamstring', 'deltoids'], ['abs', 'chest'], 'Walking the hands out so far the back sags.', 'Bending the knees a lot to cheat the stretch.'),

  superman: m(['lower-back', 'gluteal'], ['upper-back', 'hamstring'], 'Cranking the neck up to look forward.', 'Swinging up fast instead of lifting with control.'),
  'reverse-snow-angels': m(['upper-back', 'trapezius'], ['deltoids', 'lower-back'], 'Letting the arms touch the floor.', 'Lifting the head.'),
  'bird-dog': m(['lower-back', 'abs'], ['gluteal', 'deltoids'], 'Twisting the hips as the leg lifts.', 'Arching the lower back.'),
  'doorway-rows': m(['upper-back', 'biceps'], ['trapezius', 'forearm'], 'Using a door that is not fully closed and locked.', 'Pulling with the arms only, no shoulder squeeze.'),
  'cat-cow': m(['lower-back', 'upper-back'], ['abs', 'neck'], 'Moving too fast to feel each part of the spine.', 'Holding the breath.'),

  plank: m(['abs'], ['deltoids', 'gluteal', 'obliques'], 'Hips sagging towards the floor.', 'Hips pushed up high like a tent.'),
  'side-plank': m(['obliques'], ['deltoids', 'gluteal', 'abs'], 'Hips dropping down.', 'Elbow not under the shoulder.'),
  crunches: m(['abs'], ['obliques'], 'Pulling on the neck with the hands.', 'Swinging up with momentum.'),
  'bicycle-crunches': m(['abs', 'obliques'], [], 'Rushing so the shoulders never turn.', 'Pulling on the head.'),
  'leg-raises': m(['abs'], ['quadriceps'], 'Lower back arching off the floor.', 'Dropping the legs fast instead of lowering slowly.'),
  'russian-twists': m(['obliques'], ['abs'], 'Rounding the back.', 'Moving only the arms, not the chest.'),
  'dead-bug': m(['abs'], ['obliques', 'deltoids'], 'Lower back lifting off the floor.', 'Moving the same-side arm and leg.'),
  'flutter-kicks': m(['abs'], ['quadriceps'], 'Lower back arching.', 'Kicking from the knees instead of the hips.'),
  'heel-taps': m(['obliques'], ['abs'], 'Neck straining forward.', 'Letting the shoulders drop to the floor between taps.'),
  'v-ups': m(['abs'], ['quadriceps', 'obliques'], 'Swinging the arms to throw yourself up.', 'Crashing back down.'),
  'hollow-hold': m(['abs'], ['quadriceps', 'obliques'], 'Lower back lifting off the floor.', 'Holding the breath.'),
  'plank-jacks': m(['abs', 'deltoids'], ['adductors', 'calves'], 'Hips bouncing up and down.', 'Hands not under the shoulders.'),

  squats: m(['quadriceps', 'gluteal'], ['hamstring', 'calves', 'lower-back'], 'Knees caving inwards.', 'Heels lifting off the floor.'),
  'sumo-squats': m(['adductors', 'gluteal'], ['quadriceps', 'hamstring'], 'Knees falling inside the toes.', 'Leaning the chest forward.'),
  'chair-squats': m(['quadriceps', 'gluteal'], ['hamstring'], 'Dropping onto the chair instead of tapping it.', 'Using a chair that rolls or slides.'),
  lunges: m(['quadriceps', 'gluteal'], ['hamstring', 'calves', 'adductors'], 'Front knee caving inwards.', 'Steps so short the front heel lifts.'),
  'reverse-lunges': m(['quadriceps', 'gluteal'], ['hamstring', 'adductors'], 'Leaning the chest forward.', 'Slamming the back knee into the floor.'),
  'side-lunges': m(['adductors', 'gluteal'], ['quadriceps', 'hamstring'], 'Bending knee going past the toes.', 'Rounding the back.'),
  'bulgarian-split-squats': m(['quadriceps', 'gluteal'], ['hamstring', 'adductors'], 'Front foot too close to the chair.', 'Pushing up with the back leg.'),
  'glute-bridge': m(['gluteal'], ['hamstring', 'lower-back'], 'Arching the lower back at the top.', 'Pushing through the toes instead of the heels.'),
  'single-leg-bridge': m(['gluteal'], ['hamstring', 'abs'], 'Hips tilting to one side.', 'Pushing through the toes.'),
  'donkey-kicks': m(['gluteal'], ['hamstring', 'abs'], 'Arching the lower back.', 'Swinging the leg instead of squeezing.'),
  'fire-hydrants': m(['gluteal'], ['abs'], 'Leaning the body away from the lifting leg.', 'Lifting the leg too fast.'),
  'wall-sit': m(['quadriceps'], ['gluteal', 'calves'], 'Thighs above parallel so it is too easy.', 'Pressing the hands on the thighs.'),
  'calf-raises': m(['calves'], ['tibialis'], 'Bouncing at the bottom.', 'Rolling out onto the little toes.'),
  'step-ups': m(['quadriceps', 'gluteal'], ['hamstring', 'calves'], 'Pushing off the back foot.', 'Using a step that can slide.'),
  'side-leg-raises': m(['gluteal'], ['adductors', 'obliques'], 'Rolling the hips backwards.', 'Swinging the leg high and fast.'),

  'hip-circles': m(['gluteal', 'adductors'], ['lower-back', 'obliques'], 'Moving the shoulders instead of the hips.', 'Making the circles too small.'),
  'worlds-greatest-stretch': m(['hamstring', 'gluteal'], ['upper-back', 'adductors', 'quadriceps'], 'Rushing through the rotation.', 'Back knee drifting out to the side.'),
  'child-pose': m(['lower-back'], ['upper-back', 'gluteal', 'deltoids'], 'Forcing the hips down if the knees hurt.', 'Holding the breath.'),
  cobra: m(['abs', 'lower-back'], ['chest'], 'Shrugging the shoulders up.', 'Pushing up so high the lower back pinches.'),
  'hamstring-stretch': m(['hamstring'], ['lower-back', 'calves'], 'Rounding the back to reach further.', 'Bouncing into the stretch.'),
  'quad-stretch': m(['quadriceps'], ['abs'], 'Arching the lower back.', 'Knee drifting forward.'),
  'figure-four': m(['gluteal'], ['lower-back', 'hamstring'], 'Lifting the head and straining the neck.', 'Pulling so hard it pinches the knee.'),
  'chest-opener': m(['chest', 'deltoids'], ['biceps'], 'Arching the lower back.', 'Shrugging the shoulders.'),
  'neck-rolls': m(['neck', 'trapezius'], [], 'Rolling the head fast.', 'Dropping the head all the way back.'),
  'spinal-twist': m(['lower-back', 'obliques'], ['gluteal', 'chest'], 'Forcing the knee to the floor.', 'Lifting the opposite shoulder.'),
};

const GROUP_FALLBACK: Record<MuscleGroup, BodySlug[]> = {
  chest: ['chest'],
  back: ['upper-back'],
  shoulders: ['deltoids'],
  arms: ['triceps'],
  core: ['abs'],
  legs: ['quadriceps'],
  glutes: ['gluteal'],
  fullbody: ['quadriceps', 'chest', 'abs'],
  cardio: ['calves', 'quadriceps'],
  mobility: ['lower-back'],
};

export function muscleInfo(ex: Exercise): MuscleInfo {
  return MUSCLE_INFO[ex.id] ?? { primary: GROUP_FALLBACK[ex.group], secondary: [], mistakes: [] };
}

const BREATHING: Record<MuscleGroup, string> = {
  chest: 'Breathe in as you lower, breathe out as you push up.',
  back: 'Breathe out as you lift or pull, breathe in as you return.',
  shoulders: 'Breathe out on the push or lift, in as you come back.',
  arms: 'Breathe in on the way down, out as you push up.',
  core: 'Breathe out as you curl or brace, keep breathing steadily in holds.',
  legs: 'Breathe in as you lower, breathe out as you stand up.',
  glutes: 'Breathe out as you squeeze and lift, in as you lower.',
  fullbody: 'Find a rhythm: breathe out on the hardest part of each rep.',
  cardio: 'Breathe steadily through the nose and mouth. Never hold your breath.',
  mobility: 'Slow, deep breaths. Relax a little deeper on every breath out.',
};

export function breathingFor(ex: Exercise): string {
  return ex.mode === 'time' && ex.group === 'core' ? 'Keep breathing slowly and steadily the whole time. Never hold your breath.' : BREATHING[ex.group];
}

/** Count how hard each region was worked across a list of exercises (primary = 2, secondary = 1). */
export function muscleLoad(exerciseIds: { id: string; sets?: number }[]): Map<BodySlug, number> {
  const load = new Map<BodySlug, number>();
  for (const { id, sets = 1 } of exerciseIds) {
    const info = MUSCLE_INFO[id];
    if (!info) continue;
    for (const s of info.primary) load.set(s, (load.get(s) ?? 0) + 2 * sets);
    for (const s of info.secondary) load.set(s, (load.get(s) ?? 0) + sets);
  }
  return load;
}

/** Turn a load map into 1..3 intensity levels for the body map. */
export function loadToIntensity(load: Map<BodySlug, number>): { slug: BodySlug; intensity: number }[] {
  const max = Math.max(1, ...load.values());
  return [...load.entries()].map(([slug, v]) => ({ slug, intensity: v / max > 0.66 ? 3 : v / max > 0.33 ? 2 : 1 }));
}
