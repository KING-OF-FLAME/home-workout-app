import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { MuscleMap, MusclePills } from '@/components/MuscleMap';
import { Button, Card, Divider, EmptyState, Row, Screen, SectionHeader, StatTile, Stepper, Txt } from '@/components/ui';
import { BODY_LABEL, loadToIntensity, muscleLoad, type BodySlug } from '@/data/muscles';
import { addDays, dayKey, friendlyDate, startOfWeek } from '@/lib/dates';
import { formatClock } from '@/lib/workout';
import { useApp, useColors, type Session } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

function bmiInfo(kg: number, cm: number): { bmi: number; label: string } {
  const bmi = kg / Math.pow(cm / 100, 2);
  const label = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Healthy' : bmi < 30 ? 'Overweight' : 'Obese';
  return { bmi: Math.round(bmi * 10) / 10, label };
}

export default function Progress() {
  const c = useColors();
  const router = useRouter();
  const { stats, history, weights, profile, settings, addWeight, deleteSession } = useApp();
  const [logging, setLogging] = useState(false);
  const imperial = settings.units === 'imperial';
  const [draft, setDraft] = useState(profile.weightKg);
  const fmtW = (kg: number) => (imperial ? `${Math.round(kg * 2.2046)} lb` : `${Math.round(kg * 10) / 10} kg`);

  const confirmDelete = (h: Session) =>
    Alert.alert(
      'Delete this workout?',
      h.title,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteSession(h.id) },
      ],
      { cancelable: true },
    );

  const sessionDetails = (h: Session) => {
    const when = new Date(h.startedAt).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const feeling = h.feeling ? `\nFelt: ${h.feeling === 'easy' ? 'Easy' : h.feeling === 'hard' ? 'Hard' : 'Good'}` : '';
    Alert.alert(
      h.title,
      `${when}\nTime: ${formatClock(h.durationSec)}\nExercises: ${h.exercisesDone}\nCalories: about ${Math.round(h.calories)} kcal${feeling}`,
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Delete…', style: 'destructive', onPress: () => confirmDelete(h) },
      ],
      { cancelable: true },
    );
  };

  // Minutes per week for the last 8 weeks.
  const weeks = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 8 }).map((_, i) => {
      const from = addDays(start, -7 * (7 - i)).getTime();
      const to = addDays(start, -7 * (6 - i)).getTime();
      const minutes = history.filter((h) => h.startedAt >= from && h.startedAt < to).reduce((s, h) => s + h.durationSec / 60, 0);
      return { label: new Date(from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), minutes: Math.round(minutes) };
    });
  }, [history]);
  const maxMin = Math.max(10, ...weeks.map((w) => w.minutes));

  // Muscles trained in the last 7 days, and big muscles that got nothing.
  const muscles = useMemo(() => {
    const since = Date.now() - 7 * 86400000;
    const ids = history.filter((h) => h.startedAt >= since).flatMap((h) => h.exercises ?? []);
    const load = muscleLoad(ids.map((id) => ({ id })));
    const big: BodySlug[] = ['chest', 'upper-back', 'deltoids', 'abs', 'quadriceps', 'gluteal', 'hamstring', 'triceps'];
    return { data: loadToIntensity(load), missed: big.filter((b) => !load.has(b)) };
  }, [history]);

  // Current month calendar.
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  const recentWeights = weights.slice(-12);
  const wMin = Math.min(...recentWeights.map((w) => w.kg), profile.weightKg) - 1;
  const wMax = Math.max(...recentWeights.map((w) => w.kg), profile.weightKg) + 1;
  const bmi = bmiInfo(profile.weightKg, profile.heightCm);
  const change = weights.length >= 2 ? weights[weights.length - 1].kg - weights[0].kg : 0;

  return (
    <Screen>
      <Txt variant="h1">Progress</Txt>
      <Row style={{ marginTop: spacing.lg }}>
        <StatTile icon="barbell" label="Workouts" value={stats.totalWorkouts} />
        <StatTile icon="time" label="Minutes" value={stats.totalMinutes} color={c.accent} />
      </Row>
      <Row style={{ marginTop: spacing.sm }}>
        <StatTile icon="flame" label="kcal (est.)" value={stats.totalCalories} color={c.warning} />
        <StatTile icon="trophy" label="Best streak" value={`${stats.bestStreak}d`} color="#B07CFF" />
      </Row>

      <SectionHeader title="Muscles trained this week" action="Details" onAction={() => router.push('/muscles')} />
      <Card>
        {muscles.data.length ? (
          <>
            <MuscleMap data={muscles.data} scale={0.55} />
            <View style={{ marginTop: spacing.md }}>
              <MusclePills data={muscles.data} max={8} />
            </View>
            {muscles.missed.length ? (
              <Txt variant="small" dim center style={{ marginTop: spacing.md }}>
                Not trained yet this week: {muscles.missed.map((m) => BODY_LABEL[m]).join(', ')}
              </Txt>
            ) : (
              <Txt variant="small" color={c.accent} center style={{ marginTop: spacing.md }}>
                Every major muscle trained this week. Great balance!
              </Txt>
            )}
          </>
        ) : (
          <>
            <MuscleMap data={[]} scale={0.5} legend={false} animate={false} />
            <Txt variant="small" dim center style={{ marginTop: spacing.md }}>
              Finish a workout and the muscles you trained light up here.
            </Txt>
          </>
        )}
      </Card>

      <SectionHeader title="Weekly minutes" />
      <Card>
        <Row style={{ alignItems: 'flex-end', height: 130, justifyContent: 'space-between' }} gap={6}>
          {weeks.map((w, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <Txt variant="caption" muted>
                {w.minutes || ''}
              </Txt>
              <View
                style={{
                  width: '70%',
                  height: Math.max(4, (w.minutes / maxMin) * 100),
                  backgroundColor: i === weeks.length - 1 ? c.primary : c.primary + '66',
                  borderRadius: 6,
                  marginTop: 4,
                }}
              />
            </View>
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginTop: spacing.sm }}>
          <Txt variant="caption" muted>
            {weeks[0].label}
          </Txt>
          <Txt variant="caption" muted>
            This week
          </Txt>
        </Row>
      </Card>

      <SectionHeader title={now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} />
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <Txt key={i} variant="caption" muted style={{ width: `${100 / 7}%`, textAlign: 'center' }}>
              {d}
            </Txt>
          ))}
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((d, i) => {
            const key = d ? dayKey(new Date(now.getFullYear(), now.getMonth(), d)) : '';
            const active = d ? stats.activeDays.has(key) : false;
            const today = d === now.getDate();
            return (
              <View key={i} style={{ width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 4 }}>
                {d ? (
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: active ? c.accent : 'transparent',
                      borderWidth: today ? 1.5 : 0,
                      borderColor: c.primary,
                    }}
                  >
                    <Txt variant="small" color={active ? '#0E0F13' : c.textDim} style={{ fontWeight: active ? '700' : '400' }}>
                      {d}
                    </Txt>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </Card>

      <SectionHeader title="Body weight" action="Log weight" onAction={() => { setDraft(profile.weightKg); setLogging(true); }} />
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt variant="h2">{fmtW(profile.weightKg)}</Txt>
            <Txt variant="small" muted>
              {weights.length >= 2 ? `${change > 0 ? '+' : ''}${imperial ? Math.round(change * 2.2046) + ' lb' : Math.round(change * 10) / 10 + ' kg'} since first log` : 'Log your weight to see a trend'}
            </Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="h3">BMI {bmi.bmi}</Txt>
            <Txt variant="small" color={bmi.label === 'Healthy' ? c.success : c.warning}>
              {bmi.label}
            </Txt>
          </View>
        </Row>
        {recentWeights.length >= 2 ? (
          <Row style={{ alignItems: 'flex-end', height: 70, marginTop: spacing.md }} gap={4}>
            {recentWeights.map((w) => (
              <View key={w.ts} style={{ flex: 1, height: 10 + ((w.kg - wMin) / (wMax - wMin)) * 60, backgroundColor: c.accent + 'aa', borderRadius: 4 }} />
            ))}
          </Row>
        ) : null}
      </Card>

      <BannerAdSlot placement="progress" />

      <SectionHeader title="History" />
      {history.length === 0 ? (
        <Card>
          <EmptyState icon="calendar" title="No workouts yet" message="Finish your first workout and it will show up here." />
        </Card>
      ) : (
        <Card style={{ paddingVertical: spacing.sm }}>
          {history.slice(0, 50).map((h, i) => (
            <View key={h.id}>
              {i > 0 ? <Divider /> : null}
              <Pressable
                onPress={() => sessionDetails(h)}
                onLongPress={() => confirmDelete(h)}
                accessibilityRole="button"
                accessibilityHint="Shows details. You can delete it from there."
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md }}
              >
                <View style={{ width: 38, height: 38, borderRadius: radius.md, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="checkmark-done" size={18} color={c.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Txt style={{ fontWeight: '600' }} numberOfLines={1}>
                    {h.title}
                  </Txt>
                  <Txt variant="small" muted>
                    {friendlyDate(h.startedAt)} · {formatClock(h.durationSec)} · {Math.round(h.calories)} kcal
                  </Txt>
                </View>
                {h.feeling ? <Txt variant="caption" muted>{h.feeling === 'easy' ? 'Easy' : h.feeling === 'hard' ? 'Hard' : 'Good'}</Txt> : null}
              </Pressable>
            </View>
          ))}
        </Card>
      )}
      {history.length > 0 ? (
        <Txt variant="caption" muted center style={{ marginTop: spacing.sm }}>
          Tap a workout to see details or delete it. Calories are estimates.
        </Txt>
      ) : null}

      <Modal visible={logging} transparent animationType="fade" onRequestClose={() => setLogging(false)}>
        <View style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'center', padding: spacing.xl }}>
          <Card>
            <Txt variant="h2">Log weight</Txt>
            <Row style={{ justifyContent: 'center', marginVertical: spacing.xl }}>
              {imperial ? (
                <Stepper value={Math.round(draft * 2.2046)} min={66} max={660} onChange={(lb) => setDraft(Math.round((lb / 2.2046) * 10) / 10)} suffix="lb" />
              ) : (
                <Stepper value={draft} min={30} max={300} step={0.5} onChange={(v) => setDraft(Math.round(v * 10) / 10)} suffix="kg" />
              )}
            </Row>
            <Button title="Save" icon="checkmark" onPress={() => { addWeight(draft); setLogging(false); }} />
            <Button title="Cancel" variant="ghost" onPress={() => setLogging(false)} style={{ marginTop: spacing.sm }} />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
