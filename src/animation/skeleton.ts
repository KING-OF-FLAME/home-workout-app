/**
 * A small 2D skeleton used to animate every exercise in code (no video files,
 * so the animations can ship in any app, including resold templates).
 *
 * Angles are absolute, in degrees: 0 = pointing down, 90 = forward (to the right
 * in side view, outward in front view), 180 = up, -90 = backward.
 */

export const VIEW_W = 200;
export const VIEW_H = 150;
export const GROUND = 138;

export const LEN = {
  torso: 34,
  neck: 4,
  headR: 7.5,
  upperArm: 17,
  forearm: 16,
  thigh: 22,
  shin: 21,
  foot: 7,
  shoulderHalf: 9,
  hipHalf: 5,
} as const;

export type View = 'side' | 'front';

export interface Pose {
  torso: number;
  head: number;
  uaN: number;
  faN: number;
  uaF: number;
  faF: number;
  thN: number;
  shN: number;
  thF: number;
  shF: number;
  ftN: number;
  ftF: number;
  /** Back curve: positive rounds the back (cat), negative arches it (cow). */
  spine: number;
}

export type PointName =
  | 'hip'
  | 'neck'
  | 'head'
  | 'shoulderN'
  | 'shoulderF'
  | 'elbowN'
  | 'elbowF'
  | 'handN'
  | 'handF'
  | 'hipN'
  | 'hipF'
  | 'kneeN'
  | 'kneeF'
  | 'ankleN'
  | 'ankleF'
  | 'toeN'
  | 'toeF';

export type Points = Record<PointName, [number, number]>;

export interface Frame {
  pose: Pose;
  /** Horizontal anchor: this point is placed at this x. */
  x: { point: PointName; at: number };
  /** Lift off the ground (jumps). The lowest body point otherwise rests on the ground. */
  air?: number;
  /** Rest the lowest point on this height instead of the floor (e.g. lying on a bench). */
  floor?: number;
  /** Rotate part of the body until y(a) = y(b) - offset. Default part: everything but the arms. */
  level?: [PointName, PointName, number?, LevelPart?];
  /** Coaching cue shown while moving towards this frame. */
  cue?: string;
  /** Milliseconds to move into this frame. */
  ms?: number;
  /** Pause on this frame, in milliseconds. */
  hold?: number;
}

const rad = (d: number) => (d * Math.PI) / 180;
const dir = (a: number, side = 1): [number, number] => [side * Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: [number, number], d: [number, number], l: number): [number, number] => [p[0] + d[0] * l, p[1] + d[1] * l];

export type LevelPart = 'body' | 'torso' | 'upper' | 'legF' | 'legN';
const LEVEL_KEYS: Record<LevelPart, (keyof Pose)[]> = {
  body: ['torso', 'head', 'thN', 'shN', 'thF', 'shF', 'ftN', 'ftF'],
  torso: ['torso', 'head'],
  upper: ['torso', 'head', 'thN', 'thF'],
  legF: ['thF', 'shF', 'ftF'],
  legN: ['thN', 'shN', 'ftN'],
};

/** Forward kinematics from the hip at (0, 0). */
export function solvePoints(pose: Pose, view: View): Points {
  const hip: [number, number] = [0, 0];
  const t = dir(pose.torso);
  const neck = add(hip, t, LEN.torso);
  const head = add(neck, dir(pose.head), LEN.neck + LEN.headR);
  const sh = add(hip, t, LEN.torso - 3);
  const front = view === 'front';
  const sN: [number, number] = front ? [sh[0] - LEN.shoulderHalf, sh[1]] : [sh[0] - 0.5, sh[1]];
  const sF: [number, number] = front ? [sh[0] + LEN.shoulderHalf, sh[1]] : [sh[0] + 0.5, sh[1]];
  const hN: [number, number] = front ? [-LEN.hipHalf, 0] : [-0.5, 0];
  const hF: [number, number] = front ? [LEN.hipHalf, 0] : [0.5, 0];
  const sideN = front ? -1 : 1;
  const elbowN = add(sN, dir(pose.uaN, sideN), LEN.upperArm);
  const handN = add(elbowN, dir(pose.faN, sideN), LEN.forearm);
  const elbowF = add(sF, dir(pose.uaF), LEN.upperArm);
  const handF = add(elbowF, dir(pose.faF), LEN.forearm);
  const kneeN = add(hN, dir(pose.thN, sideN), LEN.thigh);
  const ankleN = add(kneeN, dir(pose.shN, sideN), LEN.shin);
  const kneeF = add(hF, dir(pose.thF), LEN.thigh);
  const ankleF = add(kneeF, dir(pose.shF), LEN.shin);
  const footLen = front ? 3 : LEN.foot;
  const toeN = add(ankleN, dir(pose.ftN, sideN), footLen);
  const toeF = add(ankleF, dir(pose.ftF), footLen);
  return {
    hip, neck, head, shoulderN: sN, shoulderF: sF, elbowN, elbowF, handN, handF,
    hipN: hN, hipF: hF, kneeN, kneeF, ankleN, ankleF, toeN, toeF,
  };
}

