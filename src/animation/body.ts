/**
 * Draws the skeleton as an anatomical body: tapered limbs with muscle bellies,
 * a shaped torso, head, hands and shoes, plus muscle shapes that light up for
 * the muscles an exercise works (main muscles bright, helpers softer).
 */
import type { BodySlug } from '@/data/muscles';
import type { Prop } from './moves';
import { propShapes, type FigureColors, type Shape, type V } from './render';
import { GROUND, type Points, type View } from './skeleton';

const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]) || 1;
const unit = (a: V): V => mul(a, 1 / len(a));
/** Left normal of a direction. For a limb hanging down it points backwards (−x). */
const perp = (d: V): V => [-d[1], d[0]];
const lerp = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const sample = (arr: number[], t: number) => {
  if (arr.length === 1) return arr[0];
  const x = t * (arr.length - 1);
  const i = Math.min(arr.length - 2, Math.floor(x));
  return arr[i] + (arr[i + 1] - arr[i]) * (x - i);
};

interface Frame { a: V; b: V; d: V; n: V; L: number }
const frameOf = (a: V, b: V): Frame => {
  const d = unit(sub(b, a));
  return { a, b, d, n: perp(d), L: len(sub(b, a)) };
};

/** A tapered capsule along a→b. widths and bias (centre offset along the normal) are sampled along the length. */
function capsule(a: V, b: V, widths: number[], bias: number[] = [0]): V[] {
  const f = frameOf(a, b);
  const K = 7;
  const left: V[] = [];
  const right: V[] = [];
  for (let i = 0; i <= K; i++) {
    const t = i / K;
    const c = add(lerp(a, b, t), mul(f.n, sample(bias, t)));
    const w = sample(widths, t) / 2;
    left.push(add(c, mul(f.n, w)));
    right.push(add(c, mul(f.n, -w)));
  }
  const cap = (center: V, r: number, along: V, from: V): V[] => {
    const out: V[] = [];
    for (let i = 1; i < 6; i++) {
      const th = (Math.PI * i) / 6;
      out.push(add(center, add(mul(from, Math.cos(th) * r), mul(along, Math.sin(th) * r))));
    }
    return out;
  };
  const endC = add(b, mul(f.n, sample(bias, 1)));
  const startC = add(a, mul(f.n, sample(bias, 0)));
  return [
    ...left,
    ...cap(endC, sample(widths, 1) / 2, f.d, f.n),
    ...right.reverse(),
    ...cap(startC, sample(widths, 0) / 2, mul(f.d, -1), mul(f.n, -1)),
  ];
}

/** An ellipse lying along a segment: centred at t, pushed `off` along the normal. */
function belly(a: V, b: V, t: number, off: number, lenFrac: number, width: number): V[] {
  const f = frameOf(a, b);
  const c = add(lerp(a, b, t), mul(f.n, off));
  const rx = (f.L * lenFrac) / 2;
  const ry = width / 2;
  const out: V[] = [];
  for (let i = 0; i < 16; i++) {
    const th = (Math.PI * 2 * i) / 16;
    out.push(add(c, add(mul(f.d, Math.cos(th) * rx), mul(f.n, Math.sin(th) * ry))));
  }
  return out;
}

function oval(c: V, d: V, rx: number, ry: number): V[] {
  const n = perp(d);
  const out: V[] = [];
  for (let i = 0; i < 18; i++) {
    const th = (Math.PI * 2 * i) / 18;
    out.push(add(c, add(mul(d, Math.cos(th) * rx), mul(n, Math.sin(th) * ry))));
  }
  return out;
}

/** Points along the (curved) spine from hip to neck. */
function spinePoints(hip: V, neck: V, spine: number, k = 6): { pts: V[]; normals: V[] } {
  const f = frameOf(hip, neck);
  const ctrl = add(lerp(hip, neck, 0.5), mul(f.n, -spine));
  const pts: V[] = [];
  const normals: V[] = [];
  for (let i = 0; i <= k; i++) {
    const t = i / k;
    const p = add(add(mul(hip, (1 - t) ** 2), mul(ctrl, 2 * (1 - t) * t)), mul(neck, t * t));
    const tan = unit(add(mul(sub(ctrl, hip), 2 * (1 - t)), mul(sub(neck, ctrl), 2 * t)));
    pts.push(p);
    normals.push(perp(tan));
  }
  return { pts, normals };
}

