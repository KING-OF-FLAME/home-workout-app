import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, EmptyState, Screen, Txt } from '@/components/ui';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import type { Workout } from '@/data/types';
import { generatedWorkout, planWorkout } from '@/lib/planGenerator';
import { useApp, useColors } from '@/store/AppStore';
import { spacing } from '@/theme';

/**
 * Change one workout of the personal plan: swap, remove, add or reorder
 * exercises and change sets, reps or time. Saved on this phone with the plan.
 *
 * Params: day=<session index, 0-based>
 */
export default function PlanEdit() {
  const c = useColors();
  const router = useRouter();
  const { day } = useLocalSearchParams<{ day: string }>();
  const session = Number(day ?? 0);
  const { myPlan, setMyPlan } = useApp();
  const [draft, setDraft] = useState<Workout | null>(() => (myPlan ? planWorkout(myPlan, session) : null));

  if (!myPlan || !draft) return <EmptyState icon="calendar" title="No plan yet" message="Build your plan first." />;
  const edited = Boolean(myPlan.edits?.[String(session)]);

  const save = () => {
    if (!draft.items.length) return Alert.alert('Add exercises', 'A workout needs at least one exercise.');
    setMyPlan({ ...myPlan, edits: { ...(myPlan.edits ?? {}), [String(session)]: draft.items } });
    router.back();
  };

  const reset = () =>
    Alert.alert('Use the original workout?', 'Your changes to this workout will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          const edits = { ...(myPlan.edits ?? {}) };
          delete edits[String(session)];
          setMyPlan({ ...myPlan, edits });
          setDraft(generatedWorkout(myPlan, session));
          router.back();
        },
      },
    ]);

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Save changes" icon="checkmark" onPress={save} />
        </View>
      }
    >
      <Stack.Screen options={{ title: `Edit day ${session + 1}` }} />
      <Txt variant="h2">{draft.title}</Txt>
      <Txt dim style={{ marginTop: 4, marginBottom: spacing.md }}>
        Swap, remove or add exercises, and change sets, reps or time. Only this workout changes.
      </Txt>
      <WorkoutEditor value={draft} onChange={setDraft} showTitle={false} />
      {edited ? <Button title="Reset to the original workout" variant="ghost" style={{ marginTop: spacing.lg }} onPress={reset} /> : null}
    </Screen>
  );
}
