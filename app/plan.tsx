import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, EmptyState, ProgressBar, Screen, SectionHeader, Txt } from '@/components/ui';
import {
  nextSession,
  phaseFor,
  planDay,
  planFinished,
  planLengthLabel,
  planWorkout,
  totalSessions,
  totalWeeks,
} from '@/lib/planGenerator';
import { estimateMinutes } from '@/lib/workout';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

/** Week-by-week view of the personal plan. */
export default function PlanScreen() {
  const c = useColors();
  const router = useRouter();
  const { myPlan, setMyPlan } = useApp();
  const [weeksShown, setWeeksShown] = useState(4);

  const data = useMemo(() => {
    if (!myPlan) return null;
    const next = nextSession(myPlan);
    const total = totalSessions(myPlan);
    const weeks = totalWeeks(myPlan);
    const currentWeek = Math.floor(next / myPlan.daysPerWeek) + 1;
    const firstWeek = Math.max(1, currentWeek - 1);
    const lastWeek = Math.min(weeks, firstWeek + weeksShown - 1);
    const list = [];
    for (let w = firstWeek; w <= lastWeek; w++) {
      const sessions = [];
      for (let d = 0; d < myPlan.daysPerWeek; d++) {
        const idx = (w - 1) * myPlan.daysPerWeek + d;
        if (idx >= total) break;
        sessions.push({ idx, workout: planWorkout(myPlan, idx) });
      }
      list.push({ week: w, phase: phaseFor(myPlan, w), sessions });
    }
    return { next, total, weeks, list, lastWeek };
  }, [myPlan, weeksShown]);

  if (!myPlan || !data) {
    return (
      <EmptyState
        icon="calendar"
        title="No personal plan yet"
        message="Answer a few questions and we build every workout for you."
        action="Build my plan"
        onAction={() => router.replace({ pathname: '/onboarding', params: { planOnly: '1' } })}
      />
    );
  }

  const finite = Number.isFinite(data.total);
  const done = myPlan.completed.length;
  const day = planDay(myPlan);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'My plan' }} />
      <Card tint={c.primary}>
        <Txt variant="label" color="#ffffffcc">
          {planLengthLabel(myPlan.length)}
        </Txt>
        <Txt variant="h2" color="#fff" style={{ marginTop: 4 }}>
          {finite ? `Day ${Math.min(day, myPlan.length)} of ${myPlan.length}` : `Day ${day}`}
        </Txt>
        <Txt color="#ffffffdd" style={{ marginTop: 4 }}>
          {done} workout{done === 1 ? '' : 's'} done{finite ? ` of ${data.total}` : ''} · {myPlan.daysPerWeek} a week · ~{myPlan.minutes} min
        </Txt>
        {finite ? (
          <View style={{ marginTop: spacing.md }}>
            <ProgressBar value={done / data.total} color="#fff" />
          </View>
        ) : null}
      </Card>

      {planFinished(myPlan) ? (
        <Card style={{ marginTop: spacing.md }}>
          <Txt variant="h3">Plan complete! 🎉</Txt>
          <Txt dim style={{ marginTop: 4 }}>
            You finished every workout. Start a new plan to keep progressing.
          </Txt>
          <Button title="Start a new plan" style={{ marginTop: spacing.md }} onPress={() => router.push({ pathname: '/onboarding', params: { planOnly: '1' } })} />
        </Card>
      ) : null}

      {data.list.map(({ week, phase, sessions }) => (
        <View key={week}>
          <SectionHeader title={`Week ${week}${finite ? ` of ${data.weeks}` : ''}`} />
          <Txt variant="small" color={phase.deload ? c.textMuted : c.accent} style={{ marginTop: -spacing.sm, marginBottom: spacing.sm }}>
            {phase.name} · {phase.detail}
          </Txt>
          {sessions.map(({ idx, workout }) => {
            const isDone = myPlan.completed.includes(idx);
            const isNext = idx === data.next;
            return (
              <Pressable
                key={idx}
                onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'plan', id: myPlan.id, day: String(idx) } })}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: spacing.md,
                  marginBottom: spacing.sm,
                  borderRadius: radius.lg,
                  backgroundColor: c.surface,
                  borderWidth: isNext ? 2 : 1,
                  borderColor: isNext ? c.primary : c.border,
                  opacity: pressed ? 0.8 : 1,
                })}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: isDone ? c.accent : isNext ? c.primary : c.surfaceAlt,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={20} color="#0E0F13" />
                  ) : (
                    <Txt variant="small" color={isNext ? '#fff' : c.textDim} style={{ fontWeight: '800' }}>
                      {idx + 1}
                    </Txt>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '700' }}>{workout.title}</Txt>
                  <Txt variant="small" muted>
                    ~{estimateMinutes(workout, myPlan.intensity)} min · {workout.items.length} exercises
                  </Txt>
                </View>
                {isNext ? <Txt variant="caption" color={c.primary} style={{ fontWeight: '800' }}>NEXT</Txt> : <Ionicons name="chevron-forward" size={18} color={c.textMuted} />}
              </Pressable>
            );
          })}
        </View>
      ))}

      {data.lastWeek < data.weeks ? <Button title="Show more weeks" variant="secondary" onPress={() => setWeeksShown((n) => n + 4)} /> : null}

      <BannerAdSlot placement="workouts" />

      <SectionHeader title="Plan settings" />
      <Button title="Change my plan" icon="options" variant="secondary" onPress={() => router.push({ pathname: '/onboarding', params: { planOnly: '1' } })} />
      <Button
        title="Delete plan"
        variant="ghost"
        style={{ marginTop: spacing.sm }}
        onPress={() =>
          Alert.alert('Delete your plan?', 'Your workout history stays. You can build a new plan anytime.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => { setMyPlan(null); router.back(); } },
          ])
        }
      />
    </Screen>
  );
}
