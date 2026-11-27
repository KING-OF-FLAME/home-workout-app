import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import { MuscleMap } from '@/components/MuscleMap';
import { Card, Chip, ProgressBar, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { BODY_BENEFIT, BODY_LABEL, exercisesFor, weeklyMuscleStats, WEEKLY_TARGET_SETS, type BodySlug, type MuscleStat } from '@/data/muscles';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

const STATUS: Record<MuscleStat['status'], { label: string; tone: 'hot' | 'warn' | 'ok' | 'muted' }> = {
  fresh: { label: 'Trained today', tone: 'hot' },
  recovering: { label: 'Recovering', tone: 'warn' },
  rested: { label: 'Ready to train', tone: 'ok' },
  untrained: { label: 'Not trained', tone: 'muted' },
};

const BIG: BodySlug[] = ['chest', 'upper-back', 'deltoids', 'abs', 'quadriceps', 'gluteal', 'hamstring', 'triceps', 'biceps', 'calves'];

function ago(ts: number | null): string {
  if (!ts) return 'Not this week';
  const h = Math.round((Date.now() - ts) / 3600000);
  if (h < 1) return 'Just now';
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

/** Detailed view of every muscle trained in the last 7 days. */
export default function MusclesScreen() {
  const c = useColors();
  const router = useRouter();
  const { history } = useApp();
  const stats = useMemo(() => weeklyMuscleStats(history), [history]);
  const [selected, setSelected] = useState<BodySlug | null>(null);
  const [filter, setFilter] = useState<'all' | 'trained' | 'todo'>('all');

  const map = stats.filter((s) => s.sets > 0).map((s) => ({ slug: s.slug, intensity: s.sets >= 8 ? 3 : s.sets >= 4 ? 2 : 1 }));
  const totalSets = stats.reduce((t, s) => t + s.sets, 0);
  const trainedCount = stats.filter((s) => s.sets > 0).length;
  const next = BIG.map((b) => stats.find((s) => s.slug === b)!).filter((s) => s.status === 'untrained' || (s.status === 'rested' && s.sets < WEEKLY_TARGET_SETS)).slice(0, 3);
  const toneColor = (t: string) => (t === 'hot' ? c.primary : t === 'warn' ? c.warning : t === 'ok' ? c.success : c.textMuted);

  const list = [...stats]
    .filter((s) => (filter === 'trained' ? s.sets > 0 : filter === 'todo' ? s.sets < WEEKLY_TARGET_SETS : true))
    .sort((a, b) => b.sets - a.sets || BODY_LABEL[a.slug].localeCompare(BODY_LABEL[b.slug]));
  const sel = selected ? stats.find((s) => s.slug === selected) : null;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Muscles this week' }} />
      <Row style={{ marginTop: spacing.sm }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{trainedCount}/17</Txt>
          <Txt variant="caption" muted>muscles trained</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{Math.round(totalSets)}</Txt>
          <Txt variant="caption" muted>sets, last 7 days</Txt>
        </Card>
      </Row>

      <Card style={{ marginTop: spacing.md }}>
        <MuscleMap data={map} scale={0.72} onPress={setSelected} selected={selected} />
        <Txt variant="caption" muted center style={{ marginTop: spacing.sm }}>
          Tap a muscle to see its details. Brighter = more sets this week.
        </Txt>
      </Card>

      {sel ? <MuscleDetail stat={sel} onClose={() => setSelected(null)} /> : null}

      {next.length ? (
        <>
          <SectionHeader title="Train next" />
          <Card>
            <Txt dim>These big muscles are rested and still under {WEEKLY_TARGET_SETS} sets this week:</Txt>
            <Row style={{ flexWrap: 'wrap', marginTop: spacing.sm }}>
              {next.map((s) => (
                <Chip key={s.slug} label={BODY_LABEL[s.slug]} icon="flash" onPress={() => setSelected(s.slug)} />
              ))}
            </Row>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Every muscle" />
      <Row style={{ marginBottom: spacing.sm }}>
        <Chip label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Trained" active={filter === 'trained'} onPress={() => setFilter('trained')} />
        <Chip label={`Under ${WEEKLY_TARGET_SETS} sets`} active={filter === 'todo'} onPress={() => setFilter('todo')} />
      </Row>
      <Card style={{ paddingVertical: spacing.sm }}>
        {list.map((s, i) => {
          const st = STATUS[s.status];
          return (
            <Pressable
              key={s.slug}
              onPress={() => setSelected(s.slug)}
              style={({ pressed }) => ({ paddingVertical: spacing.sm, borderTopWidth: i ? 1 : 0, borderTopColor: c.border, opacity: pressed ? 0.7 : 1 })}
            >
              <Row style={{ justifyContent: 'space-between' }}>
                <Txt style={{ fontWeight: '700' }}>{BODY_LABEL[s.slug]}</Txt>
                <Row gap={6}>
                  <View style={{ width: 8, height: 8, borderRadius: radius.pill, backgroundColor: toneColor(st.tone) }} />
                  <Txt variant="caption" muted>{st.label}</Txt>
                </Row>
              </Row>
              <Row style={{ marginTop: 6 }}>
                <View style={{ flex: 1 }}>
                  <ProgressBar value={Math.min(1, s.sets / WEEKLY_TARGET_SETS)} color={s.sets >= WEEKLY_TARGET_SETS ? c.success : c.primary} height={6} />
                </View>
                <Txt variant="caption" muted style={{ width: 70, textAlign: 'right' }}>
                  {s.sets} / {WEEKLY_TARGET_SETS} sets
                </Txt>
              </Row>
            </Pressable>
          );
        })}
      </Card>
      <Txt variant="caption" muted style={{ marginTop: spacing.sm }}>
        A set counts fully for the main muscles of an exercise and half for the muscles that help. About {WEEKLY_TARGET_SETS} sets a week per muscle is a common target for building strength. Muscles usually need about 48 hours to recover.
      </Txt>
      <BannerAdSlot placement="progress" />
    </Screen>
  );

  function MuscleDetail({ stat, onClose }: { stat: MuscleStat; onClose: () => void }) {
    const suggestions = exercisesFor(stat.slug).filter((id) => !stat.topExercises.includes(id)).slice(0, 3);
    return (
      <Card style={{ marginTop: spacing.md, borderWidth: 2, borderColor: c.primary }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="h2">{BODY_LABEL[stat.slug]}</Txt>
          <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
            <Ionicons name="close" size={22} color={c.textMuted} />
          </Pressable>
        </Row>
        <Txt dim style={{ marginTop: 4 }}>{BODY_BENEFIT[stat.slug]}</Txt>
        <Row style={{ marginTop: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" muted>This week</Txt>
            <Txt variant="h3">{stat.sets} sets</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" muted>Last trained</Txt>
            <Txt variant="h3">{ago(stat.lastTrained)}</Txt>
          </View>
          <View style={{ flex: 1 }}>
            <Txt variant="caption" muted>Status</Txt>
            <Txt variant="h3" color={toneColor(STATUS[stat.status].tone)}>{STATUS[stat.status].label}</Txt>
          </View>
        </Row>
        {stat.topExercises.length ? (
          <>
            <Txt variant="label" muted style={{ marginTop: spacing.md }}>Trained with</Txt>
            {stat.topExercises.map((id) => <ExRow key={id} id={id} />)}
          </>
        ) : null}
        {suggestions.length && stat.sets < WEEKLY_TARGET_SETS ? (
          <>
            <Txt variant="label" muted style={{ marginTop: spacing.md }}>Try these to train it more</Txt>
            {suggestions.map((id) => <ExRow key={id} id={id} />)}
          </>
        ) : null}
      </Card>
    );
  }

  function ExRow({ id }: { id: string }) {
    const ex = getExercise(id);
    if (!ex) return null;
    return (
      <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 6 }}>
        <ExerciseThumb exercise={ex} size={40} />
        <Txt style={{ flex: 1, fontWeight: '600' }}>{ex.name}</Txt>
        <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
      </Pressable>
    );
  }
}
