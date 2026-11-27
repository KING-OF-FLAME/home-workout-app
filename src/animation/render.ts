import type { Prop } from './moves';
import { SEAT, STEP } from './moves';
import { GROUND } from './skeleton';

export type V = [number, number];

export type Shape =
  | { kind: 'line'; a: V; b: V; w: number; color: string; opacity?: number; glow?: boolean }
  | { kind: 'path'; d: string; w: number; color: string; opacity?: number; fill?: string; glow?: boolean }
  | { kind: 'circle'; c: V; r: number; color: string; opacity?: number; glow?: boolean }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; rx?: number; color: string; opacity?: number }
  | { kind: 'poly'; pts: V[]; color: string; opacity?: number; glow?: boolean; stroke?: string; strokeW?: number };

export interface FigureColors {
  /** Body colour on the near side (towards the viewer). */
  near: string;
  /** Body colour on the far side, a little darker for depth. */
  far: string;
  /** Outline and muscle definition lines. */
  line: string;
  hair: string;
  /** Main muscles worked. */
  hot: string;
  /** Muscles that help. */
  warm: string;
  prop: string;
  ground: string;
  face: string;
}

export function propShapes(props: Prop[] | undefined, c: FigureColors): Shape[] {
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

/** SVG markup for previews and tests (the app draws the same shapes with react-native-svg). */
export function toSvg(shapes: Shape[], w: number, h: number, bg = '#15171C'): string {
  const parts = shapes.map((sh) => {
    const op = sh.opacity !== undefined ? ` opacity="${sh.opacity}"` : '';
    if (sh.kind === 'line') return `<line x1="${fmt(sh.a[0])}" y1="${fmt(sh.a[1])}" x2="${fmt(sh.b[0])}" y2="${fmt(sh.b[1])}" stroke="${sh.color}" stroke-width="${sh.w}" stroke-linecap="round"${op}/>`;
    if (sh.kind === 'path') return `<path d="${sh.d}" stroke="${sh.color}" stroke-width="${sh.w}" stroke-linecap="round" fill="none"${op}/>`;
    if (sh.kind === 'poly') return `<polygon points="${sh.pts.map((p) => `${fmt(p[0])},${fmt(p[1])}`).join(' ')}" fill="${sh.color}"${op}${sh.stroke ? ` stroke="${sh.stroke}" stroke-width="${sh.strokeW ?? 0.5}"` : ''}/>`;
    if (sh.kind === 'circle') return `<circle cx="${fmt(sh.c[0])}" cy="${fmt(sh.c[1])}" r="${sh.r}" fill="${sh.color}"${op}/>`;
    return `<rect x="${fmt(sh.x)}" y="${fmt(sh.y)}" width="${sh.w}" height="${sh.h}" rx="${sh.rx ?? 0}" fill="${sh.color}"${op}/>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}"><rect width="100%" height="100%" fill="${bg}"/>${parts.join('')}</svg>`;
}
