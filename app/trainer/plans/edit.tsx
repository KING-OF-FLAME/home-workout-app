import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, Chip, ErrorText, Field, IconButton, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { WorkoutEditor } from '@/components/WorkoutEditor';
import { PROGRAMS } from '@/data/programs';
import type { Level, Workout } from '@/data/types';
import { uid } from '@/lib/id';
import { estimateMinutes } from '@/lib/workout';
import { deleteWorkoutPlan, getWorkoutPlan, saveWorkoutPlan } from '@/services/cloud';
import { useApp, useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

const emptyDay = (n: number, rest: number): Workout => ({ id: uid('d_'), title: `Day ${n}`, items: [], restBetweenExercises: rest });

export default function EditWorkoutPlan() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { profile } = useAuth();
  const { settings } = useApp();
  const [loading, setLoading] = useState(Boolean(id));
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<Level>(1);
  const [days, setDays] = useState<Workout[]>([emptyDay(1, settings.restSeconds)]);
  const [openDay, setOpenDay] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState(false);

  useEffect(() => {
    if (!id) return;
    getWorkoutPlan(id)
      .then((p) => {
        if (p) {
          setName(p.name);
          setDescription(p.description);
          setLevel(p.level);
          setDays(p.days.length ? p.days : [emptyDay(1, settings.restSeconds)]);
        }
      })
      .catch((e) => setError(friendlyAuthError(e)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const save = async () => {
    if (!profile) return;
    if (!name.trim()) return setError('Give the plan a name.');
    if (days.every((d) => d.items.length === 0)) return setError('Add at least one exercise.');
    setSaving(true);
    setError(null);
    try {
      await saveWorkoutPlan({
        id,
        trainerId: profile.uid,
        name: name.trim(),
        description: description.trim(),
        level,
        days: days.filter((d) => d.items.length > 0),
      });
      router.back();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setSaving(false);
    }
  };

  const applyTemplate = (programId: string) => {
    const p = PROGRAMS.find((x) => x.id === programId);
    if (!p) return;
    const week1 = p.days.slice(0, p.daysPerWeek).map((d) => ({ ...d, id: uid('d_'), title: d.title.replace(/^Week \d+ · /, '') }));
    setDays(week1);
    if (!name) setName(p.title);
    if (!description) setDescription(p.description);
    setLevel(p.level);
    setOpenDay(0);
    setTemplates(false);
  };

  if (loading) return <Loading />;

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title="Save plan" icon="checkmark" onPress={save} loading={saving} />
        </View>
      }
    >
      <Stack.Screen options={{ title: id ? 'Edit plan' : 'New workout plan' }} />
      <ErrorText message={error} />
      <Field label="Plan name" value={name} onChangeText={setName} placeholder="e.g. 4-week fat loss" />
      <Field label="Description" value={description} onChangeText={setDescription} placeholder="Goal, how often, any notes" multiline />
      <Txt variant="label" muted style={{ marginBottom: 6 }}>Level</Txt>
      <Row style={{ marginBottom: spacing.md }}>
        {(['Beginner', 'Intermediate', 'Advanced'] as const).map((l, i) => (
          <Chip key={l} label={l} active={level === i + 1} onPress={() => setLevel((i + 1) as Level)} />
        ))}
      </Row>
      {!id ? <Button title="Start from a template" icon="copy" variant="secondary" small onPress={() => setTemplates(true)} style={{ alignSelf: 'flex-start' }} /> : null}

      <SectionHeader title={`Days (${days.length})`} action="Add day" onAction={() => { setDays([...days, emptyDay(days.length + 1, settings.restSeconds)]); setOpenDay(days.length); }} />
      {days.map((d, i) => (
        <Card key={d.id} style={{ marginBottom: spacing.md, padding: spacing.md }}>
          <Pressable onPress={() => setOpenDay(openDay === i ? -1 : i)}>
            <Row>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Txt variant="small" color="#fff" style={{ fontWeight: '800' }}>{i + 1}</Txt>
              </View>
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: '700' }}>{d.title || `Day ${i + 1}`}</Txt>
                <Txt variant="small" muted>{d.items.length} exercises{d.items.length ? ` · ~${estimateMinutes(d)} min` : ''}</Txt>
              </View>
              <Ionicons name={openDay === i ? 'chevron-up' : 'chevron-down'} size={20} color={c.textDim} />
            </Row>
          </Pressable>
          {openDay === i ? (
            <View style={{ marginTop: spacing.md }}>
              <Field label="Day title" value={d.title} onChangeText={(title) => setDays(days.map((x, j) => (j === i ? { ...x, title } : x)))} />
              <WorkoutEditor value={d} showTitle={false} onChange={(w) => setDays(days.map((x, j) => (j === i ? w : x)))} />
              <Row style={{ marginTop: spacing.md, justifyContent: 'space-between' }}>
                <Button title="Duplicate day" small variant="ghost" icon="copy-outline" onPress={() => setDays([...days.slice(0, i + 1), { ...d, id: uid('d_'), title: `${d.title} (copy)` }, ...days.slice(i + 1)])} />
                {days.length > 1 ? (
                  <Button
                    title="Remove day"
                    small
                    variant="ghost"
                    icon="trash-outline"
                    onPress={() => Alert.alert('Remove this day?', d.title, [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Remove', style: 'destructive', onPress: () => { setDays(days.filter((_, j) => j !== i)); setOpenDay(-1); } },
                    ])}
                  />
                ) : null}
              </Row>
            </View>
          ) : null}
        </Card>
      ))}

      {id ? (
        <Button
          title="Delete plan"
          variant="ghost"
          style={{ marginTop: spacing.lg }}
          onPress={() =>
            Alert.alert('Delete plan?', 'Students who already have it keep their copy.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => { await deleteWorkoutPlan(id); router.back(); } },
            ])
          }
        />
      ) : null}

      <Modal visible={templates} animationType="slide" onRequestClose={() => setTemplates(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
          <Row style={{ padding: spacing.lg, justifyContent: 'space-between' }}>
            <Txt variant="h2">Templates</Txt>
            <IconButton icon="close" onPress={() => setTemplates(false)} label="Close" />
          </Row>
          <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
            <Txt dim>Copies week 1 of a built-in program. You can edit everything after.</Txt>
            {PROGRAMS.map((p) => (
              <Pressable key={p.id} onPress={() => applyTemplate(p.id)} style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border }}>
                <Txt variant="h3">{p.title}</Txt>
                <Txt variant="small" muted>{p.daysPerWeek} days · {p.description}</Txt>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Screen>
  );
}
