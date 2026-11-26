import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { resolveWorkout } from '@/lib/sources';
import { useAsync } from '@/lib/useAsync';
import { equipmentFor, EQUIPMENT_LABEL, estimateCalories, estimateMinutes, itemTarget } from '@/lib/workout';
import { useApp, useColors, type WorkoutSourceKind } from '@/store/AppStore';
import { spacing } from '@/theme';

export default function WorkoutPreview() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: WorkoutSourceKind; id: string; day?: string }>();
  const day = params.day ? Number(params.day) : undefined;
  const { customWorkouts, profile, programProgress } = useApp();
  const intensity = params.kind === 'program' ? programProgress[params.id]?.intensity ?? 1 : 1;
  const { data, loading, error } = useAsync(() => resolveWorkout(params.kind, params.id, day, customWorkouts), [params.kind, params.id, day, customWorkouts]);

  if (loading) return <Loading />;
  if (error) return <Screen><ErrorText message={error} /></Screen>;
  if (!data) return <EmptyState icon="alert-circle" title="Workout not found" />;
  const { workout } = data;
  const eq = equipmentFor(workout);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button
            title="Start workout"
            icon="play"
            disabled={workout.items.length === 0}
            onPress={() => router.push({ pathname: '/player', params: { kind: params.kind, id: params.id, day: params.day ?? '' } })}
          />
        </View>
      }
    >
      <Stack.Screen options={{ title: '' }} />
      {data.subtitle ? <Txt variant="label" muted>{data.subtitle}</Txt> : null}
      <Txt variant="h1" style={{ marginTop: 4 }}>{data.title}</Txt>
      {workout.description ? <Txt dim style={{ marginTop: spacing.sm }}>{workout.description}</Txt> : null}
      <Row style={{ marginTop: spacing.lg }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{estimateMinutes(workout, intensity)}</Txt>
          <Txt variant="caption" muted>minutes</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{workout.items.length}</Txt>
          <Txt variant="caption" muted>exercises</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">~{estimateCalories(workout, profile.weightKg, intensity)}</Txt>
          <Txt variant="caption" muted>kcal</Txt>
        </Card>
      </Row>
      <Card style={{ marginTop: spacing.md }} tint={c.surfaceAlt}>
        <Txt variant="small" dim>
          {eq.filter((e) => e !== 'mat').length === 0
            ? 'No equipment needed.' + (eq.includes('mat') ? ' A mat or soft floor helps for floor moves.' : '')
            : `You will need: ${eq.map((e) => EQUIPMENT_LABEL[e].toLowerCase()).join(', ')}.`}
        </Txt>
      </Card>
      <SectionHeader title="Exercises" />
      {workout.items.map((it, i) => {
        const ex = getExercise(it.exerciseId);
        if (!ex) return null;
        const t = itemTarget(it, ex, intensity);
        return (
          <Pressable
            key={i}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }}
          >
            <ExerciseThumb exercise={ex} size={48} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{ex.name}</Txt>
              <Txt variant="small" muted>
                {it.sets > 1 ? `${it.sets} sets × ` : ''}
                {t.seconds ? `${t.seconds}s` : `${t.reps} reps`}
                {ex.perSide ? ' each side' : ''}
              </Txt>
              {it.note ? <Txt variant="small" color={c.primary}>{it.note}</Txt> : null}
            </View>
          </Pressable>
        );
      })}
      <BannerAdSlot placement="workoutPreview" />
    </Screen>
  );
}
