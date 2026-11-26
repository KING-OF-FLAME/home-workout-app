import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Divider, EmptyState, ErrorText, Field, ListRow, Loading, Row, Screen, SectionHeader, StatTile, Txt } from '@/components/ui';
import { AppConfig, isFirebaseConfigured } from '@/config';
import {
  getRosterEntry,
  leaveTrainer,
  listMealPlans,
  listMyAssignments,
  listStudents,
  listWorkoutPlans,
  redeemInvite,
  updateUserDoc,
  type Assignment,
  type RosterEntry,
} from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { spacing } from '@/theme';

export default function Coach() {
  const auth = useAuth();
  if (!isFirebaseConfigured) return <NotConfigured />;
  if (auth.loading) return <Loading />;
  if (!auth.user || !auth.profile) return <SignedOut />;
  if (auth.profile.role === 'trainer') return <TrainerDashboard />;
  return <StudentView />;
}

function NotConfigured() {
  return (
    <Screen>
      <Txt variant="h1">Coach</Txt>
      <Card style={{ marginTop: spacing.lg }}>
        <EmptyState
          icon="cloud-offline"
          title="Coach features are not set up"
          message="Add your Firebase keys in config/app-config.json to let trainers add students and assign workout and meal plans. See the README."
        />
      </Card>
    </Screen>
  );
}

