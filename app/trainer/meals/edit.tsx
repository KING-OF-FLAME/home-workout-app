import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Button, Card, Chip, ErrorText, Field, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { MEAL_TEMPLATES } from '@/data/mealTemplates';
import { deleteMealPlan, getMealPlan, mealDayTotals, saveMealPlan, type Meal, type MealDay } from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

const emptyMeal = (): Meal => ({ name: 'Meal', time: '', items: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
const num = (t: string) => {
  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(n) ? n : 0;
};

export default function EditMealPlan() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(Boolean(id));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState(0);
  const [days, setDays] = useState<MealDay[]>([{ title: 'Daily plan', meals: [emptyMeal()] }]);
  const [dayIdx, setDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getMealPlan(id)
      .then((p) => {
        if (p) {
          setName(p.name);
          setDescription(p.description);
          setTarget(p.targetCalories);
          setDays(p.days.length ? p.days : [{ title: 'Daily plan', meals: [] }]);
        }
      })
      .catch((e) => setError(friendlyAuthError(e)))
      .finally(() => setLoading(false));
  }, [id]);

  const day = days[dayIdx] ?? days[0];
  const totals = mealDayTotals(day);
  const setDay = (patch: Partial<MealDay>) => setDays(days.map((d, i) => (i === dayIdx ? { ...d, ...patch } : d)));
  const setMeal = (mi: number, patch: Partial<Meal>) => setDay({ meals: day.meals.map((m, i) => (i === mi ? { ...m, ...patch } : m)) });

  const save = async () => {
    if (!profile) return;
    if (!name.trim()) return setError('Give the meal plan a name.');
    setSaving(true);
    setError(null);
    try {
      await saveMealPlan({ id, trainerId: profile.uid, name: name.trim(), description: description.trim(), targetCalories: target, days });
      router.back();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Save meal plan" icon="checkmark" onPress={save} loading={saving} />
        </View>
      }
    >
      <Stack.Screen options={{ title: id ? 'Edit meal plan' : 'New meal plan' }} />
      <ErrorText message={error} />
      {!id ? (
        <>
          <Txt variant="label" muted style={{ marginBottom: 6 }}>Start from a template</Txt>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
            {MEAL_TEMPLATES.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                icon="copy-outline"
                onPress={() => {
                  setName(t.name);
                  setDescription(t.description);
                  setTarget(t.targetCalories);
                  setDays(JSON.parse(JSON.stringify(t.days)));
                  setDayIdx(0);
                }}
              />
            ))}
          </Row>
        </>
      ) : null}
      <Field label="Plan name" value={name} onChangeText={setName} placeholder="e.g. Fat loss 1600 kcal" />
      <Field label="Description / instructions" value={description} onChangeText={setDescription} multiline placeholder="Water intake, swaps, cheat meal rules..." />
      <Field label="Daily calorie target (optional)" value={target ? String(target) : ''} onChangeText={(t) => setTarget(num(t))} keyboardType="number-pad" placeholder="e.g. 1800" />

      <SectionHeader title="Days" action="Add day" onAction={() => { setDays([...days, { title: `Day ${days.length + 1}`, meals: [emptyMeal()] }]); setDayIdx(days.length); }} />
      <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
        {days.map((d, i) => (
          <Chip key={i} label={d.title || `Day ${i + 1}`} active={i === dayIdx} onPress={() => setDayIdx(i)} />
        ))}
      </Row>
      <Field label="Day title" value={day.title} onChangeText={(title) => setDay({ title })} placeholder="e.g. Monday, Training day" />
      <Card tint={c.surfaceAlt} style={{ marginBottom: spacing.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt style={{ fontWeight: '700' }}>{totals.calories} kcal{target ? ` / ${target}` : ''}</Txt>
          <Txt variant="small" dim>P {totals.protein}g · C {totals.carbs}g · F {totals.fat}g</Txt>
        </Row>
      </Card>

      {day.meals.map((m, mi) => (
        <Card key={mi} style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <Row>
            <Ionicons name="restaurant-outline" size={18} color={c.accent} />
            <Txt style={{ flex: 1, fontWeight: '700' }}>{m.name || `Meal ${mi + 1}`}</Txt>
            <Pressable onPress={() => setDay({ meals: day.meals.filter((_, i) => i !== mi) })} hitSlop={8} accessibilityLabel="Remove meal">
              <Ionicons name="trash-outline" size={18} color={c.danger} />
            </Pressable>
          </Row>
          <View style={{ marginTop: spacing.md }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <View style={{ flex: 2 }}>
                <Field placeholder="Meal name" value={m.name} onChangeText={(name) => setMeal(mi, { name })} />
              </View>
              <View style={{ flex: 1 }}>
                <Field placeholder="Time" value={m.time} onChangeText={(time) => setMeal(mi, { time })} />
              </View>
            </Row>
            <Field placeholder="Foods and portions" value={m.items} onChangeText={(items) => setMeal(mi, { items })} multiline />
            <Row>
              {(['calories', 'protein', 'carbs', 'fat'] as const).map((k) => (
                <View key={k} style={{ flex: 1 }}>
                  <Txt variant="caption" muted style={{ marginBottom: 4 }}>{k === 'calories' ? 'kcal' : `${k} g`}</Txt>
                  <Field value={m[k] ? String(m[k]) : ''} onChangeText={(t) => setMeal(mi, { [k]: num(t) } as Partial<Meal>)} keyboardType="number-pad" placeholder="0" style={{ paddingHorizontal: 10 }} />
                </View>
              ))}
            </Row>
            <Field placeholder="Note (optional)" value={m.note ?? ''} onChangeText={(note) => setMeal(mi, { note })} />
          </View>
        </Card>
      ))}
      <Button title="Add meal" icon="add" variant="secondary" onPress={() => setDay({ meals: [...day.meals, emptyMeal()] })} />
      {days.length > 1 ? (
        <Button
          title="Remove this day"
          variant="ghost"
          style={{ marginTop: spacing.sm }}
          onPress={() => { setDays(days.filter((_, i) => i !== dayIdx)); setDayIdx(0); }}
        />
      ) : null}

      {id ? (
        <View style={{ marginTop: spacing.xl, borderRadius: radius.md }}>
          <Button
            title="Delete meal plan"
            variant="ghost"
            onPress={() =>
              Alert.alert('Delete meal plan?', 'Students who already have it keep their copy.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deleteMealPlan(id); router.back(); } },
              ])
            }
          />
        </View>
      ) : null}
    </Screen>
  );
}
