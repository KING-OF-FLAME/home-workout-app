import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Chip, EmptyState, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { PROGRAMS, QUICK_WORKOUTS } from '@/data/programs';
import type { Goal } from '@/data/types';
import { equipmentSummary, estimateMinutes } from '@/lib/workout';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

const LEVEL = ['', 'Beginner', 'Intermediate', 'Advanced'];
const FILTERS: { id: Goal | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lose_weight', label: 'Lose weight' },
  { id: 'build_muscle', label: 'Build muscle' },
  { id: 'get_fit', label: 'Get fit' },
  { id: 'flexibility', label: 'Flexibility' },
];

export default function Workouts() {
  const c = useColors();
  const router = useRouter();
  const { programProgress, customWorkouts } = useApp();
  const [filter, setFilter] = useState<Goal | 'all'>('all');
  const programs = PROGRAMS.filter((p) => filter === 'all' || p.goals.includes(filter));

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h1">Workouts</Txt>
        <Button title="Exercises" icon="list" variant="secondary" small onPress={() => router.push('/exercise')} />
      </Row>

      <SectionHeader title="Programs" />
      <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
        {FILTERS.map((f) => (
          <Chip key={f.id} label={f.label} active={filter === f.id} onPress={() => setFilter(f.id)} />
        ))}
      </Row>
      {programs.map((p) => {
        const done = programProgress[p.id]?.completedDays.length ?? 0;
        return (
          <Card key={p.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/program/[id]', params: { id: p.id } })}>
            <Row>
              <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: p.color + '26', alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={p.icon as React.ComponentProps<typeof Ionicons>['name']} size={24} color={p.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{p.title}</Txt>
                <Txt variant="small" muted>
                  {LEVEL[p.level]} · {p.subtitle}
                </Txt>
                <Txt variant="caption" dim style={{ marginTop: 2 }}>
                  {equipmentSummary(p.days)}
                </Txt>
              </View>
            </Row>
            {done > 0 ? (
              <View style={{ marginTop: spacing.md }}>
                <ProgressBar value={done / p.days.length} color={p.color} />
              </View>
            ) : null}
          </Card>
        );
      })}

      <BannerAdSlot placement="workouts" />

      <SectionHeader title="Quick workouts" />
      {QUICK_WORKOUTS.map((w) => (
        <Card key={w.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'quick', id: w.id } })}>
          <Row>
            <Ionicons name="flash" size={22} color={c.primary} />
            <View style={{ flex: 1 }}>
              <Txt variant="h3">{w.title}</Txt>
              <Txt variant="small" muted>
                ~{estimateMinutes(w)} min · {w.items.length} exercises · {equipmentSummary(w)}
              </Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Row>
        </Card>
      ))}

      <SectionHeader title="My workouts" action="Create" onAction={() => router.push('/builder')} />
      {customWorkouts.length === 0 ? (
        <Card>
          <EmptyState icon="construct" title="Build your own" message="Pick exercises, set reps, time and rest. Saved on your phone." action="Create workout" onAction={() => router.push('/builder')} />
        </Card>
      ) : (
        customWorkouts.map((w) => (
          <Card key={w.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'custom', id: w.id } })}>
            <Row>
              <Ionicons name="star" size={20} color={c.warning} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">{w.title}</Txt>
                <Txt variant="small" muted>
                  ~{estimateMinutes(w)} min · {w.items.length} exercises
                </Txt>
              </View>
              <Button title="Edit" small variant="ghost" onPress={() => router.push({ pathname: '/builder', params: { id: w.id } })} />
            </Row>
          </Card>
        ))
      )}
    </Screen>
  );
}
