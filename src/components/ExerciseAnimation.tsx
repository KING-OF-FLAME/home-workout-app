import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { EXERCISE_FRAMES } from '@/data/exerciseMedia';
import { muscleInfo } from '@/data/muscles';
import type { Exercise } from '@/data/types';
import { useColors } from '@/store/AppStore';
import { muscleColors, radius } from '@/theme';
import { ExerciseFigure, hasFigure } from './ExerciseFigure';
import { HumanAnimation, hasHuman, useBodySex } from './HumanAnimation';
import { MuscleMap } from './MuscleMap';
import { Txt } from './ui';

/** True when real start/finish photos exist for this exercise. */
export function hasDemo(id: string): boolean {
  return Boolean(EXERCISE_FRAMES[id]);
}

export type DemoMode = 'body' | 'muscles' | 'photo';

/**
 * Exercise demo.
 *  - body (default): a realistic male or female body (from Profile) performs the move.
 *  - muscles: the drawn figure with the worked muscles glowing.
 *  - photo: real start and finish photos crossfade (for exercises that have them).
 */
export function ExerciseAnimation({
  exercise,
  width,
  playing = true,
  speed = 1,
  photo = false,
  mode,
  showCue = true,
}: {
  exercise: Exercise;
  width: number;
  playing?: boolean;
  /** 1 = normal tempo, lower is slower. */
  speed?: number;
  /** Older flag, same as mode="photo". */
  photo?: boolean;
  mode?: DemoMode;
  showCue?: boolean;
}) {
  const sex = useBodySex();
  const m: DemoMode = mode ?? (photo ? 'photo' : 'body');
  if (m === 'photo' && EXERCISE_FRAMES[exercise.id]) {
    return <PhotoDemo exercise={exercise} width={width} playing={playing} speed={speed} />;
  }
  if (m === 'body' && hasHuman(exercise.id, sex)) {
    return <HumanAnimation exerciseId={exercise.id} width={width} sex={sex} playing={playing} speed={speed} showCue={showCue} />;
  }
  if (hasFigure(exercise.id)) {
    return <ExerciseFigure exerciseId={exercise.id} width={width} playing={playing} speed={speed} showCue={showCue} />;
  }
  return <PhotoDemo exercise={exercise} width={width} playing={playing} speed={speed} />;
}

function PhotoDemo({ exercise, width, playing, speed }: { exercise: Exercise; width: number; playing: boolean; speed: number }) {
  const c = useColors();
  const frames = EXERCISE_FRAMES[exercise.id];
  const fade = useRef(new Animated.Value(0)).current;
  const height = Math.round((width * 2) / 3);
  const hold = Math.round(650 / speed);
  const move = Math.round(750 / speed);

  useEffect(() => {
    if (!frames || !playing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(hold),
        Animated.timing(fade, { toValue: 1, duration: move, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(hold),
        Animated.timing(fade, { toValue: 0, duration: move, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [frames, playing, fade, hold, move]);

  if (frames) {
    const style = { width, height, borderRadius: radius.lg } as const;
    return (
      <View style={[style, { overflow: 'hidden', backgroundColor: '#fff' }]} accessibilityLabel={`${exercise.name} demonstration`}>
        <Image source={frames[0]} style={[style, { position: 'absolute' }]} resizeMode="cover" />
        <Animated.Image source={frames[1]} style={[style, { position: 'absolute', opacity: fade }]} resizeMode="cover" />
        <View style={{ position: 'absolute', left: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#000000aa', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Ionicons name={playing ? 'repeat' : 'pause'} size={12} color="#fff" />
          <Txt variant="caption" color="#fff">
            Start ⇄ finish
          </Txt>
        </View>
      </View>
    );
  }

  const info = muscleInfo(exercise);
  const data = [...info.primary.map((slug) => ({ slug, intensity: 3 })), ...info.secondary.map((slug) => ({ slug, intensity: 1 }))];
  const scale = Math.min(0.6, (height - 24) / 400);
  return (
    <View
      style={{ width, height, borderRadius: radius.lg, backgroundColor: (muscleColors[exercise.group] ?? c.primary) + '1A', alignItems: 'center', justifyContent: 'center' }}
      accessibilityLabel={`${exercise.name}: muscles worked`}
    >
      <MuscleMap data={data} scale={scale} legend={false} animate={playing} />
    </View>
  );
}
