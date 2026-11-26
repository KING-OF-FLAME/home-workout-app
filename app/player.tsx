import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
  /** Seconds actually spent on each exercise step (pauses excluded). */
  const exerciseSeconds = useRef<Record<number, number>>({});
  /** Exercise steps finished properly: timer ran out or "Done" pressed (not skipped). */
  const completedSteps = useRef<Set<number>>(new Set());
  const finished = useRef(false);
  const started = useRef(false);
  /** Index of the step currently on screen; stale timer ticks compare against it. */
  const indexRef = useRef(0);
  const pausedRef = useRef(false);
  const pausedAt = useRef(0);
  const pausedTotal = useRef(0);

  const step = steps[index];
  const nextExercise = steps.slice(index + 1).find((s) => s.kind === 'exercise')?.exercise;

  /** Active (unpaused) seconds since the workout started. */
  const activeSeconds = () =>
    (Date.now() - startedAt.current - pausedTotal.current - (pausedRef.current ? Date.now() - pausedAt.current : 0)) / 1000;

  const recordStepTime = () => {
    const i = indexRef.current;
    if (!started.current || pausedRef.current || steps[i]?.kind !== 'exercise') return;
    exerciseSeconds.current[i] = (exerciseSeconds.current[i] ?? 0) + (Date.now() - stepStartedAt.current) / 1000;
    stepStartedAt.current = Date.now();
  };

  const finishRef = useRef<(partial?: boolean) => void>(() => undefined);
  finishRef.current = (requestedPartial = false) => {
    if (finished.current || !resolved) return;
    recordStepTime();
    finished.current = true;
    coach.stop();
    const exerciseStepCount = steps.filter((s) => s.kind === 'exercise').length;
    const completedCount = completedSteps.current.size;
    // Skipping through most of a workout does not count as finishing it.
    const partial = requestedPartial || completedCount < Math.ceil(exerciseStepCount / 2);
    const timed = Object.keys(exerciseSeconds.current).map(Number);
    let kcal = 0;
    for (const i of timed) {
      const ex = steps[i]?.exercise;
      if (ex) kcal += caloriesFor(ex.met, exerciseSeconds.current[i], profile.weightKg);
    }
    const durationSec = Math.round(activeSeconds());
    const restSec = Math.max(0, durationSec - timed.reduce((sum, i) => sum + exerciseSeconds.current[i], 0));
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
      exercisesDone: new Set([...completedSteps.current].map((i) => steps[i]?.itemIndex)).size,
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
  };

  /** Move to step i. `completed` is true when the current step ended naturally (timer or Done). */
  const goTo = useCallback(
    (i: number, completed = false) => {
      if (completed && steps[indexRef.current]?.kind === 'exercise') completedSteps.current.add(indexRef.current);
      if (i >= steps.length) return finishRef.current(false);
      recordStepTime();
      const target = Math.max(0, i);
      const s = steps[target];
      if (pausedRef.current) {
        pausedTotal.current += Date.now() - pausedAt.current;
        pausedRef.current = false;
        setPaused(false);
      }
      started.current = true;
      indexRef.current = target;
      setIndex(target);
      stepStartedAt.current = Date.now();
      lastSpokenSecond.current = -1;
      const secs = s.kind === 'exercise' && s.exercise?.mode === 'reps' ? 0 : s.seconds ?? 0;
      setRemaining(secs);
      endAt.current = Date.now() + secs * 1000;
      coach.bump();
      if (s.kind === 'ready') coach.say(`Get ready. First up, ${steps[target + 1]?.exercise?.name ?? ''}`);
      else if (s.kind === 'rest') {
        const nx = steps.slice(target + 1).find((x) => x.kind === 'exercise')?.exercise;
        coach.say(`Rest. Next, ${nx?.name ?? ''}`);
      } else if (s.exercise) {
        const amount = s.exercise.mode === 'time' ? `${s.seconds} seconds` : `${s.reps} reps`;
        coach.say(`${s.exercise.name}. ${amount}${s.exercise.perSide ? ', split across both sides' : ''}`);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [steps, coach],
  );

  // Start once steps are ready.
  useEffect(() => {
    if (steps.length && !finished.current && !started.current) {
      startedAt.current = Date.now();
      goTo(0);
    }
  }, [steps.length, goTo]);

  // Tick.
  useEffect(() => {
    if (!step || paused) return;
    const timer = setInterval(() => {
      if (indexRef.current !== index || pausedRef.current || finished.current) return; // stale tick
      setElapsed(Math.round(activeSeconds()));
      const timed = !(step.kind === 'exercise' && step.exercise?.mode === 'reps');
      if (!timed) return;
      const left = Math.max(0, Math.ceil((endAt.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 3 && left > 0 && lastSpokenSecond.current !== left) {
        lastSpokenSecond.current = left;
        coach.say(String(left));
        coach.tick();
      }
      if (left === 0) goTo(index + 1, true);
    }, 250);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, paused, index, goTo, coach]);

  const pause = useCallback(() => {
    if (pausedRef.current || finished.current) return false;
    recordStepTime();
    pausedRef.current = true;
    pausedAt.current = Date.now();
    setPaused(true);
    coach.stop();
    return true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach]);

  const resume = useCallback(() => {
    if (!pausedRef.current) return;
    pausedTotal.current += Date.now() - pausedAt.current;
    endAt.current = Date.now() + remaining * 1000;
    stepStartedAt.current = Date.now();
    pausedRef.current = false;
    setPaused(false);
    coach.say('Go');
  }, [remaining, coach]);

  const togglePause = () => (paused ? resume() : pause());

  const confirmExit = useCallback(() => {
    // Stop the clock while the dialog is open.
    const pausedByDialog = pause();
    const doneSomething = Object.keys(exerciseSeconds.current).length > 0;
    Alert.alert('End workout?', doneSomething ? 'Save what you have done so far?' : 'Your progress will not be saved.', [
      { text: 'Keep going', style: 'cancel', onPress: () => { if (pausedByDialog) resume(); } },
      ...(doneSomething ? [{ text: 'Save & end', onPress: () => finishRef.current(true) }] : []),
      { text: 'Quit', style: 'destructive' as const, onPress: () => { finished.current = true; coach.stop(); router.back(); } },
    ], { cancelable: false });
  }, [pause, resume, coach, router]);

  /** Show exercise instructions; the workout pauses so nothing runs behind that screen. */
  const showHowTo = (exerciseId: string) => {
    pause();
    router.push({ pathname: '/exercise/[id]', params: { id: exerciseId, fromPlayer: '1' } });
  };

  // Hardware back only while this screen is focused (not when "How to do it" is on top).
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmExit();
        return true;
      });
      return () => sub.remove();
    }, [confirmExit]),
  );

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
            <Txt style={{ fontSize: 72, lineHeight: 86, fontWeight: '900' }}>×{step.reps}</Txt>
            <Txt muted>{step.exercise?.perSide ? 'reps total, split across both sides' : 'reps'}</Txt>
          </View>
        ) : (
          <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
            <Txt style={{ fontSize: 80, lineHeight: 96, fontWeight: '900', fontVariant: ['tabular-nums'] }}>{formatClock(remaining)}</Txt>
            <View style={{ width: 220, marginTop: spacing.sm }}>
              <ProgressBar value={1 - remaining / Math.max(1, total)} color={isRest ? c.accent : c.primary} />
            </View>
          </View>
        )}

        {!isRest && step.exercise ? (
          <Pressable onPress={() => showHowTo(step.exercise!.id)} style={{ marginTop: spacing.lg }}>
            <Txt variant="small" color={c.textDim} style={{ textDecorationLine: 'underline' }}>How to do it</Txt>
          </Pressable>
        ) : null}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        {isReps ? (
          <Button title="Done" icon="checkmark" onPress={() => goTo(index + 1, true)} />
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
