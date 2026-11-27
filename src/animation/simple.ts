/**
 * The first drawn figure (v1.1): a clean, simple stick body. Kept as a demo
 * style next to the detailed drawn body and the 3D body.
 */
import type { BodySlug } from '@/data/muscles';
import type { Prop } from './moves';
import { propShapes, type FigureColors, type Shape } from './render';
import { GROUND, LEN, type Points, type View } from './skeleton';

type Part = 'torsoUpper' | 'torsoLower' | 'neck' | 'shoulders' | 'upperArms' | 'forearms' | 'glutes' | 'thighs' | 'shins';

const PART_OF: Record<BodySlug, Part> = {
  chest: 'torsoUpper',
  'upper-back': 'torsoUpper',
  trapezius: 'torsoUpper',
  abs: 'torsoLower',
  obliques: 'torsoLower',
  'lower-back': 'torsoLower',
  neck: 'neck',
  deltoids: 'shoulders',
  biceps: 'upperArms',
  triceps: 'upperArms',
  forearm: 'forearms',
  gluteal: 'glutes',
  quadriceps: 'thighs',
  hamstring: 'thighs',
  adductors: 'thighs',
  calves: 'shins',
  tibialis: 'shins',
};

export function hotParts(slugs: BodySlug[]): Set<Part> {
  return new Set(slugs.map((s) => PART_OF[s]));
}

const fmt = (n: number) => Math.round(n * 10) / 10;

/** Shapes for one frame, back to front. `glow` shapes pulse in the component. */
export function simpleShapes(pts: Points, view: View, props: Prop[] | undefined, spine: number, hot: Set<BodySlug>, c: FigureColors): Shape[] {
  const hotSet = hotParts([...hot]);
  const s: Shape[] = [];
  s.push({ kind: 'rect', x: 10, y: GROUND, w: 180, h: 1.2, color: c.ground });
  s.push(...propShapes(props, c));

  const limb = (a: [number, number], b: [number, number], w: number, color: string, isHot: boolean) => {
    if (isHot) s.push({ kind: 'line', a, b, w: w + 6, color: c.hot, opacity: 0.35, glow: true });
    s.push({ kind: 'line', a, b, w, color: isHot ? c.hot : color });
  };
  const front = view === 'front';
  const farColor = front ? c.near : c.far;

  // Far side first (behind the body in side view).
  limb(pts.hipF, pts.kneeF, 7.5, farColor, hotSet.has('thighs'));
  limb(pts.kneeF, pts.ankleF, 6.5, farColor, hotSet.has('shins'));
  limb(pts.ankleF, pts.toeF, 4.5, farColor, false);
  limb(pts.shoulderF, pts.elbowF, 6, farColor, hotSet.has('upperArms'));
  limb(pts.elbowF, pts.handF, 5, farColor, hotSet.has('forearms'));

  // Torso as a curved spine, split in upper and lower halves for highlighting.
  const [hx, hy] = pts.hip;
  const [nx, ny] = pts.neck;
  const len = Math.hypot(nx - hx, ny - hy) || 1;
  const px = -(ny - hy) / len;
  const py = (nx - hx) / len;
  // Positive spine bends the middle of the back away from the front of the body.
  const cx = (hx + nx) / 2 - px * spine;
  const cy = (hy + ny) / 2 - py * spine;
  const mx = 0.25 * hx + 0.5 * cx + 0.25 * nx;
  const my = 0.25 * hy + 0.5 * cy + 0.25 * ny;
  const lowerD = `M${fmt(hx)} ${fmt(hy)} Q${fmt((hx + cx) / 2)} ${fmt((hy + cy) / 2)} ${fmt(mx)} ${fmt(my)}`;
  const upperD = `M${fmt(mx)} ${fmt(my)} Q${fmt((cx + nx) / 2)} ${fmt((cy + ny) / 2)} ${fmt(nx)} ${fmt(ny)}`;
  const torsoW = front ? 16 : 12;
  for (const [d, part] of [[lowerD, 'torsoLower'], [upperD, 'torsoUpper']] as const) {
    if (hotSet.has(part)) s.push({ kind: 'path', d, w: torsoW + 6, color: c.hot, opacity: 0.35, glow: true });
    s.push({ kind: 'path', d, w: torsoW, color: hotSet.has(part) ? c.hot : c.near });
  }
  if (front) {
    // Shoulder and hip bars give the front view its shape.
    limb(pts.shoulderN, pts.shoulderF, 8, c.near, hotSet.has('torsoUpper'));
    limb(pts.hipN, pts.hipF, 9, c.near, hotSet.has('glutes'));
  }
  if (hotSet.has('glutes')) {
    s.push({ kind: 'circle', c: pts.hip, r: 9, color: c.hot, opacity: 0.35, glow: true });
    s.push({ kind: 'circle', c: pts.hip, r: 6.5, color: c.hot });
  }

  // Neck and head.
  limb(pts.neck, [pts.neck[0] + (pts.head[0] - pts.neck[0]) * 0.3, pts.neck[1] + (pts.head[1] - pts.neck[1]) * 0.3], 5, c.near, hotSet.has('neck'));
  s.push({ kind: 'circle', c: pts.head, r: LEN.headR, color: c.near });
  const hdx = (pts.head[0] - pts.neck[0]) / (LEN.neck + LEN.headR);
  const hdy = (pts.head[1] - pts.neck[1]) / (LEN.neck + LEN.headR);
  if (front) {
    const ex = -hdy;
    const ey = hdx;
    s.push({ kind: 'circle', c: [pts.head[0] + ex * 2.6 + hdx * 0.5, pts.head[1] + ey * 2.6 + hdy * 0.5], r: 1, color: c.face });
    s.push({ kind: 'circle', c: [pts.head[0] - ex * 2.6 + hdx * 0.5, pts.head[1] - ey * 2.6 + hdy * 0.5], r: 1, color: c.face });
  } else {
    // Eye towards the face side: the head direction turned 90° forward.
    const fx = -hdy;
    const fy = hdx;
    s.push({ kind: 'circle', c: [pts.head[0] + fx * 4 + hdx * 1.2, pts.head[1] + fy * 4 + hdy * 1.2], r: 1.1, color: c.face });
  }

  // Near side on top.
  limb(pts.hipN, pts.kneeN, 8, c.near, hotSet.has('thighs'));
  limb(pts.kneeN, pts.ankleN, 7, c.near, hotSet.has('shins'));
  limb(pts.ankleN, pts.toeN, 4.5, c.near, false);
  if (hotSet.has('shoulders')) {
    for (const sh of front ? [pts.shoulderN, pts.shoulderF] : [pts.shoulderN]) {
      s.push({ kind: 'circle', c: sh, r: 7.5, color: c.hot, opacity: 0.35, glow: true });
      s.push({ kind: 'circle', c: sh, r: 5, color: c.hot });
    }
  }
  limb(pts.shoulderN, pts.elbowN, 6.5, c.near, hotSet.has('upperArms'));
  limb(pts.elbowN, pts.handN, 5.5, c.near, hotSet.has('forearms'));
  s.push({ kind: 'circle', c: pts.handN, r: 3, color: hotSet.has('forearms') ? c.hot : c.near });
  return s;
}

