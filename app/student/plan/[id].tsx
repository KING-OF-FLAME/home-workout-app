import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Card, EmptyState, ErrorText, Loading, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { useAsync } from '@/lib/useAsync';
import { equipmentSummary, estimateMinutes } from '@/lib/workout';
import { getAssignment, listMyCompletions } from '@/services/cloud';
import { useApp, useColors } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

export default function StudentPlan() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { history } = useApp();
  const { profile } = useAuth();
  const { data, loading, error } = useAsync(async () => {
    const [a, comps] = await Promise.all([getAssignment(id), profile ? listMyCompletions(profile.uid) : Promise.resolve([])]);
    return { a, comps };
  }, [id, profile?.uid]);

  if (loading) return <Loading />;
  if (error) return <Screen><ErrorText message={error} /></Screen>;
  const a = data?.a;
  if (!a?.workoutPlan) return <EmptyState icon="alert-circle" title="Plan not found" />;
  const plan = a.workoutPlan;
  const done = new Set<number>([
    ...history.filter((h) => h.kind === 'assignment' && h.refId === a.id && !h.title.endsWith('(partial)')).map((h) => h.day ?? 0),
    ...(data?.comps ?? []).filter((x) => x.assignmentId === a.id && x.day !== null && !x.title.endsWith('(partial)')).map((x) => x.day as number),
  ]);

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
      <Card style={{ marginTop: spacing.md }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Txt style={{ fontWeight: '700' }}>{done.size}/{plan.days.length} days done</Txt>
          <Txt variant="small" dim>Starts {a.startDate}</Txt>
        </Row>
        <ProgressBar value={done.size / Math.max(1, plan.days.length)} />
      </Card>
      <SectionHeader title="Days" />
      {plan.days.map((d, i) => (
        <Pressable
          key={d.id ?? i}
          onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'assignment', id: a.id, day: String(i) } })}
          style={({ pressed }) => [
            { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.md, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border },
            pressed && { opacity: 0.8 },
          ]}
        >
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: done.has(i) ? c.accent : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
            {done.has(i) ? <Ionicons name="checkmark" size={18} color="#0E0F13" /> : <Txt variant="small" style={{ fontWeight: '700' }}>{i + 1}</Txt>}
          </View>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontWeight: '600' }}>{d.title || `Day ${i + 1}`}</Txt>
            <Txt variant="small" muted>~{estimateMinutes(d)} min · {d.items.length} exercises · {equipmentSummary(d)}</Txt>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      ))}
    </Screen>
  );
}
