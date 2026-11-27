import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, Switch, View } from 'react-native';
import { MuscleMap } from '@/components/MuscleMap';
import { ResultsTimeline } from '@/components/ResultsTimeline';
import { Button, Card, Chip, Field, Row, Screen, Spacer, Stepper, Txt, type IconName } from '@/components/ui';
import { AppConfig } from '@/config';
import { timelineFor, type BodySlug } from '@/data/muscles';
import { getExercise } from '@/data/exercises';
import { GOALS } from '@/data/goals';
import type { Goal, Level } from '@/data/types';
import { uid } from '@/lib/id';
import {
  FOCUS_AREAS,
  PLAN_LENGTHS,
  phaseFor,
  planWorkout,
  totalSessions,
  totalWeeks,
  type FocusArea,
  type MyPlan,
  type PlanLength,
  type SessionMinutes,
} from '@/lib/planGenerator';
import { estimateMinutes } from '@/lib/workout';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';


const LEVELS: { id: Level; title: string; sub: string }[] = [
  { id: 1, title: 'Beginner', sub: 'I am new or getting back into it' },
  { id: 2, title: 'Intermediate', sub: 'I train now and then' },
  { id: 3, title: 'Advanced', sub: 'I train regularly and want a challenge' },
];

const FOCUS_SLUGS: Record<FocusArea, BodySlug[]> = {
  full: ['chest', 'abs', 'quadriceps', 'gluteal', 'upper-back', 'deltoids'],
  abs: ['abs', 'obliques'],
  arms: ['biceps', 'triceps', 'deltoids'],
  chest: ['chest'],
  back: ['upper-back', 'lower-back', 'trapezius'],
  legs: ['quadriceps', 'hamstring', 'calves'],
  glutes: ['gluteal'],
};

/**
 * Steps: 0 welcome, 1 name & body for demos, 6 weight & height, 2 goal, 3 level, 4 plan length,
 * 5 time & focus, 8 generating, 7 your plan (editable).
 */
const ALL_STEPS = [0, 1, 6, 2, 3, 4, 5, 8, 7];
const PLAN_ONLY_STEPS = [2, 3, 4, 5, 8, 7];

function Option({ title, sub, icon, active, onPress }: { title: string; sub: string; icon?: IconName; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: active ? c.primary + '22' : c.surface,
        borderWidth: 2,
        borderColor: active ? c.primary : c.border,
        marginBottom: spacing.md,
      }}
    >
      {icon ? <Ionicons name={icon} size={24} color={active ? c.primary : c.textDim} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{title}</Txt>
        <Txt variant="small" dim>
          {sub}
        </Txt>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
    </Pressable>
  );
}

