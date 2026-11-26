import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { listWorkoutPlans, type WorkoutPlan } from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { spacing } from '@/theme';

export default function WorkoutPlans() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useAuth();
  const [plans, setPlans] = useState<WorkoutPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      listWorkoutPlans(profile.uid).then(setPlans).catch((e) => { setError(friendlyAuthError(e)); setPlans([]); });
    }, [profile]),
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Workout plans', headerRight: () => <Button title="New" icon="add" small onPress={() => router.push('/trainer/plans/edit')} /> }} />
      <ErrorText message={error} />
      {plans === null ? (
        <Loading />
      ) : plans.length === 0 ? (
        <EmptyState icon="barbell" title="No workout plans yet" message="Build a plan once and assign it to as many students as you like." action="Create plan" onAction={() => router.push('/trainer/plans/edit')} />
      ) : (
        plans.map((p) => (
          <Card key={p.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/trainer/plans/edit', params: { id: p.id } })}>
            <Row>
              <Ionicons name="barbell" size={22} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{p.name}</Txt>
                <Txt variant="small" muted>{p.days.length} days · {['', 'Beginner', 'Intermediate', 'Advanced'][p.level]}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
