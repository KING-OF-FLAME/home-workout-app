import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Chip, EmptyState, ErrorText, Loading, ProgressBar, Row, Screen, Txt } from '@/components/ui';
import { dayKey } from '@/lib/dates';
import { useAsync } from '@/lib/useAsync';
import { getAssignment, mealDayTotals } from '@/services/cloud';
import { useApp, useColors } from '@/store/AppStore';
import { spacing } from '@/theme';

export default function StudentMeals() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { mealChecks, toggleMeal } = useApp();
  const { data: a, loading, error } = useAsync(() => getAssignment(id), [id]);
  const [dayIdx, setDayIdx] = useState(0);

  if (loading) return <Loading />;
  if (error) return <Screen><ErrorText message={error} /></Screen>;
  if (!a?.mealPlan) return <EmptyState icon="alert-circle" title="Meal plan not found" />;
  const plan = a.mealPlan;
  const day = plan.days[dayIdx] ?? plan.days[0];
  if (!day) return <EmptyState icon="restaurant" title="This plan has no meals yet" />;
  const totals = mealDayTotals(day);
  const key = `${a.id}:${dayIdx}:${dayKey()}`;
  const checked = mealChecks[key] ?? [];
  const eaten = day.meals.reduce((s, m, i) => s + (checked.includes(i) ? m.calories : 0), 0);
  const target = plan.targetCalories || totals.calories;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: '' }} />
      <Txt variant="label" muted>From {a.trainerName}</Txt>
      <Txt variant="h1">{a.title}</Txt>
      {plan.description ? <Txt dim style={{ marginTop: spacing.sm }}>{plan.description}</Txt> : null}
      {a.note ? (
        <Card tint={c.primary + '1f'} style={{ marginTop: spacing.md }}>
          <Row>
            <Ionicons name="chatbubble-ellipses" size={18} color={c.primary} />
            <Txt style={{ flex: 1 }}>{a.note}</Txt>
          </Row>
        </Card>
      ) : null}
      {plan.days.length > 1 ? (
        <Row style={{ flexWrap: 'wrap', marginTop: spacing.lg }}>
          {plan.days.map((d, i) => (
            <Chip key={i} label={d.title || `Day ${i + 1}`} active={i === dayIdx} onPress={() => setDayIdx(i)} />
          ))}
        </Row>
      ) : null}
      <Card style={{ marginTop: spacing.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h3">Today</Txt>
          <Txt dim>{eaten} / {target} kcal</Txt>
        </Row>
        <View style={{ marginVertical: spacing.sm }}>
          <ProgressBar value={eaten / Math.max(1, target)} color={c.accent} />
        </View>
        <Txt variant="small" muted>Protein {totals.protein}g · Carbs {totals.carbs}g · Fat {totals.fat}g planned</Txt>
      </Card>
      {day.meals.map((m, i) => {
        const isDone = checked.includes(i);
        return (
          <Pressable key={i} onPress={() => toggleMeal(key, i)}>
            <Card style={{ marginTop: spacing.md, opacity: isDone ? 0.7 : 1 }}>
              <Row style={{ alignItems: 'flex-start' }}>
                <Ionicons name={isDone ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={isDone ? c.accent : c.textMuted} />
                <View style={{ flex: 1 }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Txt variant="h3">{m.name}</Txt>
                    <Txt variant="small" muted>{m.time}</Txt>
                  </Row>
                  <Txt dim style={{ marginTop: 4 }}>{m.items}</Txt>
                  <Txt variant="small" muted style={{ marginTop: 6 }}>
                    {m.calories} kcal · P {m.protein}g · C {m.carbs}g · F {m.fat}g
                  </Txt>
                  {m.note ? <Txt variant="small" color={c.primary} style={{ marginTop: 4 }}>{m.note}</Txt> : null}
                </View>
              </Row>
            </Card>
          </Pressable>
        );
      })}
      <Txt variant="caption" muted center style={{ marginTop: spacing.lg }}>Tap a meal to mark it eaten. Ticks reset each day.</Txt>
    </Screen>
  );
}
