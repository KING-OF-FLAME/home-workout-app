import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Rect } from 'react-native-svg';
import { bodyShapes } from '@/animation/body';
import { MOVES } from '@/animation/moves';
import type { FigureColors, Shape } from '@/animation/render';
import { prepare, sample, timeline, VIEW_H, VIEW_W, type PreparedFrame, type Timeline } from '@/animation/skeleton';
import { BODY_LABEL, MUSCLE_INFO } from '@/data/muscles';
import { useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';
import { Txt } from './ui';

const cache = new Map<string, { prepared: PreparedFrame[]; tl: Timeline }>();
function prepared(id: string) {
  const mv = MOVES[id];
  if (!mv) return null;
  let entry = cache.get(id);
  if (!entry) {
    entry = { prepared: prepare(mv.frames, mv.view), tl: timeline(mv.frames) };
    cache.set(id, entry);
  }
  return { move: mv, ...entry };
}

export function hasFigure(id: string): boolean {
  return Boolean(MOVES[id]);
}

function ShapeEl({ s, pulse }: { s: Shape; pulse: number }) {
  const opacity = 'glow' in s && s.glow ? (s.opacity ?? 1) * pulse : s.opacity;
  switch (s.kind) {
    case 'line':
      return <Line x1={s.a[0]} y1={s.a[1]} x2={s.b[0]} y2={s.b[1]} stroke={s.color} strokeWidth={s.w} strokeLinecap="round" opacity={opacity} />;
    case 'path':
      return <Path d={s.d} stroke={s.color} strokeWidth={s.w} strokeLinecap="round" fill="none" opacity={opacity} />;
    case 'circle':
      return <Circle cx={s.c[0]} cy={s.c[1]} r={s.r} fill={s.color} opacity={opacity} />;
    case 'poly':
      return (
        <Polygon
          points={s.pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}
          fill={s.color}
          opacity={opacity}
          stroke={s.stroke}
          strokeWidth={s.stroke ? s.strokeW ?? 0.5 : 0}
          strokeLinejoin="round"
        />
      );
    case 'rect':
      return <Rect x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx ?? 0} fill={s.color} opacity={opacity} />;
  }
}

/**
 * Animated figure that performs the exercise in a loop, with the muscles it
 * works glowing. Drawn in code, so it is light and free to ship anywhere.
 */
export function ExerciseFigure({
  exerciseId,
  width,
  playing = true,
  speed = 1,
  showCue = true,
  showMuscles = true,
  background,
  rounded = true,
}: {
  exerciseId: string;
  width: number;
  playing?: boolean;
  speed?: number;
  showCue?: boolean;
  showMuscles?: boolean;
  background?: string;
  rounded?: boolean;
}) {
  const c = useColors();
  const data = prepared(exerciseId);
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!playing || !data) return;
    let raf = 0;
    let last = 0;
    let prev = 0;
    const tick = (now: number) => {
      if (!prev) prev = now;
      timeRef.current += (now - prev) * speed;
      prev = now;
      // About 30 frames a second is smooth and light on the battery.
      if (now - last > 32) {
        last = now;
        setTime(timeRef.current);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, data]);

  const colors: FigureColors = useMemo(
    () =>
      c.mode === 'dark'
        ? { near: '#C9CFD9', far: '#8A919E', line: '#2F333C', hair: '#2A2D35', hot: '#FF4B2B', warm: '#FFB199', prop: c.border, ground: c.border, face: '#22252D' }
        : { near: '#DCE1E8', far: '#AAB1BD', line: '#555B67', hair: '#3A3E48', hot: '#F0401F', warm: '#FFB59E', prop: '#C9CED6', ground: '#C9CED6', face: '#2A2D35' },
    [c],
  );
  const primary = MUSCLE_INFO[exerciseId]?.primary ?? [];
  const secondary = MUSCLE_INFO[exerciseId]?.secondary ?? [];
  const hot = useMemo(() => new Set(primary), [primary]);
  const warm = useMemo(() => new Set(secondary), [secondary]);

  if (!data) return null;
  // A still frame shows the most telling position: the end of the first move.
  const t = playing || time > 0 ? time : data.tl.segments[Math.min(1, data.tl.segments.length - 1)].start + data.tl.segments[Math.min(1, data.tl.segments.length - 1)].move;
  const r = sample(data.prepared, data.tl, t, data.move.view);
  const shapes = bodyShapes(r.points, data.move.view, data.move.props, r.spine, hot, warm, colors, data.move.faceUp);
  const pulse = 0.55 + 0.45 * Math.sin(t / 260);
  const height = (width * VIEW_H) / VIEW_W;

  return (
    <View
      style={{ width, backgroundColor: background ?? c.surfaceAlt, borderRadius: rounded ? radius.lg : 0, overflow: 'hidden' }}
      accessibilityLabel={`Animated demo: ${r.cue ?? 'exercise'}`}
    >
      <Svg width={width} height={height} viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
        {shapes.map((s, i) => (
          <ShapeEl key={i} s={s} pulse={pulse} />
        ))}
      </Svg>
      {showMuscles && primary.length ? (
        <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.bg + 'CC', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary, opacity: pulse }} />
          <Txt variant="caption" style={{ fontWeight: '700' }}>
            {primary.map((p) => BODY_LABEL[p]).join(' · ')}
          </Txt>
        </View>
      ) : null}
      {showCue ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, minHeight: 34, justifyContent: 'center' }}>
          <Txt variant="small" center style={{ fontWeight: '700' }} numberOfLines={2}>
            {r.cue ?? ' '}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
