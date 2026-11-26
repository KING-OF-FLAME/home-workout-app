import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, Pressable, View } from 'react-native';
import { Button, Card, EmptyState, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { PROGRAM_MAP } from '@/data/programs';
import { nextDayIndex } from '@/lib/recommend';
import { equipmentSummary, estimateMinutes } from '@/lib/workout';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

const LEVEL = ['', 'Beginner', 'Intermediate', 'Advanced'];

export default function ProgramDetail() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { programProgress, resetProgram } = useApp();
  const p = PROGRAM_MAP[id];
  if (!p) return <EmptyState icon="alert-circle" title="Program not found" />;
  const pr = programProgress[p.id];
  const done = new Set(pr?.completedDays ?? []);
  const next = nextDayIndex(p, pr);
  const open = (day: number) => router.push({ pathname: '/workout/preview', params: { kind: 'program', id: p.id, day: String(day) } });

  return (
    <Screen
      edges={['bottom']}
      footer={
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: c.border }}>
          <Button title={done.size ? `Continue · Day ${next + 1}` : 'Start program'} icon="play" onPress={() => open(next)} />
        </View>
      }
    >
      <Stack.Screen options={{ title: '' }} />
      <View style={{ width: 64, height: 64, borderRadius: radius.lg, backgroundColor: p.color + '26', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={p.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color={p.color} />
      </View>
      <Txt variant="h1" style={{ marginTop: spacing.md }}>{p.title}</Txt>
      <Txt muted style={{ marginTop: 4 }}>{LEVEL[p.level]} · {p.subtitle}</Txt>
      <Txt dim style={{ marginTop: spacing.md }}>{p.description}</Txt>
      <Card style={{ marginTop: spacing.lg }}>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Txt style={{ fontWeight: '700' }}>{done.size}/{p.days.length} days</Txt>
          <Txt variant="small" dim>{equipmentSummary(p.days)}</Txt>
        </Row>
        <ProgressBar value={done.size / p.days.length} color={p.color} />
        {pr && pr.intensity !== 1 ? (
          <Txt variant="caption" muted style={{ marginTop: spacing.sm }}>
            Adjusted to {Math.round(pr.intensity * 100)}% based on how your workouts felt.
          </Txt>
        ) : null}
      </Card>

      {Array.from({ length: p.weeks }).map((_, week) => (
        <View key={week}>
          <SectionHeader title={`Week ${week + 1}`} />
          {p.days.slice(week * p.daysPerWeek, (week + 1) * p.daysPerWeek).map((d, i) => {
            const dayIndex = week * p.daysPerWeek + i;
            const isDone = done.has(dayIndex);
            const isNext = dayIndex === next && !isDone;
            return (
              <Pressable
                key={d.id}
                onPress={() => open(dayIndex)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm,
                    borderRadius: radius.md, backgroundColor: isNext ? p.color + '1f' : c.surface,
                    borderWidth: 1, borderColor: isNext ? p.color : c.border,
                  },
                  pressed && { opacity: 0.8 },
                ]}
              >
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: isDone ? c.accent : c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {isDone ? <Ionicons name="checkmark" size={18} color="#0E0F13" /> : <Txt variant="small" style={{ fontWeight: '700' }}>{dayIndex + 1}</Txt>}
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }}>{d.title.replace(/^Week \d+ · /, '')}</Txt>
                  <Txt variant="small" muted>~{estimateMinutes(d, pr?.intensity)} min · {d.items.length} exercises</Txt>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>
            );
          })}
        </View>
      ))}
      {pr ? (
        <Button
          title="Restart program"
          variant="ghost"
          style={{ marginTop: spacing.lg }}
          onPress={() => Alert.alert('Restart program?', 'Your progress in this program will be cleared.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Restart', style: 'destructive', onPress: () => resetProgram(p.id) },
          ])}
        />
      ) : null}
    </Screen>
  );
}
