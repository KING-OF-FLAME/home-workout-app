import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Button, Card, EmptyState, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { listMealPlans, type MealPlan } from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { spacing } from '@/theme';

export default function MealPlans() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useAuth();
  const [plans, setPlans] = useState<MealPlan[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      listMealPlans(profile.uid).then(setPlans).catch((e) => { setError(friendlyAuthError(e)); setPlans([]); });
    }, [profile]),
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Meal plans', headerRight: () => <Button title="New" icon="add" small onPress={() => router.push('/trainer/meals/edit')} /> }} />
      <ErrorText message={error} />
      {plans === null ? (
        <Loading />
      ) : plans.length === 0 ? (
        <EmptyState icon="restaurant" title="No meal plans yet" message="Create meals with calories and macros, then assign them to students." action="Create meal plan" onAction={() => router.push('/trainer/meals/edit')} />
      ) : (
        plans.map((p) => (
          <Card key={p.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/trainer/meals/edit', params: { id: p.id } })}>
            <Row>
              <Ionicons name="restaurant" size={22} color={c.warning} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{p.name}</Txt>
                <Txt variant="small" muted>{p.targetCalories ? `${p.targetCalories} kcal/day · ` : ''}{p.days.length} day{p.days.length === 1 ? '' : 's'}</Txt>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
