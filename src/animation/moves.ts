import type { Frame, Pose, PointName, View } from './skeleton';
import { GROUND } from './skeleton';

export type PropKind = 'chair' | 'wall' | 'mat' | 'step' | 'door';
export interface Prop {
  kind: PropKind;
  x: number;
  /** Chair: which side the backrest is on. */
  back?: 'left' | 'right';
}

export interface Move {
  view: View;
  /** Lying on the back: the front of the body faces up (side view). */
  faceUp?: boolean;
  props?: Prop[];
  frames: Frame[];
}

/** Heights above the floor, in skeleton units (about 1.75 cm each). */
export const SEAT = 26;
export const STEP = 14;

const STAND: Pose = {
  torso: 180, head: 180, uaN: 5, faN: 5, uaF: -5, faF: -5,
  thN: 0, shN: 0, thF: 0, shF: 0, ftN: 90, ftF: 90, spine: 0,
};
const P = (o: Partial<Pose> = {}): Pose => ({ ...STAND, ...o });
const at = (point: PointName, x: number) => ({ point, at: x });
const F = (pose: Pose, x: Frame['x'], extra: Omit<Frame, 'pose' | 'x'> = {}): Frame => ({ pose, x, ...extra });
const mirror = (p: Pose): Pose => ({ ...p, uaN: p.uaF, faN: p.faF, uaF: p.uaN, faF: p.faN, thN: p.thF, shN: p.shF, thF: p.thN, shF: p.shN, ftN: p.ftF, ftF: p.ftN });

// ---------- Shared poses (side view, facing right) ----------
const SQUAT = P({ torso: 145, head: 160, thN: 80, shN: -28, thF: 80, shF: -28, uaN: 90, faN: 90, uaF: 85, faF: 85 });
const PLANK = P({ torso: 98, head: 102, uaN: 0, faN: 0, uaF: 0, faF: 0, thN: -82, shN: -82, thF: -82, shF: -82, ftN: 10, ftF: 10 });
const PUSH_DOWN = { ...PLANK, uaN: -95, faN: 0, uaF: -95, faF: 0 };
const FOREARM_PLANK = { ...PLANK, faN: 90, faF: 90 };
const FOLD = P({ torso: 25, head: 15, uaN: 15, faN: 15, uaF: 15, faF: 15 });
const QUAD = P({ torso: 90, head: 100, uaN: 0, faN: 0, uaF: 0, faF: 0, thN: 0, shN: -90, thF: 0, shF: -90, ftN: -90, ftF: -90 });
const SUPINE_KNEES = P({ torso: 90, head: 90, uaN: -90, faN: -90, uaF: -90, faF: -90, thN: -145, shN: -25, thF: -145, shF: -25, ftN: -90, ftF: -90 });
const SUPINE = P({ torso: 90, head: 90, uaN: -90, faN: -90, uaF: -90, faF: -90, thN: -90, shN: -90, thF: -90, shF: -90, ftN: -180, ftF: -180 });
const PRONE = P({ torso: 90, head: 92, uaN: 90, faN: 90, uaF: 90, faF: 90, thN: -90, shN: -90, thF: -90, shF: -90, ftN: -90, ftF: -90 });
const SIT_LONG = P({ torso: 180, head: 180, uaN: 10, faN: 30, uaF: 10, faF: 30, thN: 90, shN: 90, thF: 90, shF: 90, ftN: 180, ftF: 180 });
const LUNGE = P({ thN: 85, shN: -5, thF: -15, shF: -80, ftF: 20, uaN: 0, faN: 10, uaF: 0, faF: 10 });

const pushUps = (top: Pose, down: Pose, level: Frame['level'], x: Frame['x'], props?: Prop[]): Move => ({
  view: 'side',
  props,
  frames: [
    F(top, x, { level, cue: 'Straight body, arms long', ms: 700, hold: 200 }),
    F(down, x, { level, cue: 'Lower your chest slowly', ms: 900, hold: 150 }),
  ],
});

const breathe = (pose: Pose, x: Frame['x'], cue: string, extra: Omit<Frame, 'pose' | 'x'> = {}, d: Partial<Pose> = { torso: 1 }): Frame[] => {
  const p2 = { ...pose };
  for (const k of Object.keys(d) as (keyof Pose)[]) p2[k] = pose[k] + (d[k] ?? 0);
  return [F(pose, x, { ...extra, cue, ms: 1200, hold: 300 }), F(p2, x, { ...extra, cue, ms: 1200, hold: 300 })];
};