export default function Onboarding() {
  const c = useColors();
  const router = useRouter();
  const { planOnly } = useLocalSearchParams<{ planOnly?: string }>();
  const { profile, updateProfile, settings, myPlan, setMyPlan } = useApp();
  const order = planOnly === '1' ? PLAN_ONLY_STEPS : ALL_STEPS;
  const [pos, setPos] = useState(0);
  const step = order[pos];
  const [name, setName] = useState(profile.name);
  const [sex, setSex] = useState<'male' | 'female'>(profile.sex ?? 'male');
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [level, setLevel] = useState<Level>(profile.level);
  const [days, setDays] = useState(profile.daysPerWeek);
  const [weight, setWeight] = useState(profile.weightKg);
  const [height, setHeight] = useState(profile.heightCm);
  const [length, setLength] = useState<PlanLength>(myPlan?.length ?? 30);
  const [minutes, setMinutes] = useState<SessionMinutes>(myPlan?.minutes ?? 20);
  const [focus, setFocus] = useState<FocusArea[]>(myPlan?.focus ?? ['full']);
  const [useChair, setUseChair] = useState(myPlan?.useChair ?? true);
  const imperial = settings.units === 'imperial';
  const total = order.length;

  const draftPlan = useMemo<MyPlan>(
    () => ({ id: 'preview', createdAt: Date.now(), length, daysPerWeek: days, minutes, focus, useChair, goal, level, completed: [], intensity: 1 }),
    [length, days, minutes, focus, useChair, goal, level],
  );

  const toggleFocus = (f: FocusArea) => {
    if (f === 'full') return setFocus(['full']);
    setFocus((prev) => {
      const rest = prev.filter((x) => x !== 'full');
      const next = rest.includes(f) ? rest.filter((x) => x !== f) : [...rest, f].slice(-3);
      return next.length ? next : ['full'];
    });
  };

  // The plan is built (and saved) on the "generating" step, so it can be edited on the next one.
  const [built, setBuilt] = useState<MyPlan | null>(null);
  const build = (keepProgress: boolean) => {
    const old = myPlan;
    const plan: MyPlan = {
      ...draftPlan,
      id: keepProgress && old ? old.id : uid('plan_'),
      createdAt: keepProgress && old ? old.createdAt : Date.now(),
      completed: keepProgress && old ? old.completed : [],
      intensity: keepProgress && old ? old.intensity : 1,
    };
    updateProfile({ name: name.trim() || profile.name, sex, goal, level, daysPerWeek: days, weightKg: weight, heightCm: height });
    setMyPlan(plan);
    setBuilt(plan);
    setPos(order.indexOf(8));
  };

  const finish = () => {
    updateProfile({ onboarded: true });
    if (planOnly === '1' && router.canGoBack()) router.back();
    else router.replace('/');
  };

  const next = () => {
    const nextStep = order[pos + 1];
    if (nextStep === 8) {
      // Changing an existing plan: ask before throwing away finished workouts.
      if (planOnly === '1' && myPlan && myPlan.completed.length > 0) {
        Alert.alert(
          'Keep your progress?',
          `You have finished ${myPlan.completed.length} workout${myPlan.completed.length === 1 ? '' : 's'} of your current plan.`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Start fresh', onPress: () => build(false) },
            { text: 'Keep progress', onPress: () => build(true) },
          ],
          { cancelable: true },
        );
        return;
      }
      return build(false);
    }
    if (pos < total - 1) setPos(pos + 1);
    else finish();
  };
  const back = () => setPos(order[pos - 1] === 8 ? Math.max(0, pos - 2) : pos - 1);

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          {step === 8 ? null : (
            <Button title={pos === total - 1 ? 'Start training' : order[pos + 1] === 8 ? 'Build my plan' : 'Continue'} onPress={next} disabled={step === 1 && !name.trim()} />
          )}
          {step === 8 ? null : pos > 0 ? (
            <Button title="Back" variant="ghost" onPress={back} />
          ) : planOnly === '1' ? (
            <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
          ) : null}
        </View>
      }
    >
      <Row gap={6} style={{ marginBottom: spacing.xl }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= pos ? c.primary : c.surfaceAlt }} />
        ))}
      </Row>

      {step === 0 && (
        <View style={{ paddingTop: spacing.xxl }}>
          <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="barbell" size={44} color="#fff" />
          </View>
          <Spacer size={spacing.xl} />
          <Txt variant="h1">Welcome to {AppConfig.app.name}</Txt>
          <Txt dim style={{ marginTop: spacing.sm, fontSize: 17 }}>
            {AppConfig.brand.tagline} Free workouts, no equipment, no subscriptions.
          </Txt>
          <Spacer size={spacing.xl} />
          {[
            ['flash', 'Personal plans for your goal and level'],
            ['timer', 'Guided timer with voice coaching'],
            ['trending-up', 'Track streaks, calories and weight'],
            ['people', 'Train with your coach: plans and meals in one app'],
          ].map(([icon, text]) => (
            <Row key={text} style={{ marginBottom: spacing.md }} gap={spacing.md}>
              <Ionicons name={icon as IconName} size={20} color={c.accent} />
              <Txt style={{ flex: 1 }}>{text}</Txt>
            </Row>
          ))}
        </View>
      )}

      {step === 1 && (
        <View>
          <Txt variant="h1">What should we call you?</Txt>
          <Spacer />
          <Field placeholder="Your first name" value={name} onChangeText={setName} maxLength={30} returnKeyType="done" />
          <Spacer />
          <Txt variant="h3">Show exercises with</Txt>
          <Txt variant="small" dim style={{ marginBottom: spacing.md }}>Every demo is performed by this body. Change it anytime in Profile.</Txt>
          <Option title="Man" sub="Male body in the demos" icon="man" active={sex === 'male'} onPress={() => setSex('male')} />
          <Option title="Woman" sub="Female body in the demos" icon="woman" active={sex === 'female'} onPress={() => setSex('female')} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Txt variant="h1">What is your main goal?</Txt>
          <Spacer />
          {GOALS.map((g) => (
            <Option key={g.id} title={g.title} sub={g.sub} icon={g.icon} active={goal === g.id} onPress={() => setGoal(g.id)} />
          ))}
        </View>
      )}

      {step === 3 && (
        <View>
          <Txt variant="h1">Your fitness level</Txt>
          <Spacer />
          {LEVELS.map((l) => (
            <Option key={l.id} title={l.title} sub={l.sub} active={level === l.id} onPress={() => setLevel(l.id)} />
          ))}
          <Spacer size={spacing.md} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Workouts per week</Txt>
            <Stepper value={days} min={1} max={7} onChange={setDays} />
          </Row>
        </View>
      )}

      {step === 4 && (
        <View>
          <Txt variant="h1">How long is your plan?</Txt>
          <Txt dim style={{ marginTop: 6 }}>
            We build every workout for you, getting harder week by week.
          </Txt>
          <Spacer />
          {PLAN_LENGTHS.map((p) => (
            <Option
              key={p.value}
              title={p.title}
              sub={p.sub}
              icon={p.value === 0 ? 'infinite' : 'calendar'}
              active={length === p.value}
              onPress={() => setLength(p.value)}
            />
          ))}
        </View>
      )}

      {step === 5 && (
        <View>
          <Txt variant="h1">Your workouts</Txt>
          <Spacer size={spacing.md} />
          <Txt variant="label" muted style={{ marginBottom: 6 }}>
            Time per workout
          </Txt>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.lg }}>
            {([10, 20, 30, 45] as const).map((mn) => (
              <Chip key={mn} label={`${mn} min`} active={minutes === mn} onPress={() => setMinutes(mn)} />
            ))}
          </Row>
          <Txt variant="label" muted style={{ marginBottom: 6 }}>
            Areas to focus on (up to 3)
          </Txt>
          <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
            {FOCUS_AREAS.map((f) => (
              <Chip key={f.id} label={f.label} active={focus.includes(f.id)} onPress={() => toggleFocus(f.id)} />
            ))}
          </Row>
          <MuscleMap data={focus.flatMap((f) => FOCUS_SLUGS[f]).map((slug) => ({ slug, intensity: 3 }))} scale={0.5} legend={false} />
          <Row style={{ justifyContent: 'space-between', marginTop: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <Txt variant="h3">I have a chair and a wall</Txt>
              <Txt variant="small" dim>
                Adds moves like dips, step-ups and wall sits
              </Txt>
            </View>
            <Switch value={useChair} onValueChange={setUseChair} trackColor={{ true: c.primary, false: c.surfaceAlt }} thumbColor="#fff" />
          </Row>
        </View>
      )}

      {step === 8 && <Generating plan={draftPlan} name={name.trim() || profile.name} onDone={() => setPos(order.indexOf(7))} />}

      {step === 7 && <PlanSummary plan={myPlan && built && myPlan.id === built.id ? myPlan : built ?? draftPlan} name={name.trim() || profile.name} />}

      {step === 6 && (
        <View>
          <Txt variant="h1">About your body</Txt>
          <Txt dim style={{ marginTop: 6 }}>
            Used to size your plan and estimate calories. It stays on this phone.
          </Txt>
          <Spacer />
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Txt variant="h3">Weight</Txt>
            {imperial ? (
              <Stepper value={Math.round(weight * 2.2046)} min={66} max={660} onChange={(lb) => setWeight(Math.round((lb / 2.2046) * 10) / 10)} suffix="lb" />
            ) : (
              <Stepper value={Math.round(weight)} min={30} max={300} onChange={setWeight} suffix="kg" />
            )}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Height</Txt>
            {imperial ? (
              <Stepper value={Math.round(height / 2.54)} min={39} max={98} onChange={(inch) => setHeight(Math.round(inch * 2.54))} suffix="in" />
            ) : (
              <Stepper value={height} min={100} max={250} onChange={setHeight} suffix="cm" />
            )}
          </Row>
        </View>
      )}
    </Screen>
  );
}

