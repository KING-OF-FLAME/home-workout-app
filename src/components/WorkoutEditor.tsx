import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { getExercise } from '@/data/exercises';
import type { Workout, WorkoutItem } from '@/data/types';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';
import { ExercisePicker } from './ExercisePicker';
import { ExerciseThumb } from './ExerciseThumb';
import { Button, Card, Field, Row, Stepper, Txt } from './ui';

/** Edit the exercises of one workout (used by the custom builder and the trainer plan builder). */
export function WorkoutEditor({ value, onChange, showTitle = true }: { value: Workout; onChange: (w: Workout) => void; showTitle?: boolean }) {
  const c = useColors();
  const { settings } = useApp();
  const [picking, setPicking] = useState(false);

  const setItem = (i: number, patch: Partial<WorkoutItem>) =>
    onChange({ ...value, items: value.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });
  const remove = (i: number) => onChange({ ...value, items: value.items.filter((_, idx) => idx !== i) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.items.length) return;
    const items = [...value.items];
    [items[i], items[j]] = [items[j], items[i]];
    onChange({ ...value, items });
  };
  const add = (exerciseId: string) => {
    const ex = getExercise(exerciseId);
    if (!ex) return;
    const item: WorkoutItem = {
      exerciseId,
      sets: 2,
      restSeconds: settings.restSeconds,
      ...(ex.mode === 'time' ? { seconds: ex.defaultSeconds ?? 30 } : { reps: ex.defaultReps ?? 10 }),
    };
    onChange({ ...value, items: [...value.items, item] });
  };

  return (
    <View>
      {showTitle ? (
        <>
          <Field label="Workout name" value={value.title} onChangeText={(title) => onChange({ ...value, title })} placeholder="e.g. Monday Upper Body" />
          <Field label="Description (optional)" value={value.description ?? ''} onChangeText={(description) => onChange({ ...value, description })} placeholder="What is this workout for?" />
        </>
      ) : null}

      {value.items.map((item, i) => {
        const ex = getExercise(item.exerciseId);
        if (!ex) return null;
        return (
          <Card key={`${item.exerciseId}-${i}`} style={{ marginBottom: spacing.md, padding: spacing.md }}>
            <Row>
              <ExerciseThumb exercise={ex} size={40} />
              <Txt style={{ flex: 1, fontWeight: '700' }}>
                {i + 1}. {ex.name}
              </Txt>
              <Pressable onPress={() => move(i, -1)} hitSlop={8} accessibilityLabel="Move up">
                <Ionicons name="chevron-up" size={20} color={c.textDim} />
              </Pressable>
              <Pressable onPress={() => move(i, 1)} hitSlop={8} accessibilityLabel="Move down">
                <Ionicons name="chevron-down" size={20} color={c.textDim} />
              </Pressable>
              <Pressable onPress={() => remove(i)} hitSlop={8} accessibilityLabel="Remove">
                <Ionicons name="trash-outline" size={19} color={c.danger} />
              </Pressable>
            </Row>
            <View style={{ marginTop: spacing.md, gap: spacing.sm, backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small" dim>Sets</Txt>
                <Stepper value={item.sets} min={1} max={10} onChange={(sets) => setItem(i, { sets })} />
              </Row>
              {ex.mode === 'time' ? (
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="small" dim>Time{ex.perSide ? ' (each side)' : ''}</Txt>
                  <Stepper value={item.seconds ?? ex.defaultSeconds ?? 30} min={10} max={600} step={5} suffix="s" onChange={(seconds) => setItem(i, { seconds })} />
                </Row>
              ) : (
                <Row style={{ justifyContent: 'space-between' }}>
                  <Txt variant="small" dim>Reps{ex.perSide ? ' (each side)' : ''}</Txt>
                  <Stepper value={item.reps ?? ex.defaultReps ?? 10} min={1} max={200} onChange={(reps) => setItem(i, { reps })} />
                </Row>
              )}
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt variant="small" dim>Rest after set</Txt>
                <Stepper value={item.restSeconds} min={0} max={300} step={5} suffix="s" onChange={(restSeconds) => setItem(i, { restSeconds })} />
              </Row>
            </View>
            <Field
              placeholder="Coach note (optional)"
              value={item.note ?? ''}
              onChangeText={(note) => setItem(i, { note })}
              style={{ marginTop: spacing.sm, paddingVertical: 9, fontSize: 13 }}
            />
          </Card>
        );
      })}

      <Button title="Add exercise" icon="add" variant="secondary" onPress={() => setPicking(true)} />
      <ExercisePicker visible={picking} onClose={() => setPicking(false)} onPick={add} />
    </View>
  );
}
