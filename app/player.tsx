import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseThumb } from '@/components/ExerciseThumb';
import { Button, EmptyState, IconButton, Loading, ProgressBar, Row, Txt } from '@/components/ui';
import { trainerFeaturesAvailable } from '@/config';
import { createCoach } from '@/lib/coach';
import { uid } from '@/lib/id';
import { resolveWorkout, type ResolvedWorkout } from '@/lib/sources';
import { buildSteps, caloriesFor, formatClock, type Step } from '@/lib/workout';
import { logCompletion } from '@/services/cloud';
import { useApp, useColors, type Session, type WorkoutSourceKind } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

/**
 * The workout player. Deliberately has NO ads: users said ads during workouts
 * are the most annoying thing about free fitness apps.
 */
export default function Player() {
  useKeepAwake();
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind: WorkoutSourceKind; id: string; day?: string }>();
  const day = params.day ? Number(params.day) : undefined;
  const { customWorkouts, settings, profile, programProgress, addSession, completeProgramDay } = useApp();
  const auth = useAuth();
  const intensity = params.kind === 'program' ? programProgress[params.id]?.intensity ?? 1 : 1;

  const [resolved, setResolved] = useState<ResolvedWorkout | null | undefined>(undefined);
  useEffect(() => {
    resolveWorkout(params.kind, params.id, day, customWorkouts).then(setResolved).catch(() => setResolved(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const steps = useMemo<Step[]>(
    () => (resolved ? buildSteps(resolved.workout, { getReady: settings.getReadySeconds, intensity }) : []),
    [resolved, settings.getReadySeconds, intensity],
  );

  const coach = useMemo(() => createCoach({ voice: settings.voice, haptics: settings.haptics }), [settings.voice, settings.haptics]);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const stepStartedAt = useRef(Date.now());
  const endAt = useRef(0);
  const lastSpokenSecond = useRef(-1);
  const exerciseSeconds = useRef<Record<number, number>>({});
  const finished = useRef(false);
  /** Index of the step currently on screen; stale timer ticks compare against it. */
  const indexRef = useRef(0);
  const pausedRef = useRef(false);

  const step = steps[index];
  const nextExercise = steps.slice(index + 1).find((s) => s.kind === 'exercise')?.exercise;

  const recordStepTime = useCallback(() => {
    const s = steps[index];
    if (s?.kind === 'exercise' && !pausedRef.current) {
      const spent = (Date.now() - stepStartedAt.current) / 1000;
      exerciseSeconds.current[index] = (exerciseSeconds.current[index] ?? 0) + spent;
    }
  }, [steps, index]);

  const finish = useCallback(
    (partial = false) => {
      if (finished.current) return;
      finished.current = true;
      recordStepTime();
      coach.stop();
      if (!resolved) return;
      const doneIdx = Object.keys(exerciseSeconds.current).map(Number);
      let kcal = 0;
      for (const i of doneIdx) {
        const ex = steps[i]?.exercise;
        if (ex) kcal += caloriesFor(ex.met, exerciseSeconds.current[i], profile.weightKg);
      }
      const durationSec = Math.round((Date.now() - startedAt.current) / 1000);
      const restSec = Math.max(0, durationSec - doneIdx.reduce((s, i) => s + exerciseSeconds.current[i], 0));
      kcal += caloriesFor(1.5, restSec, profile.weightKg);
      const session: Session = {
        id: uid('s_'),
        title: partial ? `${resolved.title} (partial)` : resolved.title,
        kind: params.kind,
        refId: params.id,
        day,
        startedAt: startedAt.current,
        durationSec,
        calories: Math.round(kcal),
        exercisesDone: new Set(doneIdx.map((i) => steps[i]?.itemIndex)).size,
      };
      addSession(session);
      if (!partial && params.kind === 'program' && day !== undefined) completeProgramDay(params.id, day);
      // Share progress with the coach, if this user has one.
      if (trainerFeaturesAvailable && auth.profile) {
        logCompletion({
          studentId: auth.profile.uid,
          trainerId: auth.profile.trainerId ?? null,
          assignmentId: resolved.assignmentId ?? null,
          day: params.kind === 'assignment' ? day ?? 0 : null,
          title: session.title,
          durationSec: session.durationSec,
          calories: session.calories,
          feeling: null,
          completedAt: Date.now(),
        }).catch(() => undefined);
      }
      coach.success();
      router.replace({ pathname: '/complete', params: { session: session.id, partial: partial ? '1' : '' } });
    },
    [resolved, steps, profile.weightKg, params.kind, params.id, day, addSession, completeProgramDay, auth.profile, coach, router, recordStepTime],
  );

  const goTo = useCallback(
    (i: number) => {
      if (i >= steps.length) return finish(); // finish() records the last step's time
      recordStepTime();
      const s = steps[Math.max(0, i)];
      indexRef.current = Math.max(0, i);
      pausedRef.current = false;
      setPaused(false);
      setIndex(Math.max(0, i));
      stepStartedAt.current = Date.now();
      lastSpokenSecond.current = -1;
      const secs = s.kind === 'exercise' && s.exercise?.mode === 'reps' ? 0 : s.seconds ?? 0;
      setRemaining(secs);
      endAt.current = Date.now() + secs * 1000;
      coach.bump();
      if (s.kind === 'ready') coach.say(`Get ready. First up, ${steps[1]?.exercise?.name ?? ''}`);
      else if (s.kind === 'rest') {
        const nx = steps.slice(i + 1).find((x) => x.kind === 'exercise')?.exercise;
        coach.say(`Rest. Next, ${nx?.name ?? ''}`);
      } else if (s.exercise) {
        const amount = s.exercise.mode === 'time' ? `${s.seconds} seconds` : `${s.reps} reps`;
        coach.say(`${s.exercise.name}. ${amount}${s.exercise.perSide ? ', split across both sides' : ''}`);
      }
    },
    [steps, coach, finish, recordStepTime],
  );

  // Start once steps are ready.
  useEffect(() => {
    if (steps.length && !finished.current) {
      startedAt.current = Date.now();
      goTo(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length]);

  // Tick.
  useEffect(() => {
    if (!step || paused) return;
    const timer = setInterval(() => {
      if (indexRef.current !== index) return; // a newer step already started
      setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
      const timed = !(step.kind === 'exercise' && step.exercise?.mode === 'reps');
      if (!timed) return;
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 3 && left > 0 && lastSpokenSecond.current !== left) {
        lastSpokenSecond.current = left;
        coach.say(String(left));
        coach.tick();
      }
      if (left === 0) goTo(index + 1);
    }, 250);
    return () => clearInterval(timer);
  }, [step, paused, index, goTo, coach]);

  const togglePause = () => {
    if (paused) {
      endAt.current = Date.now() + remaining * 1000;
      stepStartedAt.current = Date.now();
      pausedRef.current = false;
      setPaused(false);
      coach.say('Go');
    } else {
      recordStepTime();
      pausedRef.current = true;
      setPaused(true);
      coach.stop();
    }
  };

  const confirmExit = useCallback(() => {
    const doneSomething = Object.keys(exerciseSeconds.current).length > 0 || (steps[index]?.kind === 'exercise' && index > 1);
    Alert.alert('End workout?', doneSomething ? 'Save what you have done so far?' : 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel' },
      ...(doneSomething ? [{ text: 'Save & end', onPress: () => finish(true) }] : []),
      { text: 'Quit', style: 'destructive' as const, onPress: () => { coach.stop(); router.back(); } },
    ]);
  }, [steps, index, finish, coach, router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      confirmExit();
      return true;
    });
    return () => sub.remove();
  }, [confirmExit]);

  useEffect(() => () => coach.stop(), [coach]);

  if (resolved === undefined) return <Loading />;
  if (!resolved || !steps.length || !step) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <EmptyState icon="alert-circle" title="Could not load this workout" action="Go back" onAction={() => router.back()} />
      </SafeAreaView>
    );
  }

  const isRest = step.kind === 'rest' || step.kind === 'ready';
  const isReps = step.kind === 'exercise' && step.exercise?.mode === 'reps';
  const shown = isRest ? nextExercise : step.exercise;
  const total = step.seconds ?? 1;
  const exerciseSteps = steps.filter((s) => s.kind === 'exercise').length;
  const exerciseNumber = steps.slice(0, index + 1).filter((s) => s.kind === 'exercise').length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isRest ? c.surface : c.bg }} edges={['top', 'bottom']}>
      <Row style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm, justifyContent: 'space-between' }}>
        <IconButton icon="close" onPress={confirmExit} label="End workout" />
        <Txt variant="h3">{formatClock(elapsed)}</Txt>
        <Txt variant="small" muted style={{ width: 42, textAlign: 'right' }}>
          {exerciseNumber}/{exerciseSteps}
        </Txt>
      </Row>
      <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.md }}>
        <ProgressBar value={index / steps.length} />
      </View>

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl }}>
        <Txt variant="label" color={isRest ? c.accent : c.primary}>
          {step.kind === 'ready' ? 'Get ready' : step.kind === 'rest' ? 'Rest' : step.totalSets && step.totalSets > 1 ? `Set ${step.setNumber} of ${step.totalSets}` : 'Go!'}
        </Txt>
        {shown ? (
          <View style={{ marginTop: spacing.lg }}>
            <ExerciseThumb exercise={shown} size={isRest ? 120 : 170} />
          </View>
        ) : null}
        <Txt variant="h1" center style={{ marginTop: spacing.lg, fontSize: isRest ? 22 : 30 }}>
          {isRest ? (shown ? `Next: ${shown.name}` : 'Almost done') : step.exercise?.name}
        </Txt>
        {step.note && !isRest ? <Txt color={c.primary} center style={{ marginTop: 6 }}>{step.note}</Txt> : null}

        {isReps ? (
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Txt style={{ fontSize: 72, fontWeight: '900' }}>×{step.reps}</Txt>
            <Txt muted>{step.exercise?.perSide ? 'reps total, split across both sides' : 'reps'}</Txt>
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Txt style={{ fontSize: 80, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{formatClock(remaining)}</Txt>
            <View style={{ width: 220, marginTop: spacing.sm }}>
              <ProgressBar value={1 - remaining / Math.max(1, total)} color={isRest ? c.accent : c.primary} />
            </View>
          </View>
        )}

        {!isRest && step.exercise ? (
          <Pressable onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: step.exercise!.id } })} style={{ marginTop: spacing.lg }}>
            <Txt variant="small" color={c.textDim} style={{ textDecorationLine: 'underline' }}>How to do it</Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {isReps ? (
          <Button title="Done" icon="checkmark" onPress={() => goTo(index + 1)} />
        ) : isRest ? (
          <Row>
            <Button title="+20s" variant="secondary" style={{ flex: 1 }} onPress={() => { endAt.current += 20000; setRemaining((r) => r + 20); }} />
            <Button title="Skip rest" style={{ flex: 2 }} onPress={() => goTo(index + 1)} />
          </Row>
        ) : null}
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="play-skip-back" onPress={() => goTo(Math.max(0, index - 1))} label="Previous" />
          <Pressable
            onPress={togglePause}
            accessibilityLabel={paused ? 'Resume' : 'Pause'}
            style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={32} color="#fff" />
          </Pressable>
          <IconButton icon="play-skip-forward" onPress={() => goTo(index + 1)} label="Next" />
        </Row>
        {paused ? (
          <View style={{ backgroundColor: c.surfaceAlt, borderRadius: radius.md, padding: spacing.sm }}>
            <Txt center dim variant="small">Paused. Take your time.</Txt>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
