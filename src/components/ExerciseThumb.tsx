import { Ionicons } from '@expo/vector-icons';
import { Image, View } from 'react-native';
import { EXERCISE_FRAMES } from '@/data/exerciseMedia';
import type { Exercise, MuscleGroup } from '@/data/types';
import { muscleColors, radius } from '@/theme';
import type { IconName } from './ui';

const groupIcon: Record<MuscleGroup, IconName> = {
  chest: 'shield',
  back: 'git-merge',
  shoulders: 'triangle',
  arms: 'barbell',
  core: 'aperture',
  legs: 'walk',
  glutes: 'ellipse',
  fullbody: 'body',
  cardio: 'heart',
  mobility: 'leaf',
};

/** Exercise photo (bundled demo or media URL), or a coloured placeholder by muscle group when no media URL is set. */
export function ExerciseThumb({ exercise, size = 52 }: { exercise: Exercise; size?: number }) {
  const color = muscleColors[exercise.group] ?? '#888';
  const frames = EXERCISE_FRAMES[exercise.id];
  if (frames) {
    return <Image source={frames[1]} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: '#fff' }} resizeMode="cover" />;
  }
  if (exercise.media) {
    return <Image source={{ uri: exercise.media }} style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: color + '33' }} />;
  }
  return (
    <View style={{ width: size, height: size, borderRadius: radius.md, backgroundColor: color + '26', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={groupIcon[exercise.group]} size={size * 0.46} color={color} />
    </View>
  );
}

export function groupLabel(g: MuscleGroup): string {
  return g === 'fullbody' ? 'Full body' : g.charAt(0).toUpperCase() + g.slice(1);
}