/** Torso outline. In side view the normal points to the front of the body. */
function torsoPoly(hip: V, neck: V, spine: number, view: View, F = 1): { outline: V[]; at: (t: number, off: number) => V; normalAt: (t: number) => V } {
  const { pts, normals } = spinePoints(hip, neck, spine);
  const widths = view === 'front' ? [18, 15.5, 15, 18, 22, 23, 19] : [15, 13, 12.5, 13.5, 15, 14.5, 11];
  const bias = view === 'front' ? [0, 0, 0, 0, 0, 0, 0] : [-1.6, -0.8, 0.2, 0.9, 1.6, 1.2, 0].map((b) => b * F);
  const left: V[] = [];
  const right: V[] = [];
  pts.forEach((p, i) => {
    const c = add(p, mul(normals[i], bias[i]));
    left.push(add(c, mul(normals[i], widths[i] / 2)));
    right.push(add(c, mul(normals[i], -widths[i] / 2)));
  });
  // Rounded top (shoulders) and bottom (pelvis).
  const roundEnd = (c: V, r: number, n: V, d: V) => [1, 2, 3, 4, 5].map((i) => add(c, add(mul(n, Math.cos((Math.PI * i) / 6) * r), mul(d, Math.sin((Math.PI * i) / 6) * r))));
  const topD = unit(sub(pts[6], pts[5]));
  const botD = unit(sub(pts[0], pts[1]));
  const outline = [
    ...left,
    ...roundEnd(add(pts[6], mul(normals[6], bias[6])), widths[6] / 2, normals[6], topD),
    ...right.reverse(),
    ...roundEnd(add(pts[0], mul(normals[0], bias[0])), widths[0] / 2, mul(normals[0], -1), botD),
  ];
  const at = (t: number, off: number): V => {
    const x = t * 6;
    const i = Math.min(5, Math.floor(x));
    const p = lerp(pts[i], pts[i + 1], x - i);
    const nn = unit(lerp(normals[i], normals[i + 1], x - i));
    return add(p, mul(nn, off));
  };
  const normalAt = (t: number) => {
    const x = t * 6;
    const i = Math.min(5, Math.floor(x));
    return unit(lerp(normals[i], normals[i + 1], x - i));
  };
  return { outline, at, normalAt };
}

const LIMB = {
  thigh: { w: [11.5, 10.8, 9.6, 8.2, 7.2], side: [1, 0.2, -0.5, -0.4, 0] },
  shin: { w: [7.2, 7.8, 6.6, 5.2, 4.4], side: [0, 1.3, 0.9, 0.3, 0] },
  upperArm: { w: [7.6, 7.2, 6.4, 5.4], side: [0, -0.4, -0.3, 0] },
  forearm: { w: [5.6, 5.8, 4.8, 3.8], side: [0, 0.3, 0.1, 0] },
};

