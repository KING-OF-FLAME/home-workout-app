import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { trainerFeaturesAvailable } from '@/config';
import { QUICK_WORKOUTS } from '@/data/programs';
import { addDays, dayKey, greeting, startOfWeek } from '@/lib/dates';
import { activeProgram, recommendedPrograms, tipOfTheDay } from '@/lib/recommend';
import { useAsync } from '@/lib/useAsync';
import { equipmentSummary, estimateMinutes } from '@/lib/workout';
import { listMyAssignments } from '@/services/cloud';
import { useApp, useColors } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function Home() {
  const c = useColors();
  const router = useRouter();
  const { profile, stats, programProgress, history } = useApp();
  const auth = useAuth();
  const isStudent = Boolean(auth.profile?.trainerId);

  const coachPlans = useAsync(
    async () => (trainerFeaturesAvailable && auth.profile?.trainerId ? listMyAssignments(auth.profile.uid) : []),
    [auth.profile?.uid, auth.profile?.trainerId],
  );
  const coachWorkout = coachPlans.data?.find((a) => a.type === 'workout');
  const coachMeal = coachPlans.data?.find((a) => a.type === 'meal');

  const active = activeProgram(programProgress);
  const suggestion = useMemo(() => recommendedPrograms(profile.goal, profile.level)[0], [profile.goal, profile.level]);
  const program = active?.program ?? suggestion;
  const nextDay = active?.nextDay ?? 0;
  const done = programProgress[program.id]?.completedDays.length ?? 0;
  const workout = program.days[nextDay];

  const weekStart = startOfWeek(new Date());
  const weekDays = WEEKDAYS.map((label, i) => ({ label, key: dayKey(addDays(weekStart, i)) }));
  const weekCount = weekDays.filter((d) => stats.activeDays.has(d.key)).length;

  const coachNextDay = useMemo(() => {
    if (!coachWorkout?.workoutPlan) return 0;
    const doneDays = new Set(history.filter((h) => h.kind === 'assignment' && h.refId === coachWorkout.id).map((h) => h.day ?? 0));
    const idx = coachWorkout.workoutPlan.days.findIndex((_, i) => !doneDays.has(i));
    return idx === -1 ? 0 : idx;
  }, [coachWorkout, history]);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Txt muted>{greeting()},</Txt>
          <Txt variant="h1" numberOfLines={1}>
            {profile.name || 'Athlete'}
          </Txt>
        </View>
        <View style={{ alignItems: 'center', backgroundColor: c.surface, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 8 }}>
          <Row gap={4}>
            <Ionicons name="flame" size={20} color={c.warning} />
            <Txt variant="h2">{stats.currentStreak}</Txt>
          </Row>
          <Txt variant="caption" muted>
            day streak
          </Txt>
        </View>
      </Row>

      <Card style={{ marginTop: spacing.lg }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h3">This week</Txt>
          <Txt variant="small" dim>
            {weekCount}/{profile.daysPerWeek} workouts
          </Txt>
        </Row>
        <Row gap={0} style={{ justifyContent: 'space-between', marginTop: spacing.md }}>
          {weekDays.map((d) => {
            const isDone = stats.activeDays.has(d.key);
            const isToday = d.key === dayKey();
            return (
              <View key={d.key} style={{ alignItems: 'center', gap: 6 }}>
                <Txt variant="caption" muted>
                  {d.label}
                </Txt>
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 15,
                    backgroundColor: isDone ? c.accent : c.surfaceAlt,
                    borderWidth: isToday ? 2 : 0,
                    borderColor: c.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isDone ? <Ionicons name="checkmark" size={18} color="#0E0F13" /> : null}
                </View>
              </View>
            );
          })}
        </Row>
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar value={weekCount / Math.max(1, profile.daysPerWeek)} color={c.accent} />
        </View>
      </Card>

      {isStudent && coachWorkout?.workoutPlan ? (
        <>
          <SectionHeader title="From your coach" action="All plans" onAction={() => router.push('/coach')} />
          <Card tint={c.primary} onPress={() => router.push({ pathname: '/student/plan/[id]', params: { id: coachWorkout.id } })}>
            <Txt variant="label" color="#ffffffcc">
              {coachWorkout.trainerName}
            </Txt>
            <Txt variant="h2" color="#fff" style={{ marginTop: 4 }}>
              {coachWorkout.title}
            </Txt>
            <Txt color="#ffffffdd" style={{ marginTop: 4 }}>
              Next: {coachWorkout.workoutPlan.days[coachNextDay]?.title || `Day ${coachNextDay + 1}`}
            </Txt>
            <Button
              title="Start"
              icon="play"
              variant="secondary"
              small
              style={{ alignSelf: 'flex-start', marginTop: spacing.md }}
              onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'assignment', id: coachWorkout.id, day: String(coachNextDay) } })}
            />
          </Card>
          {coachMeal ? (
            <Card style={{ marginTop: spacing.md }} onPress={() => router.push({ pathname: '/student/meal/[id]', params: { id: coachMeal.id } })}>
              <Row>
                <Ionicons name="restaurant" size={22} color={c.accent} />
                <View style={{ flex: 1 }}>
                  <Txt variant="h3">{coachMeal.title}</Txt>
                  <Txt variant="small" muted>
                    Today's meals from {coachMeal.trainerName}
                  </Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Row>
            </Card>
          ) : null}
        </>
      ) : null}

      <SectionHeader title={active ? 'Continue your plan' : 'Recommended for you'} action="See all" onAction={() => router.push('/workouts')} />
      <Card onPress={() => router.push({ pathname: '/program/[id]', params: { id: program.id } })}>
        <Row>
          <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: program.color + '26', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name={program.icon as React.ComponentProps<typeof Ionicons>['name']} size={26} color={program.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="h3">{program.title}</Txt>
            <Txt variant="small" muted>
              {program.subtitle}
            </Txt>
          </View>
        </Row>
        <View style={{ marginTop: spacing.md }}>
          <ProgressBar value={done / program.days.length} color={program.color} />
          <Txt variant="caption" muted style={{ marginTop: 6 }}>
            {done}/{program.days.length} days done
          </Txt>
        </View>
        <Row style={{ marginTop: spacing.md, justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Txt style={{ fontWeight: '700' }}>{workout.title}</Txt>
            <Txt variant="small" muted>
              ~{estimateMinutes(workout)} min · {equipmentSummary(workout)}
            </Txt>
          </View>
          <Button
            title={done ? 'Continue' : 'Start'}
            icon="play"
            small
            onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'program', id: program.id, day: String(nextDay) } })}
          />
        </Row>
      </Card>

      <BannerAdSlot placement="home" />

      <SectionHeader title="Quick start" />
      <FlatList
        horizontal
        data={QUICK_WORKOUTS}
        keyExtractor={(w) => w.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.md }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'quick', id: item.id } })}
            style={({ pressed }) => [
              { width: 170, backgroundColor: c.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: c.border },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons name="flash" size={20} color={c.primary} />
            <Txt variant="h3" style={{ marginTop: spacing.sm }} numberOfLines={2}>
              {item.title}
            </Txt>
            <Txt variant="small" muted style={{ marginTop: 4 }}>
              ~{estimateMinutes(item)} min · {item.items.length} moves
            </Txt>
          </Pressable>
        )}
      />

      <Card style={{ marginTop: spacing.xl }} tint={c.surfaceAlt}>
        <Row>
          <Ionicons name="bulb" size={20} color={c.warning} />
          <Txt dim style={{ flex: 1 }}>
            {tipOfTheDay()}
          </Txt>
        </Row>
      </Card>
    </Screen>
  );
}