/** A short "building your plan" moment, so the user sees the plan being made for them. */
function Generating({ plan, name, onDone }: { plan: MyPlan; name: string; onDone: () => void }) {
  const c = useColors();
  const progress = useRef(new Animated.Value(0)).current;
  const [done, setDone] = useState(0);
  const weeks = totalWeeks(plan);
  const goal = GOALS.find((g) => g.id === plan.goal);
  const lines = [
    `Reading your goal: ${goal?.title ?? 'fitness'}`,
    `Picking exercises for your level`,
    `Balancing muscles across ${plan.daysPerWeek} workouts a week`,
    Number.isFinite(weeks) ? `Making it harder week by week for ${weeks} weeks` : 'Setting up new workouts every week',
  ];
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.quad), useNativeDriver: false }).start();
    const timers = lines.map((_, i) => setTimeout(() => setDone(i + 1), 650 * (i + 1)));
    timers.push(setTimeout(() => doneRef.current(), 3500));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ paddingTop: spacing.xxl }}>
      <Txt variant="h1">{name ? `Building your plan, ${name}` : 'Building your plan'}</Txt>
      <Txt dim style={{ marginTop: 6 }}>This takes a few seconds.</Txt>
      <View style={{ height: 10, borderRadius: 5, backgroundColor: c.surfaceAlt, marginTop: spacing.xl, overflow: 'hidden' }}>
        <Animated.View style={{ height: 10, borderRadius: 5, backgroundColor: c.primary, width: progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }} />
      </View>
      <View style={{ marginTop: spacing.xl, gap: spacing.md }}>
        {lines.map((l, i) => (
          <Row key={l} gap={spacing.md}>
            {i < done ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : <ActivityIndicator size="small" color={c.textMuted} />}
            <Txt style={{ flex: 1 }} dim={i >= done}>{l}</Txt>
          </Row>
        ))}
      </View>
    </View>
  );
}

