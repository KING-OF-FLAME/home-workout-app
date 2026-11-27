import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
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
  const [frame, setFrame] = useState(0);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!move || !playing) return;
    const stepMs = move.ms / move.n / Math.max(0.1, speed);
    const t = setInterval(() => {
      frameRef.current = (frameRef.current + 1) % move.n;
      setFrame(frameRef.current);
    }, stepMs);
    return () => clearInterval(t);
  }, [move, playing, speed]);

  if (!move || !sheet) return null;
  const height = Math.round((width * HUMAN_FRAME.h) / HUMAN_FRAME.w);
  const rows = Math.ceil(move.n / HUMAN_FRAME.cols);
  const col = frame % HUMAN_FRAME.cols;
  const row = Math.floor(frame / HUMAN_FRAME.cols);
  const primary = MUSCLE_INFO[exerciseId]?.primary ?? [];
  const cue = move.cues[frame] || move.cues.find(Boolean) || ' ';

  return (
    <View style={{ width, backgroundColor: c.surfaceAlt, borderRadius: radius.lg, overflow: 'hidden' }} accessibilityLabel={`Exercise demo: ${cue}`}>
      <View style={{ width, height, overflow: 'hidden', backgroundColor: '#0C0D10' }}>
        <Image
          source={sheet}
          fadeDuration={0}
          style={{
            position: 'absolute',
            width: width * HUMAN_FRAME.cols,
            height: height * rows,
            left: -col * width,
            top: -row * height,
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