export function bodyShapes(
  pts: Points,
  view: View,
  props: Prop[] | undefined,
  spine: number,
  hot: Set<BodySlug>,
  warm: Set<BodySlug>,
  c: FigureColors,
  faceUp = false,
): Shape[] {
  const s: Shape[] = [];
  const front = view === 'front';
  /** Side view: +1 when the body faces the usual way, −1 when lying on the back (front faces up). */
  const F = faceUp && !front ? -1 : 1;
  s.push({ kind: 'rect', x: 10, y: GROUND, w: 180, h: 1.2, color: c.ground });
  s.push(...propShapes(props, c));

  // Soft shadow under the body.
  const lowX = [pts.toeN[0], pts.toeF[0], pts.handN[0], pts.hip[0], pts.head[0]];
  const minX = Math.min(...lowX);
  const maxX = Math.max(...lowX);
  s.push({ kind: 'poly', pts: oval([(minX + maxX) / 2, GROUND + 0.6], [1, 0], (maxX - minX) / 2 + 8, 1.6), color: '#000000', opacity: 0.18 });

  const muscle = (slug: BodySlug, poly: V[]) => {
    if (hot.has(slug)) {
      s.push({ kind: 'poly', pts: poly, color: c.hot, opacity: 0.45, glow: true });
      s.push({ kind: 'poly', pts: poly, color: c.hot, opacity: 0.95, stroke: c.line, strokeW: 0.35 });
    } else if (warm.has(slug)) {
      s.push({ kind: 'poly', pts: poly, color: c.warm, opacity: 0.85, stroke: c.line, strokeW: 0.3 });
    } else {
      // Faint definition so the body reads as muscular even when nothing is highlighted.
      s.push({ kind: 'poly', pts: poly, color: c.line, opacity: 0.12 });
    }
  };

  const bodyPart = (poly: V[], color: string) => s.push({ kind: 'poly', pts: poly, color, stroke: c.line, strokeW: 0.5 });
  // Side view: limbs bend so their "front" is the negative normal for legs and arms.
  const sideSign = front ? 0 : F;

  const leg = (hipP: V, knee: V, ankle: V, toe: V, color: string, near: boolean, mirror: number) => {
    bodyPart(capsule(hipP, knee, LIMB.thigh.w, LIMB.thigh.side.map((x) => x * sideSign)), color);
    bodyPart(capsule(knee, ankle, LIMB.shin.w, LIMB.shin.side.map((x) => x * sideSign)), color);
    // Shoe: from just behind the ankle to the toe.
    const fd = unit(sub(toe, ankle));
    bodyPart(capsule(sub(ankle, mul(fd, 2.2)), add(toe, mul(fd, front ? 0 : 0.8)), front ? [4.4, 4.2, 3.8] : [5, 4.6, 3.6], [0]), c.hair);
    if (!near && !front) return;
    if (front) {
      muscle('quadriceps', belly(hipP, knee, 0.5, 0, 0.72, 6.6));
      muscle('adductors', belly(hipP, knee, 0.3, mirror * 2.6, 0.45, 2.6));
      muscle('hamstring', belly(hipP, knee, 0.55, -mirror * 3.2, 0.5, 1.8));
      muscle('calves', belly(knee, ankle, 0.32, 0, 0.5, 5.4));
      muscle('tibialis', belly(knee, ankle, 0.45, mirror * 1.6, 0.45, 1.8));
    } else {
      muscle('quadriceps', belly(hipP, knee, 0.5, -2.1 * F, 0.72, 5.2));
      muscle('hamstring', belly(hipP, knee, 0.52, 2.5 * F, 0.66, 4.4));
      muscle('adductors', belly(hipP, knee, 0.32, 0.2, 0.42, 2.6));
      muscle('calves', belly(knee, ankle, 0.3, 2.3 * F, 0.46, 4.6));
      muscle('tibialis', belly(knee, ankle, 0.42, -1.9 * F, 0.5, 2.4));
    }
  };

  const arm = (sh: V, elbow: V, hand: V, color: string, near: boolean) => {
    bodyPart(capsule(sh, elbow, LIMB.upperArm.w, LIMB.upperArm.side.map((x) => x * sideSign)), color);
    bodyPart(capsule(elbow, hand, LIMB.forearm.w, LIMB.forearm.side.map((x) => x * sideSign)), color);
    const hd = unit(sub(hand, elbow));
    bodyPart(oval(add(hand, mul(hd, 2)), hd, 3.3, 2.5), color);
    if (!near && !front) return;
    if (front) {
      muscle('biceps', belly(sh, elbow, 0.55, 0, 0.55, 4));
      muscle('triceps', belly(sh, elbow, 0.5, 0, 0.7, 1.6));
    } else {
      muscle('biceps', belly(sh, elbow, 0.56, -1.7 * F, 0.55, 3.6));
      muscle('triceps', belly(sh, elbow, 0.5, 1.9 * F, 0.6, 3.8));
    }
    muscle('forearm', belly(elbow, hand, 0.33, 0, 0.55, 3.8));
    muscle('deltoids', oval(add(sh, mul(unit(sub(elbow, sh)), 2.4)), unit(sub(elbow, sh)), 4.6, 4.2));
  };

  // Far side first (behind the body in side view). In front view, "N" is the figure's right (viewer's left).
  if (!front) {
    arm(pts.shoulderF, pts.elbowF, pts.handF, c.far, false);
    leg(pts.hipF, pts.kneeF, pts.ankleF, pts.toeF, c.far, false, 1);
  } else {
    leg(pts.hipF, pts.kneeF, pts.ankleF, pts.toeF, c.near, true, -1);
    leg(pts.hipN, pts.kneeN, pts.ankleN, pts.toeN, c.near, true, 1);
  }

  // Torso with muscle groups.
  const torso = torsoPoly(pts.hip, pts.neck, spine, view, F);
  bodyPart(torso.outline, c.near);
  const TN = (t: number) => torso.normalAt(t);
  const tDir = unit(sub(pts.neck, pts.hip));
  if (front) {
    for (const side of [-1, 1]) {
      muscle('chest', oval(torso.at(0.78, side * 5.2), tDir, 4, 5.4));
      muscle('obliques', oval(torso.at(0.36, side * 6.6), tDir, 5, 2));
      muscle('trapezius', oval(torso.at(0.97, side * 6), [side, 0], 3.4, 1.8));
      muscle('lower-back', oval(torso.at(0.2, side * 7.6), tDir, 2.4, 0.9));
      muscle('upper-back', oval(torso.at(0.66, side * 9.6), tDir, 3.4, 1));
    }
    for (let row = 0; row < 3; row++) {
      for (const side of [-1, 1]) muscle('abs', oval(torso.at(0.18 + row * 0.13, side * 2.2), tDir, 2.6, 1.9));
    }
    muscle('gluteal', oval(torso.at(0.02, 0), [1, 0], 8.5, 2.6));
  } else {
    muscle('chest', belly(torso.at(0.66, 4.3 * F), torso.at(0.9, 4.3 * F), 0.5, 0, 1.25, 5.2));
    muscle('abs', belly(torso.at(0.16, 4.6 * F), torso.at(0.52, 4.8 * F), 0.5, 0, 1.05, 3.4));
    muscle('obliques', belly(torso.at(0.18, 1.6 * F), torso.at(0.46, 1.8 * F), 0.5, 0, 1.1, 4.4));
    muscle('lower-back', belly(torso.at(0.14, -4.4 * F), torso.at(0.44, -4.6 * F), 0.5, 0, 1.05, 3.2));
    muscle('upper-back', belly(torso.at(0.56, -5.2 * F), torso.at(0.9, -5.2 * F), 0.5, 0, 1.05, 4.6));
    muscle('trapezius', belly(torso.at(0.86, -3.4 * F), torso.at(1, -2 * F), 0.5, 0, 1.2, 4));
    const g = torso.at(0.02, -4.2 * F);
    muscle('gluteal', oval(add(g, mul(tDir, 1.5)), tDir, 5.4, 4.8));
    void TN;
  }

  // Neck and head.
  const hd = unit(sub(pts.head, pts.neck));
  bodyPart(capsule(pts.neck, add(pts.neck, mul(hd, 5)), [5.6, 5.2], [0]), c.near);
  if (hot.has('neck') || warm.has('neck')) muscle('neck', belly(pts.neck, add(pts.neck, mul(hd, 5)), 0.5, 0, 1, 4.6));
  const headC = add(pts.head, mul(hd, 0.6));
  bodyPart(oval(headC, hd, 8.2, 7), c.near);
  if (front) {
    // Hair on top, eyes and a hint of a mouth.
    s.push({ kind: 'poly', pts: oval(add(headC, mul(hd, 4.4)), hd, 3.8, 6.8), color: c.hair });
    const across = perp(hd);
    for (const k of [-1, 1]) s.push({ kind: 'circle', c: add(add(headC, mul(across, k * 2.7)), mul(hd, 0.6)), r: 0.95, color: c.face });
    s.push({ kind: 'line', a: add(add(headC, mul(across, -1.4)), mul(hd, -3.4)), b: add(add(headC, mul(across, 1.4)), mul(hd, -3.4)), w: 0.6, color: c.face, opacity: 0.6 });
  } else {
    // Face side is the head direction turned 90° forward.
    const fwd: V = mul([-hd[1], hd[0]], F);
    s.push({ kind: 'poly', pts: oval(add(add(headC, mul(hd, 3.4)), mul(fwd, -2.2)), hd, 4.2, 6), color: c.hair });
    s.push({ kind: 'circle', c: add(add(headC, mul(fwd, 4.2)), mul(hd, 0.8)), r: 1, color: c.face });
    s.push({ kind: 'poly', pts: [add(add(headC, mul(fwd, 6.6)), mul(hd, 0.4)), add(add(headC, mul(fwd, 8.6)), mul(hd, -1.4)), add(add(headC, mul(fwd, 6.8)), mul(hd, -2.2))], color: c.near });
    s.push({ kind: 'poly', pts: oval(add(headC, mul(fwd, -0.6)), hd, 1.8, 1.2), color: c.line, opacity: 0.35 });
  }

  // Near side on top.
  if (!front) {
    leg(pts.hipN, pts.kneeN, pts.ankleN, pts.toeN, c.near, true, 1);
    arm(pts.shoulderN, pts.elbowN, pts.handN, c.near, true);
  } else {
    arm(pts.shoulderF, pts.elbowF, pts.handF, c.near, true);
    arm(pts.shoulderN, pts.elbowN, pts.handN, c.near, true);
  }
  return s;
}