function PlanSummary({ plan, name }: { plan: MyPlan; name: string }) {
  const c = useColors();
  const router = useRouter();
  const sessions = totalSessions(plan);
  const weeks = totalWeeks(plan);
  const shownWeeks = Number.isFinite(weeks) ? weeks : 12;
  // Group weeks into phases for the timeline.
  const phases: { name: string; from: number; to: number; deload: boolean }[] = [];
  for (let w = 1; w <= shownWeeks; w++) {
    const p = phaseFor(plan, w);
    const last = phases[phases.length - 1];
    if (last && last.name === p.name && last.to === w - 1) last.to = w;
    else phases.push({ name: p.name, from: w, to: w, deload: p.deload });
  }
  const firstWeek = Array.from({ length: plan.daysPerWeek }, (_, i) => planWorkout(plan, i));
  const phaseColor = (n: string) =>
    n === 'Foundation' ? c.accent : n === 'Build' ? c.primary : n === 'Peak' ? '#B07CFF' : n === 'Recovery week' ? c.textMuted : c.warning;

  return (
    <View>
      <Txt variant="h1">{name ? `${name}, your plan is ready` : 'Your plan is ready'}</Txt>
      <Txt dim style={{ marginTop: 6 }}>
        {plan.length ? `${plan.length} days` : 'No end date'} · {plan.daysPerWeek} workouts a week · about {plan.minutes} min each
      </Txt>
      <Row style={{ marginTop: spacing.lg }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{Number.isFinite(sessions) ? sessions : '∞'}</Txt>
          <Txt variant="caption" muted>workouts</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{Number.isFinite(weeks) ? weeks : '∞'}</Txt>
          <Txt variant="caption" muted>weeks</Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{phases.filter((p) => !p.deload).length}</Txt>
          <Txt variant="caption" muted>phases</Txt>
        </Card>
      </Row>

      <Txt variant="h3" style={{ marginTop: spacing.lg }}>
        How it progresses{Number.isFinite(weeks) ? '' : ' (repeats every 12 weeks)'}
      </Txt>
      <Row gap={2} style={{ marginTop: spacing.sm }}>
        {phases.map((p, i) => (
          <View key={i} style={{ flex: p.to - p.from + 1, height: 10, borderRadius: 5, backgroundColor: phaseColor(p.name) }} />
        ))}
      </Row>
      <Row style={{ flexWrap: 'wrap', marginTop: spacing.sm }} gap={spacing.md}>
        {[...new Set(phases.map((p) => p.name))].map((n) => (
          <Row key={n} gap={4}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: phaseColor(n) }} />
            <Txt variant="caption" dim>{n}</Txt>
          </Row>
        ))}
      </Row>

      <Txt variant="h3" style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}>What to expect</Txt>
      <ResultsTimeline
        items={timelineFor(plan.goal === 'flexibility' ? 'mobility' : plan.goal === 'kegel' ? 'core' : 'fullbody').filter(
          (m) => !Number.isFinite(weeks) || m.week <= weeks,
        )}
      />

      <Txt variant="h3" style={{ marginTop: spacing.lg }}>Week 1</Txt>
      <Txt variant="small" dim>Tap a workout to see its exercises. Use Change to swap, remove or add exercises.</Txt>
      {firstWeek.map((w, i) => (
        <Card key={i} style={{ marginTop: spacing.sm }}>
          <Row>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.primary + '22', alignItems: 'center', justifyContent: 'center' }}>
              <Txt variant="small" color={c.primary} style={{ fontWeight: '800' }}>{i + 1}</Txt>
            </View>
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{w.title}</Txt>
              <Txt variant="small" muted>~{estimateMinutes(w)} min · {w.items.length} exercises</Txt>
            </View>
            {plan.id !== 'preview' ? (
              <Button title="Change" small variant="secondary" onPress={() => router.push({ pathname: '/plan-edit', params: { day: String(i) } })} />
            ) : null}
          </Row>
          {plan.id !== 'preview' ? (
            <Pressable onPress={() => router.push({ pathname: '/workout/preview', params: { kind: 'plan', id: plan.id, day: String(i) } })} style={{ marginTop: spacing.sm }}>
              <Txt variant="small" dim numberOfLines={2}>
                {w.items.map((it) => getExercise(it.exerciseId)?.name).filter(Boolean).join(' · ')}
              </Txt>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </View>
  );
}
