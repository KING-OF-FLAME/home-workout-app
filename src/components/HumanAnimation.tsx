import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { BODY_LABEL, MUSCLE_INFO } from '@/data/muscles';
import { HUMAN_FRAME, HUMAN_MOVES, HUMAN_SHEETS, HUMAN_THUMBS } from '@/data/humanSprites';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';
import { Txt } from './ui';

export type BodySex = 'male' | 'female';

export function useBodySex(): BodySex {
  return useApp().profile.sex === 'female' ? 'female' : 'male';
}

export function hasHuman(id: string, sex: BodySex = 'male'): boolean {
  return Boolean(HUMAN_MOVES[id] && HUMAN_SHEETS[sex][id]);
}

export function humanThumb(id: string, sex: BodySex): number | undefined {
  return HUMAN_THUMBS[sex][id];
}

/**
 * Realistic demo: a male or female body (rendered in 3D) performs the move in
 * a loop. Frames come from one sprite sheet per exercise, so playback, pause
 * and slow motion stay smooth and work offline.
 */
export function HumanAnimation({
  exerciseId,
  width,
  sex,
  playing = true,
  speed = 1,
  showCue = true,
  showMuscles = true,
}: {
  exerciseId: string;
  width: number;
  sex: BodySex;
  playing?: boolean;
  speed?: number;
  showCue?: boolean;
  showMuscles?: boolean;
}) {
  const c = useColors();
  const move = HUMAN_MOVES[exerciseId];
  const sheet = HUMAN_SHEETS[sex][exerciseId];
  const progress = useRef(new Animated.Value(0)).current;
  const [cue, setCue] = useState(() => move?.cues.find(Boolean) || ' ');
  const height = Math.round((width * HUMAN_FRAME.h) / HUMAN_FRAME.w);

  // Frames step on the native side, so React does not re-render every frame.
  // That keeps the JS thread free and lets screen readers and test tools see
  // the screen as settled. Only the coaching cue updates from JS, and only
  // when it changes.
  const offsets = useMemo(() => {
    if (!move) return null;
    const input: number[] = [];
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i < move.n; i++) {
      const x = -(i % HUMAN_FRAME.cols) * width;
      const y = -Math.floor(i / HUMAN_FRAME.cols) * height;
      input.push(i, i + 0.999);
      xs.push(x, x);
      ys.push(y, y);
    }
    return {
      x: progress.interpolate({ inputRange: input, outputRange: xs, extrapolate: 'clamp' }),
      y: progress.interpolate({ inputRange: input, outputRange: ys, extrapolate: 'clamp' }),
    };
  }, [move, width, height, progress]);

  useEffect(() => {
    if (!move) return;
    let last = '';
    const id = progress.addListener(({ value }) => {
      const i = Math.min(move.n - 1, Math.floor(value));
      const next = move.cues[i] || '';
      if (next && next !== last) {
        last = next;
        setCue(next);
      }
    });
    return () => progress.removeListener(id);
  }, [move, progress]);

  useEffect(() => {
    if (!move || !playing) return;
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: move.n,
        duration: move.ms / Math.max(0.1, speed),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [move, playing, speed, progress]);

  if (!move || !sheet || !offsets) return null;
  const rows = Math.ceil(move.n / HUMAN_FRAME.cols);
  const primary = MUSCLE_INFO[exerciseId]?.primary ?? [];

  return (
    <View style={{ width, backgroundColor: c.surfaceAlt, borderRadius: radius.lg, overflow: 'hidden' }} accessibilityLabel="Exercise demo">
      <View style={{ width, height, overflow: 'hidden', backgroundColor: '#0C0D10' }}>
        <Animated.Image
          source={sheet}
          fadeDuration={0}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: width * HUMAN_FRAME.cols,
            height: height * rows,
            transform: [{ translateX: offsets.x }, { translateY: offsets.y }],
          }}
        />
      </View>
      {showMuscles && primary.length ? (
        <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#000000AA', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.primary }} />
          <Txt variant="caption" color="#fff" style={{ fontWeight: '700' }}>
            {primary.map((p) => BODY_LABEL[p]).join(' · ')}
          </Txt>
        </View>
      ) : null}
      {showCue ? (
        <View style={{ paddingHorizontal: spacing.md, paddingBottom: spacing.sm, paddingTop: spacing.sm, minHeight: 34, justifyContent: 'center' }}>
          <Txt variant="small" center style={{ fontWeight: '700' }} numberOfLines={2}>
            {cue}
          </Txt>
        </View>
      ) : null}
    </View>
  );
}
