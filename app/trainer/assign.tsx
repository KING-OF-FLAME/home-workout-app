import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Button, EmptyState, ErrorText, Field, IconButton, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { addDays, dayKey } from '@/lib/dates';
import {
  assignPlan,
  getRosterEntry,
  listMealPlans,
  listWorkoutPlans,
  type MealPlan,
  type RosterEntry,
  type WorkoutPlan,
} from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

export default function AssignPlan() {
  const c = useColors();
  const router = useRouter();
  const { student: studentId, type } = useLocalSearchParams<{ student: string; type: 'workout' | 'meal' }>();
  const { profile } = useAuth();
  const [student, setStudent] = useState<RosterEntry | null>(null);
  const [plans, setPlans] = useState<(WorkoutPlan | MealPlan)[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isWorkout = type !== 'meal';

  useEffect(() => {
    if (!profile) return;
    Promise.all([getRosterEntry(profile.uid, studentId), isWorkout ? listWorkoutPlans(profile.uid) : listMealPlans(profile.uid)])
      .then(([s, p]) => {
        setStudent(s);
        setPlans(p);
      })
      .catch((e) => {
        setError(friendlyAuthError(e));
        setPlans([]);
      });
  }, [profile, studentId, isWorkout]);

  const startDate = dayKey(addDays(new Date(), offset));

  const assign = async () => {
    const plan = plans?.find((p) => p.id === selected);
    if (!profile || !student || !plan) return;
    setBusy(true);
    setError(null);
    try {
      await assignPlan({ trainer: profile, student, type: isWorkout ? 'workout' : 'meal', plan, startDate, note: note.trim() });
      Alert.alert('Assigned', `${plan.name} was sent to ${student.name}.`);
      router.back();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  if (plans === null) return <Loading />;

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title={`Assign to ${student?.name ?? 'student'}`} icon="send" onPress={assign} loading={busy} disabled={!selected || !student} />
        </View>
      }
    >
      <Stack.Screen options={{ title: isWorkout ? 'Assign workout plan' : 'Assign meal plan' }} />
      <ErrorText message={error} />
      <SectionHeader title="Choose a plan" action="Create new" onAction={() => router.push(isWorkout ? '/trainer/plans/edit' : '/trainer/meals/edit')} />
      {plans.length === 0 ? (
        <EmptyState
          icon={isWorkout ? 'barbell' : 'restaurant'}
          title="No plans yet"
          message="Create a plan first, then come back to assign it."
          action="Create plan"
          onAction={() => router.push(isWorkout ? '/trainer/plans/edit' : '/trainer/meals/edit')}
        />
      ) : (
        plans.map((p) => (
          <Pressable
            key={p.id}
            onPress={() => setSelected(p.id)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, marginBottom: spacing.sm,
              borderRadius: radius.lg, borderWidth: 2, borderColor: selected === p.id ? c.primary : c.border,
              backgroundColor: selected === p.id ? c.primary + '1a' : c.surface,
            }}
          >
            <Ionicons name={selected === p.id ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected === p.id ? c.primary : c.textMuted} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{p.name}</Txt>
              <Txt variant="small" muted numberOfLines={2}>{p.days.length} day{p.days.length === 1 ? '' : 's'}{p.description ? ` · ${p.description}` : ''}</Txt>
            </View>
          </Pressable>
        ))
      )}

      <SectionHeader title="Start date" />
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="chevron-back" onPress={() => setOffset(Math.max(0, offset - 1))} label="Earlier" />
        <Txt variant="h3">{offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : startDate}</Txt>
        <IconButton icon="chevron-forward" onPress={() => setOffset(offset + 1)} label="Later" />
      </Row>

      <SectionHeader title="Message for your student" />
      <Field value={note} onChangeText={setNote} multiline placeholder="e.g. Rest on Sundays. Drink 3L water daily." />
    </Screen>
  );
}