function SignedOut() {
  const c = useColors();
  const router = useRouter();
  return (
    <Screen>
      <Txt variant="h1">Coach</Txt>
      <Card style={{ marginTop: spacing.lg }}>
        <Ionicons name="fitness" size={28} color={c.primary} />
        <Txt variant="h2" style={{ marginTop: spacing.sm }}>Train with your coach</Txt>
        <Txt dim style={{ marginTop: 6 }}>
          Join with the code your trainer gives you. Get workout plans and meal plans made for you, and let your coach see your progress.
        </Txt>
        <Button title="Create account" style={{ marginTop: spacing.lg }} onPress={() => router.push('/auth/sign-up')} />
        <Button title="I already have an account" variant="ghost" onPress={() => router.push('/auth/sign-in')} />
      </Card>
      {AppConfig.features.allowTrainerSignup ? (
        <Card style={{ marginTop: spacing.md }}>
          <Ionicons name="people" size={28} color={c.accent} />
          <Txt variant="h2" style={{ marginTop: spacing.sm }}>Are you a trainer?</Txt>
          <Txt dim style={{ marginTop: 6 }}>
            Add your students, build workout and meal plans, assign them in a tap and track every session. Free.
          </Txt>
          <Button
            title="Start coaching"
            variant="secondary"
            style={{ marginTop: spacing.lg }}
            onPress={() => router.push({ pathname: '/auth/sign-up', params: { role: 'trainer' } })}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

function TrainerDashboard() {
  const c = useColors();
  const router = useRouter();
  const { profile } = useAuth();
  const [students, setStudents] = useState<RosterEntry[] | null>(null);
  const [counts, setCounts] = useState({ plans: 0, meals: 0 });
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setError(null);
      const [s, p, m] = await Promise.all([listStudents(profile.uid), listWorkoutPlans(profile.uid), listMealPlans(profile.uid)]);
      setStudents(s);
      setCounts({ plans: p.length, meals: m.length });
    } catch (e) {
      setError(friendlyAuthError(e));
      setStudents([]);
    }
  }, [profile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen>
      <Txt variant="label" muted>Trainer</Txt>
      <Txt variant="h1">Hi, {profile?.displayName}</Txt>
      <ErrorText message={error} />
      <Row style={{ marginTop: spacing.lg }}>
        <StatTile icon="people" label="Students" value={students?.length ?? '–'} />
        <StatTile icon="barbell" label="Workout plans" value={counts.plans} color={c.accent} />
        <StatTile icon="restaurant" label="Meal plans" value={counts.meals} color={c.warning} />
      </Row>

      <SectionHeader title="Quick actions" />
      <Card style={{ paddingVertical: spacing.sm }}>
        <ListRow icon="person-add" iconColor={c.primary} title="Add a student" subtitle="Share an invite code" onPress={() => router.push('/trainer/invite')} />
        <Divider />
        <ListRow icon="barbell" iconColor={c.accent} title="Workout plans" subtitle="Build multi-day plans" onPress={() => router.push('/trainer/plans')} />
        <Divider />
        <ListRow icon="restaurant" iconColor={c.warning} title="Meal plans" subtitle="Meals, calories and macros" onPress={() => router.push('/trainer/meals')} />
      </Card>

      <SectionHeader title="Students" action="Add" onAction={() => router.push('/trainer/invite')} />
      {students === null ? (
        <Loading />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState icon="people" title="No students yet" message="Create an invite code and share it. When a student enters it, they appear here." action="Invite a student" onAction={() => router.push('/trainer/invite')} />
        </Card>
      ) : (
        <Card style={{ paddingVertical: spacing.sm }}>
          {students.map((s, i) => (
            <View key={s.studentId}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                icon="person"
                title={s.name}
                subtitle={s.note ? s.note : `Joined ${new Date(s.joinedAt).toLocaleDateString()}`}
                onPress={() => router.push({ pathname: '/trainer/student/[id]', params: { id: s.studentId } })}
              />
            </View>
          ))}
        </Card>
      )}
      <BannerAdSlot placement="coach" />
    </Screen>
  );
}

function StudentView() {
  const c = useColors();
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);

  const load = useCallback(async () => {
    if (!profile?.trainerId) return setAssignments([]);
    try {
      // If the trainer removed this student, clear the link.
      const entry = await getRosterEntry(profile.trainerId, profile.uid);
      if (!entry) {
        await updateUserDoc(profile.uid, { trainerId: null, trainerName: null });
        await refresh();
        return;
      }
      setAssignments(await listMyAssignments(profile.uid));
    } catch (e) {
      setError(friendlyAuthError(e));
      setAssignments([]);
    }
  }, [profile, refresh]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const join = async () => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const name = await redeemInvite(code, profile);
      await refresh();
      setCode('');
      Alert.alert('You are in!', `You joined ${name}'s team. Plans they assign will show up here.`);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const becomeTrainer = () =>
    Alert.alert('Switch to a trainer account?', 'You will be able to add students and assign plans.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          if (!profile) return;
          if (profile.trainerId) await leaveTrainer(profile);
          await updateUserDoc(profile.uid, { role: 'trainer' });
          await refresh();
        },
      },
    ]);

  if (!profile?.trainerId) {
    return (
      <Screen>
        <Txt variant="h1">Coach</Txt>
        <Card style={{ marginTop: spacing.lg }}>
          <Txt variant="h2">Join your coach</Txt>
          <Txt dim style={{ marginTop: 6, marginBottom: spacing.lg }}>Enter the 6-character code your trainer shared with you.</Txt>
          <ErrorText message={error} />
          <Field placeholder="e.g. K7P2QX" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" maxLength={8} style={{ fontSize: 22, letterSpacing: 4, textAlign: 'center', fontWeight: '800' }} />
          <Button title="Join" onPress={join} loading={busy} disabled={code.trim().length < 6} />
        </Card>
        {AppConfig.features.allowTrainerSignup ? (
          <Card style={{ marginTop: spacing.md }}>
            <ListRow icon="people" iconColor={c.accent} title="I am a trainer" subtitle="Switch this account to coach students" onPress={becomeTrainer} />
          </Card>
        ) : null}
        <BannerAdSlot placement="coach" />
      </Screen>
    );
  }

  const workouts = assignments?.filter((a) => a.type === 'workout') ?? [];
  const meals = assignments?.filter((a) => a.type === 'meal') ?? [];

  return (
    <Screen>
      <Txt variant="label" muted>Your coach</Txt>
      <Txt variant="h1">{profile.trainerName ?? 'Coach'}</Txt>
      <ErrorText message={error} />
      {assignments === null ? (
        <Loading />
      ) : (
        <>
          <SectionHeader title="Workout plans" />
          {workouts.length === 0 ? (
            <Card><Txt dim>No workout plan yet. Your coach will assign one soon.</Txt></Card>
          ) : (
            workouts.map((a) => (
              <Card key={a.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/student/plan/[id]', params: { id: a.id } })}>
                <Row>
                  <Ionicons name="barbell" size={22} color={c.primary} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">{a.title}</Txt>
                    <Txt variant="small" muted>{a.workoutPlan?.days.length ?? 0} days · from {a.startDate}</Txt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Row>
                {a.note ? <Txt variant="small" color={c.primary} style={{ marginTop: spacing.sm }}>“{a.note}”</Txt> : null}
              </Card>
            ))
          )}
          <SectionHeader title="Meal plans" />
          {meals.length === 0 ? (
            <Card><Txt dim>No meal plan yet.</Txt></Card>
          ) : (
            meals.map((a) => (
              <Card key={a.id} style={{ marginBottom: spacing.md }} onPress={() => router.push({ pathname: '/student/meal/[id]', params: { id: a.id } })}>
                <Row>
                  <Ionicons name="restaurant" size={22} color={c.accent} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="h3">{a.title}</Txt>
                    <Txt variant="small" muted>{a.mealPlan?.targetCalories ? `${a.mealPlan.targetCalories} kcal/day · ` : ''}{a.mealPlan?.days.length ?? 0} days</Txt>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Row>
                {a.note ? <Txt variant="small" color={c.primary} style={{ marginTop: spacing.sm }}>“{a.note}”</Txt> : null}
              </Card>
            ))
          )}
        </>
      )}
      <BannerAdSlot placement="coach" />
      <Button
        title="Leave this coach"
        variant="ghost"
        style={{ marginTop: spacing.xl }}
        onPress={() =>
          Alert.alert('Leave your coach?', 'Your coach will no longer see your progress.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Leave', style: 'destructive', onPress: async () => { await leaveTrainer(profile); await refresh(); } },
          ])
        }
      />
    </Screen>
  );
}