/** Animated demo for every built-in exercise, keyed by exercise id. */
export const MOVES: Record<string, Move> = {
  // ---------- Warm-up & cardio ----------
  'jumping-jacks': {
    view: 'front',
    frames: [
      F(P({ uaN: 10, faN: 8, uaF: 10, faF: 8, thN: 3, shN: 3, thF: 3, shF: 3, ftN: 80, ftF: 80 }), at('hip', 100), { cue: 'Feet together', ms: 360, hold: 40 }),
      F(P({ uaN: 160, faN: 172, uaF: 160, faF: 172, thN: 20, shN: 20, thF: 20, shF: 20, ftN: 80, ftF: 80 }), at('hip', 100), { cue: 'Jump out, arms up', ms: 360, hold: 40 }),
    ],
  },
  'march-in-place': {
    view: 'side',
    frames: [
      F(P({ thN: 80, shN: 0, ftN: 70, uaN: -35, faN: -15, uaF: 35, faF: 70 }), at('hip', 100), { cue: 'Knee up to hip height', ms: 380, hold: 60 }),
      F(P(), at('hip', 100), { ms: 300, hold: 0 }),
      F(P({ thF: 80, shF: 0, ftF: 70, uaF: -35, faF: -15, uaN: 35, faN: 70 }), at('hip', 100), { cue: 'Swing the opposite arm', ms: 380, hold: 60 }),
      F(P(), at('hip', 100), { ms: 300, hold: 0 }),
    ],
  },
  'high-knees': {
    view: 'side',
    frames: [
      F(P({ thN: 100, shN: 5, ftN: 60, uaN: -50, faN: -10, uaF: 60, faF: 120, torso: 178 }), at('hip', 100), { cue: 'Drive the knee up fast', ms: 230, hold: 20, air: 3 }),
      F(P({ thF: 100, shF: 5, ftF: 60, uaF: -50, faF: -10, uaN: 60, faN: 120, torso: 178 }), at('hip', 100), { cue: 'Stay on the balls of your feet', ms: 230, hold: 20, air: 3 }),
    ],
  },
  'butt-kicks': {
    view: 'side',
    frames: [
      F(P({ thN: -8, shN: -165, ftN: -110, uaN: 35, faN: 100, uaF: -30, faF: 20 }), at('hip', 100), { cue: 'Heel to your glutes', ms: 240, hold: 30, air: 2 }),
      F(P({ thF: -8, shF: -165, ftF: -110, uaF: 35, faF: 100, uaN: -30, faN: 20 }), at('hip', 100), { cue: 'Knees point down', ms: 240, hold: 30, air: 2 }),
    ],
  },
  skaters: {
    view: 'front',
    frames: [
      F(P({ torso: 172, thN: 18, shN: -8, thF: -25, shF: -40, uaN: -40, faN: -30, uaF: 50, faF: 70 }), at('hip', 80), { cue: 'Hop sideways, land softly', ms: 450, hold: 120 }),
      F(P({ torso: 188, thF: 18, shF: -8, thN: -25, shN: -40, uaF: -40, faF: -30, uaN: 50, faN: 70 }), at('hip', 120), { cue: 'Sweep the other leg behind', ms: 450, hold: 120 }),
    ],
  },
  burpees: {
    view: 'side',
    frames: [
      F(P(), at('hip', 100), { cue: 'Stand tall', ms: 500, hold: 100 }),
      F(P({ torso: 115, head: 125, thN: 95, shN: -35, thF: 95, shF: -35, uaN: 15, faN: 15, uaF: 15, faF: 15 }), at('handN', 128), { cue: 'Squat, hands down', ms: 500, hold: 50 }),
      F(P({ torso: 110, head: 115, thN: -25, shN: -60, thF: -25, shF: -60, uaN: 5, faN: 5, uaF: 5, faF: 5, ftN: -60, ftF: -60 }), at('handN', 128), { level: ['handN', 'toeN', 6, 'torso'], cue: 'Jump back to plank', ms: 200, hold: 0 }),
      F(PLANK, at('handN', 128), { level: ['handN', 'toeN'], cue: 'Jump back to plank', ms: 250, hold: 150 }),
      F(P({ torso: 110, head: 115, thN: -25, shN: -60, thF: -25, shF: -60, uaN: 5, faN: 5, uaF: 5, faF: 5, ftN: -60, ftF: -60 }), at('handN', 128), { level: ['handN', 'toeN', 6, 'torso'], cue: 'Feet back in', ms: 220, hold: 0 }),
      F(P({ torso: 115, head: 125, thN: 95, shN: -35, thF: 95, shF: -35, uaN: 15, faN: 15, uaF: 15, faF: 15 }), at('handN', 128), { cue: 'Feet back in', ms: 400, hold: 50 }),
      F(P({ uaN: 170, faN: 175, uaF: 170, faF: 175, ftN: 40, ftF: 40 }), at('hip', 104), { air: 12, cue: 'Jump, arms up', ms: 400, hold: 50 }),
    ],
  },
  'half-burpees': {
    view: 'side',
    frames: [
      F(P(), at('hip', 100), { cue: 'Stand tall', ms: 500, hold: 100 }),
      F(P({ torso: 115, head: 125, thN: 95, shN: -35, thF: 95, shF: -35, uaN: 15, faN: 15, uaF: 15, faF: 15 }), at('handN', 128), { cue: 'Squat, hands down', ms: 500, hold: 50 }),
      F(P({ torso: 110, head: 115, thN: -25, shN: -60, thF: -25, shF: -60, uaN: 5, faN: 5, uaF: 5, faF: 5, ftN: -60, ftF: -60 }), at('handN', 128), { level: ['handN', 'toeN', 6, 'torso'], cue: 'Step back to plank', ms: 250, hold: 0 }),
      F(PLANK, at('handN', 128), { level: ['handN', 'toeN'], cue: 'Step back to plank', ms: 300, hold: 200 }),
      F(P({ torso: 110, head: 115, thN: -25, shN: -60, thF: -25, shF: -60, uaN: 5, faN: 5, uaF: 5, faF: 5, ftN: -60, ftF: -60 }), at('handN', 128), { level: ['handN', 'toeN', 6, 'torso'], cue: 'Feet back in', ms: 220, hold: 0 }),
      F(P({ torso: 115, head: 125, thN: 95, shN: -35, thF: 95, shF: -35, uaN: 15, faN: 15, uaF: 15, faF: 15 }), at('handN', 128), { cue: 'Feet back in', ms: 500, hold: 50 }),
    ],
  },
  'mountain-climbers': {
    view: 'side',
    frames: [
      F({ ...PLANK, thN: 70, shN: -80, ftN: -20 }, at('handN', 140), { level: ['handN', 'toeF'], cue: 'Knee to chest', ms: 200, hold: 20 }),
      // Both feet hop off the floor while the legs swap.
      F({ ...PLANK, thN: 0, shN: -95, thF: 0, shF: -95, ftN: -80, ftF: -80 }, at('handN', 140), { level: ['handN', 'kneeN', 4], cue: 'Switch fast, hips low', ms: 120, hold: 0 }),
      F({ ...PLANK, thF: 70, shF: -80, ftF: -20 }, at('handN', 140), { level: ['handN', 'toeN'], cue: 'Switch fast, hips low', ms: 120, hold: 20 }),
      F({ ...PLANK, thN: 0, shN: -95, thF: 0, shF: -95, ftN: -80, ftF: -80 }, at('handN', 140), { level: ['handN', 'kneeN', 4], cue: 'Knee to chest', ms: 120, hold: 0 }),
    ],
  },
  'jump-squats': {
    view: 'side',
    frames: [
      F({ ...SQUAT, uaN: -35, faN: -20, uaF: -35, faF: -20 }, at('ankleN', 100), { cue: 'Squat down', ms: 500, hold: 80 }),
      F(P({ uaN: 40, faN: 50, uaF: 40, faF: 50, ftN: 35, ftF: 35 }), at('ankleN', 100), { air: 14, cue: 'Explode up', ms: 350, hold: 40 }),
    ],
  },
  'shadow-boxing': {
    view: 'side',
    frames: [
      F(P({ torso: 176, uaN: 25, faN: 165, uaF: 20, faF: 160, thN: 10, thF: -12, shF: -5 }), at('hip', 95), { cue: 'Fists up by your chin', ms: 220, hold: 80 }),
      F(P({ torso: 174, uaN: 90, faN: 90, uaF: 20, faF: 160, thN: 10, thF: -12, shF: -5 }), at('hip', 97), { cue: 'Jab', ms: 180, hold: 60 }),
      F(P({ torso: 176, uaN: 25, faN: 165, uaF: 20, faF: 160, thN: 10, thF: -12, shF: -5 }), at('hip', 95), { ms: 200, hold: 40 }),
      F(P({ torso: 170, uaN: 25, faN: 165, uaF: 90, faF: 90, thN: 10, thF: -12, shF: -5 }), at('hip', 99), { cue: 'Cross, turn the hips', ms: 180, hold: 60 }),
    ],
  },

  // ---------- Chest & arms ----------
  'push-ups': pushUps(PLANK, PUSH_DOWN, ['handN', 'toeN'], at('handN', 145)),
  'knee-push-ups': pushUps(
    P({ ...PLANK, torso: 110, head: 114, thN: -70, shN: -92, thF: -70, shF: -92, ftN: -95, ftF: -95 }),
    P({ ...PLANK, torso: 110, head: 114, thN: -70, shN: -92, thF: -70, shF: -92, ftN: -95, ftF: -95, uaN: -95, uaF: -95 }),
    ['handN', 'kneeN', 0, 'upper'], at('handN', 140),
  ),
  'incline-push-ups': pushUps(
    { ...PLANK, torso: 125, head: 128 },
    { ...PUSH_DOWN, torso: 125, head: 128 },
    ['handN', 'toeN', SEAT], at('handN', 152), [{ kind: 'chair', x: 146, back: 'right' }],
  ),
  'wide-push-ups': pushUps(PLANK, { ...PUSH_DOWN, uaN: -105, uaF: -105 }, ['handN', 'toeN'], at('handN', 145)),
  'diamond-push-ups': pushUps(PLANK, { ...PUSH_DOWN, uaN: -70, uaF: -70 }, ['handN', 'toeN'], at('handN', 145)),
  'decline-push-ups': pushUps(
    { ...PLANK, torso: 80, head: 85 },
    { ...PUSH_DOWN, torso: 80, head: 85 },
    ['toeN', 'handN', SEAT], at('toeN', 50), [{ kind: 'chair', x: 30, back: 'left' }],
  ),
  'wall-push-ups': {
    view: 'side',
    props: [{ kind: 'wall', x: 160 }],
    frames: [
      F(P({ torso: 162, head: 165, thN: -18, shN: -18, thF: -18, shF: -18, uaN: 95, faN: 95, uaF: 95, faF: 95, ftN: 108, ftF: 108 }), at('handN', 159), { cue: 'Hands on the wall, body straight', ms: 700, hold: 200 }),
      F(P({ torso: 150, head: 152, thN: -30, shN: -30, thF: -30, shF: -30, uaN: 15, faN: 120, uaF: 15, faF: 120, ftN: 120, ftF: 120 }), at('handN', 159), { cue: 'Bend elbows, chest to the wall', ms: 800, hold: 150 }),
    ],
  },
  'chair-dips': {
    view: 'side',
    props: [{ kind: 'chair', x: 62, back: 'left' }],
    frames: [
      F(P({ torso: 180, uaN: -15, faN: -15, uaF: -15, faF: -15, thN: 60, shN: 20, thF: 60, shF: 20 }), at('handN', 89), { cue: 'Hands on the seat, arms straight', ms: 700, hold: 150 }),
      F(P({ torso: 180, uaN: -60, faN: 0, uaF: -60, faF: 0, thN: 82, shN: 40, thF: 82, shF: 40 }), at('handN', 89), { cue: 'Bend elbows straight back', ms: 900, hold: 150 }),
    ],
  },
  'floor-dips': {
    view: 'side',
    frames: [
      F(P({ torso: 190, head: 182, uaN: -12, faN: -12, uaF: -12, faF: -12, thN: 128, shN: 35, thF: 128, shF: 35 }), at('handN', 72), { cue: 'Hands behind, hips off the floor', ms: 700, hold: 150 }),
      F(P({ torso: 196, head: 186, uaN: -80, faN: -5, uaF: -80, faF: -5, thN: 120, shN: 30, thF: 120, shF: 30 }), at('handN', 72), { cue: 'Bend elbows, press back up', ms: 800, hold: 150 }),
    ],
  },
  'pike-push-ups': {
    view: 'side',
    frames: [
      F(P({ torso: 40, head: 30, uaN: 40, faN: 40, uaF: 40, faF: 40, thN: -40, shN: -40, thF: -40, shF: -40, ftN: 60, ftF: 60 }), at('handN', 140), { level: ['handN', 'toeN'], cue: 'Hips high, upside-down V', ms: 700, hold: 150 }),
      F(P({ torso: 40, head: 20, uaN: -60, faN: 20, uaF: -60, faF: 20, thN: -40, shN: -40, thF: -40, shF: -40, ftN: 60, ftF: 60 }), at('handN', 140), { level: ['handN', 'toeN'], cue: 'Lower your head to the floor', ms: 900, hold: 150 }),
    ],
  },
  'arm-circles': {
    view: 'front',
    frames: [
      F(P({ uaN: 82, faN: 82, uaF: 82, faF: 82 }), at('hip', 100), { cue: 'Arms out, small circles', ms: 220, hold: 0 }),
      F(P({ uaN: 92, faN: 92, uaF: 92, faF: 92 }), at('hip', 100), { ms: 220, hold: 0 }),
      F(P({ uaN: 100, faN: 100, uaF: 100, faF: 100 }), at('hip', 100), { ms: 220, hold: 0 }),
      F(P({ uaN: 90, faN: 90, uaF: 90, faF: 90 }), at('hip', 100), { ms: 220, hold: 0 }),
    ],
  },
  'plank-shoulder-taps': {
    view: 'side',
    frames: [
      F(PLANK, at('handF', 140), { level: ['handF', 'toeN'], cue: 'Wide feet, hips still', ms: 400, hold: 100 }),
      F({ ...PLANK, uaN: 60, faN: -90 }, at('handF', 140), { level: ['handF', 'toeN'], cue: 'Tap the opposite shoulder', ms: 400, hold: 150 }),
      F(PLANK, at('handF', 140), { level: ['handF', 'toeN'], ms: 400, hold: 100 }),
      F({ ...PLANK, uaF: 60, faF: -90 }, at('handN', 140), { level: ['handN', 'toeN'], cue: 'Switch hands', ms: 400, hold: 150 }),
    ],
  },
  inchworms: {
    view: 'side',
    frames: [
      F(P(), at('ankleN', 70), { cue: 'Stand tall', ms: 600, hold: 100 }),
      F(FOLD, at('ankleN', 70), { cue: 'Fold forward, hands to the floor', ms: 800, hold: 100 }),
      F(PLANK, at('toeN', 66), { level: ['handN', 'toeN'], cue: 'Walk your hands out to a plank', ms: 1100, hold: 250 }),
      F(FOLD, at('ankleN', 70), { cue: 'Walk them back', ms: 1100, hold: 100 }),
    ],
  },

  // ---------- Back ----------
  superman: {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(PRONE, at('hip', 100), { cue: 'Lie face down, arms forward', ms: 700, hold: 200 }),
      F(P({ ...PRONE, torso: 103, head: 108, uaN: 110, faN: 110, uaF: 110, faF: 110, thN: -102, shN: -102, thF: -102, shF: -102, ftN: -102, ftF: -102 }), at('hip', 100), { cue: 'Lift arms, chest and legs. Hold', ms: 800, hold: 900 }),
    ],
  },
  'reverse-snow-angels': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ ...PRONE, torso: 97, head: 100, uaN: -105, faN: -105, uaF: -105, faF: -105 }), at('hip', 100), { cue: 'Chest up, arms by your sides, off the floor', ms: 700, hold: 250 }),
      F(P({ ...PRONE, torso: 97, head: 100, uaN: -120, faN: 70, uaF: -120, faF: 70 }), at('hip', 100), { cue: 'Slide the hands up to your shoulders', ms: 900, hold: 250 }),
    ],
  },
  'bird-dog': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(QUAD, at('kneeN', 85), { level: ['handF', 'kneeN', 0, 'torso'], cue: 'Hands under shoulders, knees under hips', ms: 700, hold: 150 }),
      F({ ...QUAD, uaN: 92, faN: 92, thF: -90, shF: -90, ftF: -90 }, at('kneeN', 85), { level: ['handF', 'kneeN', 0, 'torso'], cue: 'Reach one arm and the opposite leg', ms: 900, hold: 600 }),
      F(QUAD, at('kneeN', 85), { level: ['handN', 'kneeF', 0, 'torso'], ms: 700, hold: 150 }),
      F({ ...QUAD, uaF: 92, faF: 92, thN: -90, shN: -90, ftN: -90 }, at('kneeF', 85), { level: ['handN', 'kneeF', 0, 'torso'], cue: 'Switch sides, hips level', ms: 900, hold: 600 }),
    ],
  },
  'doorway-rows': {
    view: 'side',
    props: [{ kind: 'door', x: 162 }],
    frames: [
      F(P({ torso: 205, head: 200, thN: 22, shN: 22, thF: 22, shF: 22, uaN: 75, faN: 75, uaF: 75, faF: 75 }), at('handN', 160), { cue: 'Lean back, arms straight', ms: 800, hold: 150 }),
      F(P({ torso: 192, head: 188, thN: 14, shN: 14, thF: 14, shF: 14, uaN: -20, faN: 80, uaF: -20, faF: 80 }), at('handN', 160), { cue: 'Pull your chest to your hands', ms: 800, hold: 300 }),
    ],
  },
  'cat-cow': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...QUAD, head: 55, spine: 7 }, at('kneeN', 85), { level: ['handF', 'kneeN', 0, 'torso'], cue: 'Round your back, chin in', ms: 1200, hold: 300 }),
      F({ ...QUAD, head: 125, spine: -6 }, at('kneeN', 85), { level: ['handF', 'kneeN', 0, 'torso'], cue: 'Drop your belly, look up', ms: 1200, hold: 300 }),
    ],
  },

  // ---------- Core ----------
  plank: { view: 'side', props: [{ kind: 'mat', x: 100 }], frames: breathe(FOREARM_PLANK, at('handN', 145), 'Hold a straight line, squeeze glutes', { level: ['handN', 'toeN'] }) },
  'side-plank': {
    view: 'front',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ torso: 104, head: 100, uaN: 0, faN: -90, uaF: 180, faF: 180, thN: -76, shN: -76, thF: -78, shF: -78, ftN: -90, ftF: -90 }), at('elbowN', 132), { cue: 'Elbow under shoulder, hips up', ms: 1100, hold: 700 }),
      F(P({ torso: 98, head: 96, uaN: 0, faN: -90, uaF: 180, faF: 180, thN: -82, shN: -82, thF: -84, shF: -84, ftN: -90, ftF: -90 }), at('elbowN', 132), { cue: 'Keep a straight line', ms: 1100, hold: 300 }),
    ],
  },
  crunches: {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, uaN: 150, faN: -60, uaF: 150, faF: -60 }, at('hip', 92), { cue: 'Lie back, knees bent', ms: 700, hold: 150 }),
      F({ ...SUPINE_KNEES, torso: 122, head: 128, uaN: 175, faN: -40, uaF: 175, faF: -40 }, at('hip', 92), { cue: 'Curl shoulders up, breathe out', ms: 700, hold: 250 }),
    ],
  },
  'bicycle-crunches': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ ...SUPINE, torso: 118, head: 125, uaN: 175, faN: -40, uaF: 175, faF: -40, thN: -200, shN: -95, thF: -78, shF: -78, ftN: -90 }), at('hip', 95), { cue: 'Elbow to the opposite knee', ms: 450, hold: 100 }),
      F(P({ ...SUPINE, torso: 118, head: 125, uaN: 175, faN: -40, uaF: 175, faF: -40, thF: -200, shF: -95, thN: -78, shN: -78, ftF: -90 }), at('hip', 95), { cue: 'Switch, like pedalling', ms: 450, hold: 100 }),
    ],
  },
  'leg-raises': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE, thN: -95, shN: -95, thF: -95, shF: -95 }, at('hip', 100), { cue: 'Legs straight, just above the floor', ms: 900, hold: 150 }),
      F({ ...SUPINE, thN: -178, shN: -178, thF: -178, shF: -178, ftN: -90, ftF: -90 }, at('hip', 100), { cue: 'Raise them up, lower slowly', ms: 1000, hold: 150 }),
    ],
  },
  'russian-twists': {
    view: 'front',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ torso: 172, head: 175, thN: 162, shN: 15, thF: 162, shF: 15, uaN: 25, faN: 60, uaF: -25, faF: 30 }), at('hip', 100), { cue: 'Lean back, hands to one side', ms: 550, hold: 150 }),
      F(P({ torso: 188, head: 185, thN: 162, shN: 15, thF: 162, shF: 15, uaF: 25, faF: 60, uaN: -25, faN: 30 }), at('hip', 100), { cue: 'Turn and touch the other side', ms: 550, hold: 150 }),
    ],
  },
  'dead-bug': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ ...SUPINE, uaN: 180, faN: 180, uaF: 180, faF: 180, thN: -180, shN: -90, thF: -180, shF: -90, ftN: -180, ftF: -180 }), at('hip', 100), { cue: 'Arms up, knees over hips', ms: 700, hold: 150 }),
      F(P({ ...SUPINE, uaN: 95, faN: 95, uaF: 180, faF: 180, thN: -180, shN: -90, thF: -85, shF: -85, ftN: -180, ftF: -180 }), at('hip', 100), { cue: 'Lower opposite arm and leg, back flat', ms: 900, hold: 200 }),
      F(P({ ...SUPINE, uaN: 180, faN: 180, uaF: 180, faF: 180, thN: -180, shN: -90, thF: -180, shF: -90, ftN: -180, ftF: -180 }), at('hip', 100), { ms: 700, hold: 150 }),
      F(P({ ...SUPINE, uaF: 95, faF: 95, uaN: 180, faN: 180, thF: -180, shF: -90, thN: -85, shN: -85, ftN: -180, ftF: -180 }), at('hip', 100), { cue: 'Switch sides', ms: 900, hold: 200 }),
    ],
  },
  'flutter-kicks': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE, torso: 94, head: 100, thN: -72, shN: -72, thF: -98, shF: -98 }, at('hip', 100), { cue: 'Small fast kicks, back flat', ms: 260, hold: 0 }),
      F({ ...SUPINE, torso: 94, head: 100, thF: -72, shF: -72, thN: -98, shN: -98 }, at('hip', 100), { ms: 260, hold: 0 }),
    ],
  },
  'heel-taps': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, torso: 104, head: 112, uaN: -110, faN: -110, uaF: -100, faF: -100 }, at('hip', 95), { cue: 'Shoulders up, reach for one heel', ms: 400, hold: 100 }),
      F({ ...SUPINE_KNEES, torso: 106, head: 112, uaN: -95, faN: -95, uaF: -112, faF: -112 }, at('hip', 95), { cue: 'Then the other heel', ms: 400, hold: 100 }),
    ],
  },
  'v-ups': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE, uaN: 92, faN: 92, uaF: 92, faF: 92 }, at('hip', 100), { cue: 'Lie long, arms overhead', ms: 700, hold: 150 }),
      F({ ...SUPINE, torso: 140, head: 140, uaN: 210, faN: 210, uaF: 210, faF: 210, thN: -135, shN: -135, thF: -135, shF: -135, ftN: -135, ftF: -135 }, at('hip', 100), { cue: 'Lift arms and legs to meet', ms: 700, hold: 200 }),
    ],
  },
  'hollow-hold': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: breathe({ ...SUPINE, torso: 102, head: 108, uaN: 100, faN: 100, uaF: 100, faF: 100, thN: -100, shN: -100, thF: -100, shF: -100, ftN: -100, ftF: -100 }, at('hip', 100), 'Low back pressed down, hold', {}, { torso: 2, thN: -2, thF: -2, shN: -2, shF: -2 }),
  },
  'plank-jacks': {
    view: 'side',
    frames: [
      F({ ...PLANK, thN: -84, thF: -84 }, at('handN', 145), { level: ['handN', 'toeN'], cue: 'Plank, feet together', ms: 300, hold: 40 }),
      F({ ...PLANK, thN: -76, shN: -78, thF: -90, shF: -88 }, at('handN', 145), { level: ['handN', 'toeN'], air: 2, cue: 'Jump feet wide and back', ms: 300, hold: 40 }),
    ],
  },

  // ---------- Legs & glutes ----------
  squats: {
    view: 'side',
    frames: [
      F(P(), at('ankleN', 100), { cue: 'Feet shoulder-width apart', ms: 800, hold: 150 }),
      F(SQUAT, at('ankleN', 100), { cue: 'Sit back, chest up, knees out', ms: 900, hold: 150 }),
    ],
  },
  'sumo-squats': {
    view: 'front',
    frames: [
      F(P({ thN: 18, shN: 18, thF: 18, shF: 18, ftN: 70, ftF: 70, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 100), { cue: 'Wide stance, toes out', ms: 800, hold: 150 }),
      F(P({ thN: 70, shN: 15, thF: 70, shF: 15, ftN: 70, ftF: 70, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 100), { cue: 'Sink down, knees over toes', ms: 900, hold: 200 }),
    ],
  },
  'chair-squats': {
    view: 'side',
    props: [{ kind: 'chair', x: 58, back: 'left' }],
    frames: [
      F(P(), at('ankleN', 108), { cue: 'Stand in front of the chair', ms: 800, hold: 150 }),
      F({ ...SQUAT, thN: 88, thF: 88, shN: -20, shF: -20 }, at('ankleN', 108), { cue: 'Tap the seat, then stand', ms: 900, hold: 150 }),
    ],
  },
  lunges: {
    view: 'side',
    frames: [
      F(P(), at('hip', 82), { cue: 'Stand tall', ms: 700, hold: 150 }),
      F(LUNGE, at('hip', 100), { cue: 'Big step forward, back knee down', ms: 900, hold: 200 }),
    ],
  },
  'reverse-lunges': {
    view: 'side',
    frames: [
      F(P(), at('hip', 104), { cue: 'Stand tall', ms: 700, hold: 150 }),
      F(LUNGE, at('hip', 94), { cue: 'Step back, both knees to 90°', ms: 900, hold: 200 }),
    ],
  },
  'side-lunges': {
    view: 'front',
    frames: [
      F(P({ torso: 172, thN: 55, shN: -5, thF: 38, shF: 38, uaN: 30, faN: -120, uaF: 30, faF: -120 }), at('hip', 82), { cue: 'Step out, sit into one hip', ms: 800, hold: 200 }),
      F(P({ thN: 14, shN: 14, thF: 14, shF: 14, uaN: 30, faN: -120, uaF: 30, faF: -120 }), at('hip', 100), { cue: 'Push back to the middle', ms: 700, hold: 100 }),
      F(P({ torso: 188, thF: 55, shF: -5, thN: 38, shN: 38, uaN: 30, faN: -120, uaF: 30, faF: -120 }), at('hip', 118), { cue: 'Then the other side', ms: 800, hold: 200 }),
      F(P({ thN: 14, shN: 14, thF: 14, shF: 14, uaN: 30, faN: -120, uaF: 30, faF: -120 }), at('hip', 100), { ms: 700, hold: 100 }),
    ],
  },
  'bulgarian-split-squats': {
    view: 'side',
    props: [{ kind: 'chair', x: 38, back: 'left' }],
    frames: [
      F(P({ thN: 12, shN: 0, thF: -40, shF: -60, ftF: -20 }), at('ankleN', 108), { level: ['toeF', 'toeN', SEAT, 'legF'], cue: 'Back foot on the chair', ms: 800, hold: 150 }),
      F(P({ torso: 172, thN: 82, shN: -8, thF: -8, shF: -75, ftF: -20 }), at('ankleN', 108), { level: ['toeF', 'toeN', SEAT, 'legF'], cue: 'Drop straight down', ms: 900, hold: 200 }),
    ],
  },
  'glute-bridge': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(SUPINE_KNEES, at('ankleN', 82), { cue: 'Feet flat, close to your hips', ms: 800, hold: 150 }),
      F({ ...SUPINE_KNEES, torso: 68, head: 90, thN: -115, shN: -15, thF: -115, shF: -15 }, at('ankleN', 82), { cue: 'Squeeze glutes, lift hips', ms: 800, hold: 500 }),
    ],
  },
  'single-leg-bridge': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, thN: -150, shN: -150, ftN: -150 }, at('ankleF', 82), { cue: 'One leg straight', ms: 800, hold: 150 }),
      F({ ...SUPINE_KNEES, torso: 68, head: 90, thF: -115, shF: -15, thN: -115, shN: -115, ftN: -115 }, at('ankleF', 82), { cue: 'Push through the heel, hips level', ms: 800, hold: 500 }),
    ],
  },
  'donkey-kicks': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(QUAD, at('kneeF', 85), { level: ['handF', 'kneeF', 0, 'torso'], cue: 'On hands and knees', ms: 700, hold: 150 }),
      F({ ...QUAD, thN: -95, shN: -185, ftN: -275 }, at('kneeF', 85), { level: ['handF', 'kneeF', 0, 'torso'], cue: 'Kick the heel up to the ceiling', ms: 700, hold: 300 }),
    ],
  },
  'fire-hydrants': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(QUAD, at('kneeF', 85), { level: ['handF', 'kneeF', 0, 'torso'], cue: 'On hands and knees', ms: 700, hold: 150 }),
      F({ ...QUAD, thN: -55, shN: -120, ftN: -120 }, at('kneeF', 85), { level: ['handF', 'kneeF', 0, 'torso'], cue: 'Lift the knee out to the side', ms: 700, hold: 300 }),
    ],
  },
  'wall-sit': {
    view: 'side',
    props: [{ kind: 'wall', x: 50 }],
    frames: breathe(P({ thN: 90, shN: 0, thF: 90, shF: 0, uaN: 0, faN: 70, uaF: 0, faF: 70 }), at('hip', 62), 'Back flat on the wall, thighs level', {}, { torso: 0, uaN: 3, uaF: 3 }),
  },
  'calf-raises': {
    view: 'side',
    frames: [
      F(P(), at('toeN', 105), { cue: 'Stand tall', ms: 600, hold: 100 }),
      F(P({ ftN: 40, ftF: 40 }), at('toeN', 105), { cue: 'Rise onto your toes, pause', ms: 600, hold: 400 }),
    ],
  },
  'step-ups': {
    view: 'side',
    props: [{ kind: 'step', x: 112 }],
    frames: [
      F(P(), at('ankleF', 92), { cue: 'Stand facing the step', ms: 600, hold: 100 }),
      F(P({ thN: 75, shN: -5, uaN: -30, uaF: 30, faF: 60 }), at('ankleF', 92), { cue: 'One foot on the step', ms: 600, hold: 100 }),
      F(P({ thF: 70, shF: 0, ftF: 70, uaF: -30, uaN: 30, faN: 60 }), at('ankleN', 125), { floor: GROUND - STEP, cue: 'Push up through that heel', ms: 700, hold: 200 }),
      F(P({ thN: 75, shN: -5 }), at('ankleF', 92), { cue: 'Step back down', ms: 700, hold: 100 }),
    ],
  },
  'side-leg-raises': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ torso: 90, head: 110, uaF: 150, faF: -150, uaN: -90, faN: -60, thN: -90, shN: -90, thF: -92, shF: -92, ftN: -180, ftF: -180 }), at('hip', 100), { cue: 'Lie on your side, legs long', ms: 700, hold: 150 }),
      F(P({ torso: 90, head: 110, uaF: 150, faF: -150, uaN: -90, faN: -60, thN: -128, shN: -128, thF: -92, shF: -92, ftN: -180, ftF: -180 }), at('hip', 100), { cue: 'Lift the top leg, slow and controlled', ms: 700, hold: 250 }),
    ],
  },

  // ---------- Mobility ----------
  'hip-circles': {
    view: 'front',
    frames: [
      F(P({ torso: 176, uaN: 35, faN: -140, uaF: 35, faF: -140, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 95), { cue: 'Hands on hips, circle slowly', ms: 400, hold: 0 }),
      F(P({ torso: 180, uaN: 35, faN: -140, uaF: 35, faF: -140, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 100), { ms: 400, hold: 0 }),
      F(P({ torso: 184, uaN: 35, faN: -140, uaF: 35, faF: -140, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 105), { ms: 400, hold: 0 }),
      F(P({ torso: 180, uaN: 35, faN: -140, uaF: 35, faF: -140, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 100), { air: 2, ms: 400, hold: 0 }),
    ],
  },
  'worlds-greatest-stretch': {
    view: 'side',
    frames: [
      F(P({ torso: 125, head: 130, thN: 88, shN: -8, thF: -62, shF: -62, ftF: 25, uaN: 8, faN: 8, uaF: 8, faF: 8 }), at('ankleN', 120), { cue: 'Deep lunge, hands on the floor', ms: 900, hold: 300 }),
      F(P({ torso: 125, head: 150, thN: 88, shN: -8, thF: -62, shF: -62, ftF: 25, uaN: 180, faN: 180, uaF: 8, faF: 8 }), at('ankleN', 120), { cue: 'Turn and reach one arm to the sky', ms: 1000, hold: 600 }),
    ],
  },
  'child-pose': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ torso: 180, thN: 0, shN: -90, thF: 0, shF: -90, ftN: -90, ftF: -90 }), at('kneeN', 95), { cue: 'Kneel tall', ms: 1000, hold: 200 }),
      F(P({ torso: 72, head: 58, thN: 60, shN: -92, thF: 60, shF: -92, ftN: -90, ftF: -90, uaN: 94, faN: 92, uaF: 94, faF: 92, spine: 4 }), at('kneeN', 95), { cue: 'Sit back on your heels, arms long. Breathe', ms: 1400, hold: 1200 }),
    ],
  },
  cobra: {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ ...PRONE, uaN: -150, faN: 0, uaF: -150, faF: 0, head: 90 }), at('hip', 90), { cue: 'Hands under shoulders', ms: 900, hold: 200 }),
      F(P({ ...PRONE, torso: 125, head: 135, uaN: 5, faN: -5, uaF: 5, faF: -5, spine: -4 }), at('hip', 90), { cue: 'Press up, hips stay down', ms: 1200, hold: 900 }),
    ],
  },
  'hamstring-stretch': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(SIT_LONG, at('hip', 80), { cue: 'Sit tall, legs straight', ms: 1000, hold: 200 }),
      F({ ...SIT_LONG, torso: 128, head: 115, uaN: 82, faN: 85, uaF: 82, faF: 85 }, at('hip', 80), { cue: 'Hinge forward from the hips. Breathe', ms: 1400, hold: 1200 }),
    ],
  },
  'quad-stretch': {
    view: 'side',
    frames: [
      F(P({ uaF: 70, faF: 80 }), at('ankleF', 100), { cue: 'Stand on one leg', ms: 800, hold: 150 }),
      F(P({ thN: -6, shN: -165, ftN: -100, uaN: -13, faN: -13, uaF: 80, faF: 85 }), at('ankleF', 100), { cue: 'Hold your foot behind you, knees together', ms: 1000, hold: 1300 }),
    ],
  },
  'figure-four': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, thN: -165, shN: -60, ftN: -90 }, at('hip', 100), { cue: 'Ankle over the opposite knee', ms: 1000, hold: 200 }),
      F({ ...SUPINE_KNEES, thF: -170, shF: -70, thN: -180, shN: -60, ftN: -90 }, at('hip', 100), { cue: 'Ease the knees towards you. Breathe', ms: 1200, hold: 1200 }),
    ],
  },
  'chest-opener': {
    view: 'side',
    frames: [
      F(P({ uaN: -25, faN: -25, uaF: -25, faF: -25 }), at('hip', 100), { cue: 'Clasp your hands behind you', ms: 800, hold: 150 }),
      F(P({ torso: 183, head: 195, uaN: -60, faN: -60, uaF: -60, faF: -60 }), at('hip', 100), { cue: 'Lift the arms, open the chest', ms: 1000, hold: 1200 }),
    ],
  },
  'neck-rolls': {
    view: 'front',
    frames: [
      F(P({ head: 158 }), at('hip', 100), { cue: 'Ear towards the shoulder', ms: 1200, hold: 600 }),
      F(P({ head: 180 }), at('hip', 100), { ms: 1000, hold: 100 }),
      F(P({ head: 202 }), at('hip', 100), { cue: 'Then the other side, slowly', ms: 1200, hold: 600 }),
      F(P({ head: 180 }), at('hip', 100), { ms: 1000, hold: 100 }),
    ],
  },
  'spinal-twist': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(SUPINE_KNEES, at('hip', 100), { cue: 'Arms relaxed on the floor, knees bent', ms: 1000, hold: 200 }),
      F({ ...SUPINE_KNEES, thN: -125, shN: -60, thF: -125, shF: -60, head: 75 }, at('hip', 100), { cue: 'Let the knees fall to one side. Breathe', ms: 1400, hold: 1200 }),
    ],
  },

  // ---------- More moves ----------
  'plank-up-downs': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(FOREARM_PLANK, at('toeN', 52), { level: ['handN', 'toeN'], cue: 'Start on your forearms', ms: 600, hold: 250 }),
      F(PLANK, at('toeN', 52), { level: ['handN', 'toeN'], cue: 'Press up onto your hands, one arm at a time', ms: 700, hold: 250 }),
    ],
  },
  'bear-plank': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(QUAD, at('kneeN', 85), { level: ['handF', 'kneeN', 0, 'torso'], cue: 'Hands and knees, toes tucked', ms: 800, hold: 200 }),
      ...breathe({ ...QUAD, thN: 4, shN: -72, thF: 4, shF: -72, ftN: 5, ftF: 5 }, at('kneeN', 85), 'Lift knees a little. Hold, flat back', { level: ['handF', 'toeN', 0, 'torso'] }, { thN: 1, thF: 1 }),
    ],
  },
  'frog-jumps': {
    view: 'side',
    frames: [
      F(P({ torso: 128, head: 140, thN: 98, shN: -38, thF: 98, shF: -38, uaN: 8, faN: 8, uaF: 8, faF: 8 }), at('ankleN', 100), { cue: 'Deep squat, fingers on the floor', ms: 550, hold: 150 }),
      F(P({ uaN: 170, faN: 175, uaF: 170, faF: 175, ftN: 40, ftF: 40 }), at('ankleN', 102), { air: 15, cue: 'Jump up, reach high', ms: 380, hold: 40 }),
    ],
  },
  'tuck-jumps': {
    view: 'side',
    frames: [
      F(P({ torso: 165, head: 170, thN: 35, shN: -30, thF: 35, shF: -30, uaN: -45, faN: -35, uaF: -45, faF: -35 }), at('ankleN', 100), { cue: 'Dip and swing the arms back', ms: 380, hold: 60 }),
      F(P({ torso: 172, head: 175, thN: 112, shN: 5, thF: 112, shF: 5, ftN: 50, ftF: 50, uaN: 70, faN: 90, uaF: 70, faF: 90 }), at('hip', 100), { air: 26, cue: 'Knees to your chest', ms: 320, hold: 60 }),
      F(P({ uaN: 20, faN: 20, uaF: 20, faF: 20 }), at('ankleN', 100), { cue: 'Land softly', ms: 320, hold: 80 }),
    ],
  },
  'standing-toe-touches': {
    view: 'side',
    frames: [
      F(P({ torso: 168, head: 172, thN: 78, shN: 78, ftN: 150, uaF: 80, faF: 78, uaN: -30, faN: -20 }), at('ankleF', 100), { cue: 'Kick up, opposite hand to toes', ms: 420, hold: 80 }),
      F(P({ uaN: 40, faN: 40, uaF: 40, faF: 40 }), at('ankleF', 100), { ms: 320, hold: 0 }),
      F(P({ torso: 168, head: 172, thF: 78, shF: 78, ftF: 150, uaN: 80, faN: 78, uaF: -30, faF: -20 }), at('ankleN', 100), { cue: 'Switch sides', ms: 420, hold: 80 }),
      F(P({ uaN: 40, faN: 40, uaF: 40, faF: 40 }), at('ankleN', 100), { ms: 320, hold: 0 }),
    ],
  },
  'reverse-crunches': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ ...SUPINE, thN: -180, shN: -90, thF: -180, shF: -90, ftN: -180, ftF: -180 }), at('hip', 98), { cue: 'Knees bent over your hips', ms: 800, hold: 150 }),
      F(P({ ...SUPINE, torso: 80, head: 88, thN: -215, shN: -120, thF: -215, shF: -120, ftN: -200, ftF: -200 }), at('hip', 98), { cue: 'Curl knees to chest, hips lift', ms: 700, hold: 200 }),
    ],
  },
  'wall-angels': {
    view: 'front',
    frames: [
      F(P({ uaN: 95, faN: 178, uaF: 95, faF: 178 }), at('hip', 100), { cue: 'Back on the wall, arms in a W', ms: 900, hold: 200 }),
      F(P({ uaN: 158, faN: 165, uaF: 158, faF: 165 }), at('hip', 100), { cue: 'Slide them up into a Y', ms: 1100, hold: 250 }),
    ],
  },
  'prone-y-raises': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...PRONE, uaN: 95, faN: 95, uaF: 95, faF: 95 }, at('hip', 95), { cue: 'Face down, arms in a Y', ms: 800, hold: 150 }),
      F({ ...PRONE, torso: 98, head: 103, uaN: 118, faN: 118, uaF: 118, faF: 118 }, at('hip', 95), { cue: 'Lift arms and chest, pause', ms: 800, hold: 500 }),
    ],
  },
  'curtsy-lunges': {
    view: 'front',
    frames: [
      F(P({ thN: 3, shN: 3, thF: 3, shF: 3, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 100), { cue: 'Stand tall', ms: 600, hold: 100 }),
      F(P({ torso: 176, thN: 32, shN: -8, thF: -34, shF: -14, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 96), { cue: 'Step behind and across, sink down', ms: 800, hold: 200 }),
      F(P({ thN: 3, shN: 3, thF: 3, shF: 3, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 100), { ms: 600, hold: 100 }),
      F(P({ torso: 184, thF: 32, shF: -8, thN: -34, shN: -14, uaN: 25, faN: -140, uaF: 25, faF: -140 }), at('hip', 104), { cue: 'Then the other side', ms: 800, hold: 200 }),
    ],
  },
  'squat-calf-raise': {
    view: 'side',
    frames: [
      F(SQUAT, at('ankleN', 100), { cue: 'Squat, chest up', ms: 800, hold: 120 }),
      F(P({ uaN: 170, faN: 175, uaF: 170, faF: 175, ftN: 42, ftF: 42 }), at('ankleN', 100), { cue: 'Stand and rise onto your toes', ms: 800, hold: 400 }),
    ],
  },
  'single-leg-deadlift': {
    view: 'side',
    frames: [
      F(P({ thN: 3, shN: -3 }), at('ankleN', 105), { cue: 'Stand on one leg, soft knee', ms: 700, hold: 150 }),
      F(P({ torso: 96, head: 100, uaN: 2, faN: 2, uaF: 2, faF: 2, thN: 6, shN: -6, thF: -86, shF: -86, ftF: 0 }), at('ankleN', 105), { cue: 'Hinge forward, back leg lifts', ms: 1000, hold: 300 }),
    ],
  },
  'standing-knee-to-elbow': {
    view: 'side',
    frames: [
      F(P({ uaN: 140, faN: -95, uaF: 140, faF: -95 }), at('ankleF', 100), { cue: 'Hands behind your head', ms: 400, hold: 50 }),
      F(P({ torso: 160, head: 150, uaN: 115, faN: -110, uaF: 120, faF: -100, thN: 105, shN: 5, ftN: 70 }), at('ankleF', 100), { cue: 'Knee up, elbow down to meet it', ms: 400, hold: 120 }),
      F(P({ uaN: 140, faN: -95, uaF: 140, faF: -95 }), at('ankleN', 100), { ms: 400, hold: 50 }),
      F(P({ torso: 160, head: 150, uaN: 120, faN: -100, uaF: 115, faF: -110, thF: 105, shF: 5, ftF: 70 }), at('ankleN', 100), { cue: 'Switch sides', ms: 400, hold: 120 }),
    ],
  },
  'torso-twists': {
    view: 'front',
    frames: [
      F(P({ torso: 176, head: 178, uaN: 90, faN: 92, uaF: 40, faF: -110, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 100), { cue: 'Turn to one side, hips forward', ms: 600, hold: 80 }),
      F(P({ torso: 184, head: 182, uaF: 90, faF: 92, uaN: 40, faN: -110, thN: 8, shN: 8, thF: 8, shF: 8 }), at('hip', 100), { cue: 'Swing round to the other side', ms: 600, hold: 80 }),
    ],
  },
  'cross-jacks': {
    view: 'front',
    frames: [
      F(P({ uaN: 115, faN: 120, uaF: 115, faF: 120, thN: 20, shN: 20, thF: 20, shF: 20, ftN: 80, ftF: 80 }), at('hip', 100), { cue: 'Jump out wide, arms out', ms: 360, hold: 40 }),
      F(P({ uaN: -28, faN: -32, uaF: -20, faF: -26, thN: -9, shN: -9, thF: -4, shF: -4, ftN: 80, ftF: 80 }), at('hip', 100), { cue: 'Jump in, cross arms and feet', ms: 360, hold: 40 }),
    ],
  },
  'lateral-shuffles': {
    view: 'front',
    frames: [
      F(P({ thN: 24, shN: 8, thF: 24, shF: 8, uaN: 30, faN: -100, uaF: 30, faF: -100, ftN: 80, ftF: 80 }), at('hip', 80), { cue: 'Low stance, shuffle sideways', ms: 260, hold: 30 }),
      F(P({ thN: 12, shN: 2, thF: 12, shF: 2, uaN: 30, faN: -100, uaF: 30, faF: -100, ftN: 80, ftF: 80 }), at('hip', 100), { ms: 260, hold: 30 }),
      F(P({ thN: 24, shN: 8, thF: 24, shF: 8, uaN: 30, faN: -100, uaF: 30, faF: -100, ftN: 80, ftF: 80 }), at('hip', 120), { cue: 'Stay low, feet never cross', ms: 260, hold: 30 }),
      F(P({ thN: 12, shN: 2, thF: 12, shF: 2, uaN: 30, faN: -100, uaF: 30, faF: -100, ftN: 80, ftF: 80 }), at('hip', 100), { ms: 260, hold: 30 }),
    ],
  },
  'downward-dog': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(PLANK, at('handN', 140), { level: ['handN', 'toeN'], cue: 'Start in a high plank', ms: 900, hold: 200 }),
      F(P({ torso: 38, head: 32, uaN: 38, faN: 38, uaF: 38, faF: 38, thN: -38, shN: -38, thF: -38, shF: -38, ftN: 55, ftF: 55 }), at('handN', 140), { level: ['handN', 'toeN'], cue: 'Hips up and back, heels down. Breathe', ms: 1200, hold: 1400 }),
    ],
  },
  'butterfly-stretch': {
    view: 'front',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(P({ thN: 102, shN: -78, thF: 102, shF: -78, uaN: 8, faN: -25, uaF: 8, faF: -25, ftN: 0, ftF: 0 }), at('hip', 100), { cue: 'Soles together, knees out', ms: 1000, hold: 200 }),
      F(P({ head: 175, thN: 94, shN: -86, thF: 94, shF: -86, uaN: 12, faN: -20, uaF: 12, faF: -20, ftN: 0, ftF: 0 }), at('hip', 100), { cue: 'Let the knees sink. Breathe', ms: 1200, hold: 800 }),
    ],
  },
  'standing-side-bend': {
    view: 'front',
    frames: [
      F(P({ uaN: 160, faN: 170, uaF: 8, faF: 8, thN: 6, shN: 6, thF: 6, shF: 6 }), at('hip', 100), { cue: 'Reach one arm up', ms: 800, hold: 150 }),
      F(P({ torso: 162, head: 158, uaN: 200, faN: 225, uaF: 15, faF: 15, thN: 6, shN: 6, thF: 6, shF: 6 }), at('hip', 100), { cue: 'Lean to the side and hold', ms: 1000, hold: 1200 }),
    ],
  },
  'shoulder-stretch': {
    view: 'front',
    frames: [
      F(P({ uaN: 10, faN: 10, uaF: 10, faF: 10 }), at('hip', 100), { cue: 'Stand tall, shoulders down', ms: 800, hold: 150 }),
      F(P({ uaN: -82, faN: -88, uaF: 25, faF: -140 }), at('hip', 100), { cue: 'Arm across the chest, hold it close', ms: 900, hold: 1300 }),
    ],
  },
  'standing-glute-kickback': {
    view: 'side',
    frames: [
      F(P({ torso: 174, uaN: -25, faN: 70, uaF: -25, faF: 70 }), at('ankleF', 100), { cue: 'Hands on hips, stand tall', ms: 600, hold: 120 }),
      F(P({ torso: 168, uaN: -25, faN: 70, uaF: -25, faF: 70, thN: -38, shN: -40, ftN: 20 }), at('ankleF', 100), { cue: 'Squeeze and push the leg back', ms: 600, hold: 300 }),
    ],
  },
  'good-mornings': {
    view: 'side',
    frames: [
      F(P({ uaN: 140, faN: -95, uaF: 140, faF: -95 }), at('ankleN', 100), { cue: 'Hands behind your head', ms: 700, hold: 150 }),
      F(P({ torso: 98, head: 104, uaN: 60, faN: -170, uaF: 60, faF: -170, thN: -8, shN: 4, thF: -8, shF: 4 }), at('ankleN', 100), { cue: 'Hips back, flat back, then stand', ms: 1000, hold: 200 }),
    ],
  },
  'chair-hip-thrust': {
    view: 'side',
    props: [{ kind: 'chair', x: 28, back: 'left' }],
    frames: [
      F(P({ torso: -118, head: -105, uaN: 66, faN: 66, uaF: 66, faF: 66, thN: 125, shN: 5, thF: 125, shF: 5 }), at('shoulderN', 54), { level: ['shoulderN', 'toeN', SEAT + 4, 'torso'], cue: 'Upper back on the chair, feet flat', ms: 800, hold: 150 }),
      F(P({ torso: -90, head: -95, uaN: 92, faN: 92, uaF: 92, faF: 92, thN: 90, shN: 2, thF: 90, shF: 2 }), at('shoulderN', 54), { level: ['shoulderN', 'toeN', SEAT + 4, 'torso'], cue: 'Drive the hips up, squeeze', ms: 800, hold: 400 }),
    ],
  },
  // ---------- Pelvic floor (Kegel) ----------
  'kegel-hold': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, uaN: -60, faN: -150, uaF: -60, faF: -150 }, at('ankleN', 82), { cue: 'Squeeze and lift the pelvic floor, hold 5 s', ms: 700, hold: 2300 }),
      F({ ...SUPINE_KNEES, torso: 92, uaN: -60, faN: -150, uaF: -60, faF: -150 }, at('ankleN', 82), { cue: 'Let go fully, relax 5 s', ms: 700, hold: 2300 }),
    ],
  },
  'kegel-flicks': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F({ ...SUPINE_KNEES, uaN: -60, faN: -150, uaF: -60, faF: -150 }, at('ankleN', 82), { cue: 'Quick squeeze', ms: 260, hold: 240 }),
      F({ ...SUPINE_KNEES, torso: 92, uaN: -60, faN: -150, uaF: -60, faF: -150 }, at('ankleN', 82), { cue: 'Let go', ms: 260, hold: 240 }),
    ],
  },
  'bridge-squeeze': {
    view: 'side',
    props: [{ kind: 'mat', x: 100 }],
    frames: [
      F(SUPINE_KNEES, at('ankleN', 82), { cue: 'Feet flat, breathe in', ms: 900, hold: 200 }),
      F({ ...SUPINE_KNEES, torso: 68, head: 90, thN: -115, shN: -15, thF: -115, shF: -15 }, at('ankleN', 82), { cue: 'Lift hips, squeeze pelvic floor, hold', ms: 900, hold: 1800 }),
    ],
  },
  'deep-squat-hold': {
    view: 'side',
    frames: [
      F({ ...SQUAT, torso: 155, head: 165, thN: 112, shN: -42, thF: 112, shF: -42, uaN: 40, faN: 150, uaF: 40, faF: 150 }, at('ankleN', 100), { cue: 'Sink low, chest up, breathe into the belly', ms: 1400, hold: 600 }),
      F({ ...SQUAT, torso: 151, head: 162, thN: 116, shN: -44, thF: 116, shF: -44, uaN: 40, faN: 150, uaF: 40, faF: 150 }, at('ankleN', 100), { cue: 'Relax the pelvic floor as you breathe in', ms: 1400, hold: 600 }),
    ],
  },
};

export { mirror };

/** Exercises done lying on the back (or with the back on a chair): drawn facing up. */
const FACE_UP = [
  'crunches', 'bicycle-crunches', 'leg-raises', 'dead-bug', 'flutter-kicks', 'heel-taps', 'v-ups', 'hollow-hold',
  'glute-bridge', 'single-leg-bridge', 'kegel-hold', 'kegel-flicks', 'bridge-squeeze', 'figure-four', 'spinal-twist', 'reverse-crunches', 'chair-hip-thrust',
];
for (const id of FACE_UP) if (MOVES[id]) MOVES[id].faceUp = true;
