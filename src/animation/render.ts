import type { BodySlug } from '@/data/muscles';
import type { Prop } from './moves';
import { SEAT, STEP } from './moves';
import { GROUND, LEN, type Points, type View } from './skeleton';

export type Shape =
  | { kind: 'line'; a: [number, number]; b: [number, number]; w: number; color: string; opacity?: number; glow?: boolean }
  | { kind: 'path'; d: string; w: number; color: string; opacity?: number; fill?: string; glow?: boolean }
  | { kind: 'circle'; c: [number, number]; r: number; color: string; opacity?: number; glow?: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; color: string; opacity?: number };

export interface FigureColors {
  near: string;
  far: string;
  hot: string;
  prop: string;
  ground: string;
  face: string;
}

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

function propShapes(props: Prop[] | undefined, c: FigureColors): Shape[] {
  const out: Shape[] = [];
  for (const p of props ?? []) {
    if (p.kind === 'mat') out.push({ kind: 'rect', x: p.x - 62, y: GROUND - 2, w: 124, h: 3, rx: 1.5, color: c.prop, opacity: 0.55 });
    if (p.kind === 'wall') out.push({ kind: 'rect', x: p.x, y: GROUND - 100, w: 8, h: 100, color: c.prop, opacity: 0.7 });
    if (p.kind === 'door') {
      out.push({ kind: 'rect', x: p.x, y: GROUND - 100, w: 5, h: 100, color: c.prop, opacity: 0.7 });
      out.push({ kind: 'circle', c: [p.x - 1, GROUND - 52], r: 2, color: c.prop });
    }
    if (p.kind === 'step') out.push({ kind: 'rect', x: p.x, y: GROUND - STEP, w: 40, h: STEP, rx: 2, color: c.prop, opacity: 0.8 });
    if (p.kind === 'chair') {
      const seatY = GROUND - SEAT;
      out.push({ kind: 'rect', x: p.x, y: seatY, w: 28, h: 4, rx: 1.5, color: c.prop });
      out.push({ kind: 'rect', x: p.x + 1, y: seatY, w: 3, h: SEAT, color: c.prop, opacity: 0.85 });
      out.push({ kind: 'rect', x: p.x + 24, y: seatY, w: 3, h: SEAT, color: c.prop, opacity: 0.85 });
      const bx = p.back === 'right' ? p.x + 24 : p.x + 1;
      out.push({ kind: 'rect', x: bx, y: seatY - 26, w: 3, h: 26, color: c.prop, opacity: 0.85 });
    }
  }
  return out;
}

const fmt = (n: number) => Math.round(n * 10) / 10;

/** Shapes for one frame, back to front. `glow` shapes pulse in the component. */
export function figureShapes(pts: Points, view: View, props: Prop[] | undefined, spine: number, hot: Set<Part>, c: FigureColors): Shape[] {
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
  limb(pts.hipF, pts.kneeF, 7.5, farColor, hot.has('thighs'));
  limb(pts.kneeF, pts.ankleF, 6.5, farColor, hot.has('shins'));
  limb(pts.ankleF, pts.toeF, 4.5, farColor, false);
  limb(pts.shoulderF, pts.elbowF, 6, farColor, hot.has('upperArms'));
  limb(pts.elbowF, pts.handF, 5, farColor, hot.has('forearms'));

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
    if (hot.has(part)) s.push({ kind: 'path', d, w: torsoW + 6, color: c.hot, opacity: 0.35, glow: true });
    s.push({ kind: 'path', d, w: torsoW, color: hot.has(part) ? c.hot : c.near });
  }
  if (front) {
    // Shoulder and hip bars give the front view its shape.
    limb(pts.shoulderN, pts.shoulderF, 8, c.near, hot.has('torsoUpper'));
    limb(pts.hipN, pts.hipF, 9, c.near, hot.has('glutes'));
  }
  if (hot.has('glutes')) {
    s.push({ kind: 'circle', c: pts.hip, r: 9, color: c.hot, opacity: 0.35, glow: true });
    s.push({ kind: 'circle', c: pts.hip, r: 6.5, color: c.hot });
  }

  // Neck and head.
  limb(pts.neck, [pts.neck[0] + (pts.head[0] - pts.neck[0]) * 0.3, pts.neck[1] + (pts.head[1] - pts.neck[1]) * 0.3], 5, c.near, hot.has('neck'));
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
  limb(pts.hipN, pts.kneeN, 8, c.near, hot.has('thighs'));
  limb(pts.kneeN, pts.ankleN, 7, c.near, hot.has('shins'));
  limb(pts.ankleN, pts.toeN, 4.5, c.near, false);
  if (hot.has('shoulders')) {
    for (const sh of front ? [pts.shoulderN, pts.shoulderF] : [pts.shoulderN]) {
      s.push({ kind: 'circle', c: sh, r: 7.5, color: c.hot, opacity: 0.35, glow: true });
      s.push({ kind: 'circle', c: sh, r: 5, color: c.hot });
    }
  }
  limb(pts.shoulderN, pts.elbowN, 6.5, c.near, hot.has('upperArms'));
  limb(pts.elbowN, pts.handN, 5.5, c.near, hot.has('forearms'));
  s.push({ kind: 'circle', c: pts.handN, r: 3, color: hot.has('forearms') ? c.hot : c.near });
  return s;
}

/** SVG markup for previews and tests (the app draws the same shapes with react-native-svg). */
export function toSvg(shapes: Shape[], w: number, h: number, bg = '#15171C'): string {
  const parts = shapes.map((sh) => {
    const op = sh.opacity !== undefined ? ` opacity="${sh.opacity}"` : '';
    if (sh.kind === 'line') return `<line x1="${fmt(sh.a[0])}" y1="${fmt(sh.a[1])}" x2="${fmt(sh.b[0])}" y2="${fmt(sh.b[1])}" stroke="${sh.color}" stroke-width="${sh.w}" stroke-linecap="round"${op}/>`;
    if (sh.kind === 'path') return `<path d="${sh.d}" stroke="${sh.color}" stroke-width="${sh.w}" stroke-linecap="round" fill="none"${op}/>`;
    if (sh.kind === 'circle') return `<circle cx="${fmt(sh.c[0])}" cy="${fmt(sh.c[1])}" r="${sh.r}" fill="${sh.color}"${op}/>`;
    return `<rect x="${fmt(sh.x)}" y="${fmt(sh.y)}" width="${sh.w}" height="${sh.h}" rx="${sh.rx ?? 0}" fill="${sh.color}"${op}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}"><rect width="100%" height="100%" fill="${bg}"/>${parts.join('')}</svg>`;
}
