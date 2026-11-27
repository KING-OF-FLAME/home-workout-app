import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import { EXERCISE_FRAMES } from '@/data/exerciseMedia';
import { muscleInfo } from '@/data/muscles';
import type { Exercise } from '@/data/types';
import { useApp, useColors, type DemoStyle } from '@/store/AppStore';
import { muscleColors, radius } from '@/theme';
import { ExerciseFigure, hasFigure } from './ExerciseFigure';
import { HumanAnimation, hasHuman, useBodySex } from './HumanAnimation';
import { MuscleMap } from './MuscleMap';
import { Chip, Row, Txt } from './ui';

/** True when real start/finish photos exist for this exercise. */
export function hasDemo(id: string): boolean {
  return Boolean(EXERCISE_FRAMES[id]);
}

export type DemoMode = DemoStyle;

/** Demo styles in the order the switch shows them. */
export const DEMO_STYLES: { id: DemoStyle; label: string; icon: 'body' | 'man' | 'accessibility' | 'image-outline' }[] = [
  { id: '3d', label: '3D body', icon: 'body' },
  { id: 'drawn', label: 'Drawn', icon: 'man' },
  { id: 'simple', label: 'Simple', icon: 'accessibility' },
  { id: 'photo', label: 'Photos', icon: 'image-outline' },
];

/** Styles that really exist for this exercise (Photos only where photos ship). */
export function stylesFor(id: string, sex: 'male' | 'female' = 'male'): DemoStyle[] {
  return DEMO_STYLES.map((s) => s.id).filter((s) =>
    s === '3d' ? hasHuman(id, sex) : s === 'photo' ? Boolean(EXERCISE_FRAMES[id]) : hasFigure(id),
  );
}

/**
 * Exercise demo in the style the user picked (Profile, or the switch on the
 * exercise page and in the player):
 *  - 3d: a realistic male or female 3D body performs the move.
 *  - drawn: the detailed drawn body with the worked muscles glowing.
 *  - simple: the first, lighter stick figure.
 *  - photo: real start and finish photos crossfade (for exercises that have them).
 * If a style is missing for an exercise, the next best one is shown.
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
  const { settings } = useApp();
  const m: DemoMode = mode ?? (photo ? 'photo' : settings.demoStyle ?? '3d');
  if (m === 'photo' && EXERCISE_FRAMES[exercise.id]) {
    return <PhotoDemo exercise={exercise} width={width} playing={playing} speed={speed} />;
  }
  if (m === '3d' && hasHuman(exercise.id, sex)) {
    return <HumanAnimation exerciseId={exercise.id} width={width} sex={sex} playing={playing} speed={speed} showCue={showCue} />;
  }
  if (hasFigure(exercise.id)) {
    return <ExerciseFigure exerciseId={exercise.id} width={width} playing={playing} speed={speed} showCue={showCue} variant={m === 'simple' ? 'simple' : 'drawn'} />;
  }
  if (hasHuman(exercise.id, sex)) {
    return <HumanAnimation exerciseId={exercise.id} width={width} sex={sex} playing={playing} speed={speed} showCue={showCue} />;
  }
  return <PhotoDemo exercise={exercise} width={width} playing={playing} speed={speed} />;
}


/**
 * Chips to switch the demo style. The choice is saved, so the player, the
 * exercise pages and the lists all use it until it is changed again.
 */
export function DemoStyleSwitch({ exerciseId, compact = false }: { exerciseId: string; compact?: boolean }) {
  const sex = useBodySex();
  const { settings, updateSettings } = useApp();
  const available = stylesFor(exerciseId, sex);
  if (available.length < 2) return null;
  const current = available.includes(settings.demoStyle) ? settings.demoStyle : available[0];
  return (
    <Row style={{ justifyContent: 'center', flexWrap: 'wrap', marginTop: compact ? 2 : 4 }} gap={compact ? 4 : 8}>
      {DEMO_STYLES.filter((d) => available.includes(d.id)).map((d) => (
        <Chip key={d.id} icon={d.icon} label={d.label} active={current === d.id} onPress={() => updateSettings({ demoStyle: d.id })} />
      ))}
    </Row>
  );
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
