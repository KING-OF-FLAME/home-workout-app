import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Screen } from '@/components/ui';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import type { Workout } from '@/data/types';
import { uid } from '@/lib/id';
import { useApp, useColors } from '@/store/AppStore';
import { spacing } from '@/theme';

export default function Builder() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { customWorkouts, saveCustomWorkout, deleteCustomWorkout, settings } = useApp();
  const existing = customWorkouts.find((w) => w.id === id);
  const [draft, setDraft] = useState<Workout>(
    existing ?? { id: uid('cw_'), title: '', description: '', items: [], restBetweenExercises: settings.restSeconds },
  );

  const save = () => {
    if (!draft.title.trim()) return Alert.alert('Name your workout', 'Give it a name so you can find it later.');
    if (!draft.items.length) return Alert.alert('Add exercises', 'Add at least one exercise.');
    saveCustomWorkout({ ...draft, title: draft.title.trim() });
    router.back();
  };

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Save workout" icon="checkmark" onPress={save} />
        </View>
      }
    >
      <Stack.Screen options={{ title: existing ? 'Edit workout' : 'New workout' }} />
      <WorkoutEditor value={draft} onChange={setDraft} />
      {existing ? (
        <Button
          title="Delete workout"
          variant="ghost"
          style={{ marginTop: spacing.lg }}
          onPress={() =>
            Alert.alert('Delete workout?', existing.title, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { deleteCustomWorkout(existing.id); router.back(); } },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}
