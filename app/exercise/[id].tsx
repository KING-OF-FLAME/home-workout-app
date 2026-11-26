import { Stack, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ExerciseThumb, groupLabel } from '@/components/ExerciseThumb';
import { Button, Card, EmptyState, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { EQUIPMENT_LABEL } from '@/lib/workout';
import { useColors } from '@/store/AppStore';
import { muscleColors, spacing } from '@/theme';

const LEVEL = ['', 'Beginner', 'Intermediate', 'Advanced'];

export default function ExerciseDetail() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const ex = getExercise(id);
  if (!ex) return <EmptyState icon="alert-circle" title="Exercise not found" />;
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ex.name }} />
      <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
        <ExerciseThumb exercise={ex} size={160} />
      </View>
      <Txt variant="h1" center>{ex.name}</Txt>
      <Row style={{ justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Txt variant="small" color={muscleColors[ex.group]} style={{ fontWeight: '700' }}>{groupLabel(ex.group)}</Txt>
        <Txt variant="small" muted>· {LEVEL[ex.level]} · {EQUIPMENT_LABEL[ex.equipment]}</Txt>
      </Row>
      <Row style={{ marginTop: spacing.lg }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{ex.mode === 'time' ? `${ex.defaultSeconds}s` : ex.defaultReps}</Txt>
          <Txt variant="caption" muted>{ex.mode === 'time' ? 'Default time' : 'Default reps'}{ex.perSide ? ' / side' : ''}</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{ex.met}</Txt>
          <Txt variant="caption" muted>Intensity (MET)</Txt>
        </Card>
      </Row>
      <SectionHeader title="Muscles worked" />
      <Txt dim>{ex.muscles.join(', ')}</Txt>
      <SectionHeader title="How to do it" />
      {ex.steps.map((s, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', marginBottom: spacing.md }} gap={spacing.md}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="small" color="#fff" style={{ fontWeight: '800' }}>{i + 1}</Txt>
          </View>
          <Txt style={{ flex: 1 }}>{s}</Txt>
        </Row>
      ))}
      {ex.tip ? (
        <Card tint={c.surfaceAlt}>
          <Txt variant="label" color={c.warning}>Coach tip</Txt>
          <Txt dim style={{ marginTop: 4 }}>{ex.tip}</Txt>
        </Card>
      ) : null}
      <Button title="Read instructions aloud" icon="volume-high" variant="secondary" style={{ marginTop: spacing.lg }} onPress={() => { Speech.stop(); Speech.speak(`${ex.name}. ${ex.steps.join(' ')} ${ex.tip ?? ''}`); }} />
      <BannerAdSlot placement="exerciseDetail" />
    </Screen>
  );
}