function rotateBody(pose: Pose, delta: number, part: LevelPart = 'body'): Pose {
  const out = { ...pose };
  for (const k of LEVEL_KEYS[part]) out[k] = pose[k] + delta;
  return out;
}

/** Apply a frame's "level" rule: find the body tilt that puts both contact points where they belong. */
export function levelPose(frame: Frame, view: View): Pose {
  if (!frame.level) return frame.pose;
  const [a, b, offset = 0, part = 'body'] = frame.level;
  const err = (d: number) => {
    const p = solvePoints(rotateBody(frame.pose, d, part), view);
    return p[a][1] - (p[b][1] - offset);
  };
  let best = 0;
  let bestErr = Math.abs(err(0));
  for (let d = -80; d <= 80; d += 2) {
    const e = Math.abs(err(d));
    if (e < bestErr) { best = d; bestErr = e; }
  }
  for (let step = 1; step > 0.05; step /= 2) {
    for (const d of [best - step, best + step]) {
      const e = Math.abs(err(d));
      if (e < bestErr) { best = d; bestErr = e; }
    }
  }
  return rotateBody(frame.pose, best, part);
}

const GROUND_POINTS: PointName[] = ['hip', 'neck', 'shoulderN', 'shoulderF', 'elbowN', 'elbowF', 'handN', 'handF', 'kneeN', 'kneeF', 'ankleN', 'ankleF', 'toeN', 'toeF'];

/** Final screen positions: anchored horizontally and resting on the floor. */
export function place(pose: Pose, view: View, x: { point: PointName; at: number }, air = 0, floor = GROUND): Points {
  const p = solvePoints(pose, view);
  let lowest = p.head[1] + LEN.headR;
  for (const k of GROUND_POINTS) lowest = Math.max(lowest, p[k][1] + 2.5);
  const dx = x.at - p[x.point][0];
  const dy = floor - air - lowest;
  const out = {} as Points;
  for (const k of Object.keys(p) as PointName[]) out[k] = [p[k][0] + dx, p[k][1] + dy];
  return out;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth in-and-out easing. */
export const ease = (t: number) => 0.5 - Math.cos(Math.PI * t) / 2;

export interface PreparedFrame {
  pose: Pose;
  frame: Frame;
}

export function prepare(frames: Frame[], view: View): PreparedFrame[] {
  return frames.map((f) => ({ frame: f, pose: levelPose(f, view) }));
}

/** Points between two prepared frames at progress t (0..1). */
export function between(a: PreparedFrame, b: PreparedFrame, t: number, view: View): Points {
  const pose = {} as Pose;
  for (const k of Object.keys(a.pose) as (keyof Pose)[]) pose[k] = lerp(a.pose[k], b.pose[k], t);
  const pa = place(a.pose, view, a.frame.x, a.frame.air, a.frame.floor);
  const pb = place(b.pose, view, b.frame.x, b.frame.air, b.frame.floor);
  const pm = place(pose, view, a.frame.x, 0, GROUND);
  // Blend the anchored positions so contacts stay put, then follow the blended pose shape.
  const hipX = lerp(pa.hip[0], pb.hip[0], t);
  const hipY = lerp(pa.hip[1], pb.hip[1], t);
  const out = {} as Points;
  for (const k of Object.keys(pm) as PointName[]) out[k] = [pm[k][0] - pm.hip[0] + hipX, pm[k][1] - pm.hip[1] + hipY];
  return out;
}

export interface Timeline {
  total: number;
  /** For each segment i: start time, move duration, hold duration. */
  segments: { start: number; move: number; hold: number }[];
}

export function timeline(frames: Frame[], speed = 1): Timeline {
  let tAcc = 0;
  const segments = frames.map((f) => {
    const move = (f.ms ?? 700) / speed;
    const hold = (f.hold ?? 150) / speed;
    const s = { start: tAcc, move, hold };
    tAcc += move + hold;
    return s;
  });
  return { total: tAcc, segments };
}

/** Points and cue at time `ms` in a looping animation through all frames. */
export function sample(prepared: PreparedFrame[], tl: Timeline, ms: number, view: View): { points: Points; spine: number; cue?: string; index: number } {
  const t = ((ms % tl.total) + tl.total) % tl.total;
  let i = tl.segments.length - 1;
  for (let k = 0; k < tl.segments.length; k++) {
    if (t < tl.segments[k].start + tl.segments[k].move + tl.segments[k].hold) { i = k; break; }
  }
  const seg = tl.segments[i];
  const to = prepared[i];
  const from = prepared[(i - 1 + prepared.length) % prepared.length];
  const local = Math.min(1, (t - seg.start) / Math.max(1, seg.move));
  const e = ease(local);
  return { points: between(from, to, e, view), spine: lerp(from.pose.spine, to.pose.spine, e), cue: to.frame.cue, index: i };
}
