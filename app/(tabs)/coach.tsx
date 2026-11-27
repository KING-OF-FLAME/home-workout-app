import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Divider, EmptyState, ErrorText, Field, ListRow, Loading, Row, Screen, SectionHeader, StatTile, Txt } from '@/components/ui';
import { AppConfig, isFirebaseConfigured, trainerFeaturesAvailable } from '@/config';
import { cancelCoachSyncReminder, scheduleCoachSyncReminder } from '@/lib/notifications';
import { importFromFile } from '@/lib/offlineImport';
import { buildProgressPacket, sharePacketFile } from '@/services/offlineShare';
import { getCoachLink, syncWithTrainer, unlinkTrainer, type CoachLink } from '@/services/nearbySync';
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
  if (!trainerFeaturesAvailable) return <NotConfigured />;
  if (auth.loading) return <Loading />;
  if (isFirebaseConfigured && !auth.user) return <SignedOut />;
  if (!auth.profile) return <ProfileError />;
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
          title="Coach features are turned off"
          message="Set features.trainerMode to true in config/app-config.json to let trainers add students and assign workout and meal plans."
        />
      </Card>
    </Screen>
  );
}

function ProfileError() {
  const { refresh, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <Screen>
      <Txt variant="h1">Coach</Txt>
      <Card style={{ marginTop: spacing.lg }}>
        <EmptyState icon="cloud-offline" title="Could not load your account" message="Check your internet connection and try again." />
        <ErrorText message={error} />
        <Button
          title="Try again"
          loading={busy}
          onPress={async () => {
            setBusy(true);
            setError(null);
            try {
              await refresh();
            } catch (e) {
              setError(friendlyAuthError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
        <Button title="Sign out" variant="ghost" onPress={() => signOut()} style={{ marginTop: spacing.sm }} />
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
  const { profile, offline, refresh } = useAuth();
  const addRoute = offline ? '/trainer/share' : '/trainer/invite';
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

      {offline ? (
        <Card tint={c.primary} style={{ marginTop: spacing.lg }} onPress={() => router.push('/trainer/share')}>
          <Row>
            <Ionicons name="radio" size={24} color="#fff" />
            <View style={{ flex: 1 }}>
              <Txt variant="h3" color="#fff">Share & sync with students</Txt>
              <Txt variant="small" color="#ffffffdd">Your phone is the host. Students join with your code on the same Wi-Fi or your hotspot.</Txt>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Row>
        </Card>
      ) : null}

      <SectionHeader title="Quick actions" />
      <Card style={{ paddingVertical: spacing.sm }}>
        <ListRow icon="person-add" iconColor={c.primary} title="Add a student" subtitle={offline ? 'Show your code' : 'Share an invite code'} onPress={() => router.push(addRoute)} />
        <Divider />
        <ListRow icon="barbell" iconColor={c.accent} title="Workout plans" subtitle="Build multi-day plans" onPress={() => router.push('/trainer/plans')} />
        <Divider />
        <ListRow icon="restaurant" iconColor={c.warning} title="Meal plans" subtitle="Meals, calories and macros" onPress={() => router.push('/trainer/meals')} />
      </Card>

      {offline ? (
        <>
          <SectionHeader title="No Wi-Fi? Use a QR code or a file" />
          <Card style={{ paddingVertical: spacing.sm }}>
            <ListRow icon="qr-code" iconColor={c.primary} title="Scan a student's QR" subtitle="Adds a new student or saves their workouts" onPress={() => router.push('/scan')} />
            <Divider />
            <ListRow
              icon="document-attach"
              iconColor={c.accent}
              title="Open a student's file"
              subtitle="A .fithome file from WhatsApp, email or Files"
              onPress={async () => { if (profile && (await importFromFile(profile))) load(); }}
            />
          </Card>
          <Txt variant="caption" muted style={{ marginTop: spacing.sm }}>
            To send plans back, open the student below and tap "Show plans as QR" or "Send plans as a file".
          </Txt>
        </>
      ) : null}

      <SectionHeader title="Students" action="Add" onAction={() => router.push(addRoute)} />
      {students === null ? (
        <Loading />
      ) : students.length === 0 ? (
        <Card>
          <EmptyState
            icon="people"
            title="No students yet"
            message={offline ? 'Start sharing and give your code to a student. When they enter it and you accept, they appear here.' : 'Create an invite code and share it. When a student enters it, they appear here.'}
            action={offline ? 'Start sharing' : 'Invite a student'}
            onAction={() => router.push(addRoute)}
          />
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
      {offline ? (
        <Button
          title="Use this phone as a member instead"
          variant="ghost"
          style={{ marginTop: spacing.xl }}
          onPress={() =>
            Alert.alert('Switch to member?', 'Your students and plans stay saved on this phone. Switch back anytime.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Switch', onPress: async () => { if (profile) { await updateUserDoc(profile.uid, { role: 'member' }); await refresh(); } } },
            ])
          }
        />
      ) : null}
    </Screen>
  );
}

function StudentView() {
  return useAuth().offline ? <OfflineStudentView /> : <CloudStudentView />;
}

/** Student without an account: joins and syncs with the trainer's phone over Wi-Fi or hotspot. */
/** QR and file options for a student phone (no Wi-Fi needed). */
function StudentOfflineOptions({ onChanged }: { onChanged: () => void }) {
  const c = useColors();
  const router = useRouter();
  const { profile, refresh } = useAuth();
  if (!profile) return null;
  const sendFile = async () => {
    try {
      await sharePacketFile(await buildProgressPacket(profile));
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Try again.');
    }
  };
  return (
    <>
      <SectionHeader title="No Wi-Fi? Use a QR code or a file" />
      <Card style={{ paddingVertical: spacing.sm }}>
        <ListRow icon="qr-code" iconColor={c.primary} title="Scan trainer's QR" subtitle="Get your plans from your trainer's screen" onPress={() => router.push('/scan')} />
        <Divider />
        <ListRow
          icon="document-attach"
          iconColor={c.accent}
          title="Open a plan file"
          subtitle="The .fithome file your trainer sent"
          onPress={async () => { if (await importFromFile(profile)) { await refresh(); onChanged(); } }}
        />
        <Divider />
        <ListRow icon="qr-code-outline" iconColor={c.success} title="Show my QR" subtitle="Your trainer scans it to add you or see your workouts" onPress={() => router.push({ pathname: '/share-qr', params: { kind: 'progress' } })} />
        <Divider />
        <ListRow icon="share-social" iconColor={c.warning} title="Send my progress as a file" subtitle="WhatsApp, email or any app" onPress={sendFile} />
      </Card>
    </>
  );
}

function OfflineStudentView() {
  const c = useColors();
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<CoachLink | null>(null);
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [editingCode, setEditingCode] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLink(await getCoachLink());
    setAssignments(profile.trainerId ? await listMyAssignments(profile.uid) : []);
  }, [profile]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { if (link) setCode(link.code); }, [link]);

  const sync = async (useCode: string) => {
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      const joining = !profile.trainerId;
      const r = await syncWithTrainer(profile, useCode);
      await refresh();
      await load();
      setEditingCode(false);
      scheduleCoachSyncReminder(r.trainerName).catch(() => undefined);
      Alert.alert(
        joining ? 'You are in!' : 'Synced',
        joining
          ? `You joined ${r.trainerName}'s team. ${r.plans} plan${r.plans === 1 ? '' : 's'} ready.`
          : `${r.plans} plan${r.plans === 1 ? '' : 's'} up to date. ${r.trainerName} now has your ${r.sent} finished workouts.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sync.');
      await refresh();
      await load();
    } finally {
      setBusy(false);
    }
  };

  const becomeTrainer = () =>
    Alert.alert('Use this phone as a trainer?', 'You will be able to add students and assign plans. Switch back anytime.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Switch', onPress: async () => { if (profile) { await updateUserDoc(profile.uid, { role: 'trainer' }); await refresh(); } } },
    ]);

  if (!profile) return <Loading />;

  if (!profile.trainerId) {
    return (
      <Screen>
        <Txt variant="h1">Coach</Txt>
        <Card style={{ marginTop: spacing.lg }}>
          <Txt variant="h2">Join your coach</Txt>
          <Txt dim style={{ marginTop: 6, marginBottom: spacing.lg }}>
            Ask your trainer to tap "Share with students". Join the same Wi-Fi or their hotspot, then enter the 10-character code.
          </Txt>
          <ErrorText message={error} />
          <Field
            placeholder="K7Q2M-9XA3F"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={11}
            style={{ fontSize: 22, letterSpacing: 3, textAlign: 'center', fontWeight: '800' }}
          />
          <Button title="Join" icon="enter" onPress={() => sync(code)} loading={busy} disabled={code.replace(/[^0-9A-Z]/gi, '').length < 10} />
          {busy ? <Txt variant="caption" muted center style={{ marginTop: spacing.sm }}>Waiting for your trainer to accept…</Txt> : null}
        </Card>
        <StudentOfflineOptions onChanged={load} />
        {AppConfig.features.allowTrainerSignup ? (
          <Card style={{ marginTop: spacing.md }}>
            <ListRow icon="people" iconColor={c.accent} title="I am a trainer" subtitle="Use this phone to coach students" onPress={becomeTrainer} />
          </Card>
        ) : null}
        <BannerAdSlot placement="coach" />
      </Screen>
    );
  }

  const workouts = assignments?.filter((a) => a.type === 'workout') ?? [];
  const meals = assignments?.filter((a) => a.type === 'meal') ?? [];
  const daysSince = link ? Math.floor((Date.now() - link.lastSyncAt) / 86400000) : null;

  return (
    <Screen>
      <Txt variant="label" muted>Your coach</Txt>
      <Txt variant="h1">{profile.trainerName ?? 'Coach'}</Txt>
      <Card style={{ marginTop: spacing.lg }} tint={daysSince !== null && daysSince >= 7 ? c.warning + '22' : undefined}>
        <Row>
          <Ionicons name="sync" size={22} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">Sync with your coach</Txt>
            <Txt variant="small" muted>
              {daysSince === null ? 'Not synced yet' : daysSince === 0 ? 'Last synced today' : `Last synced ${daysSince} day${daysSince === 1 ? '' : 's'} ago`}
            </Txt>
          </View>
        </Row>
        <ErrorText message={error} />
        {editingCode ? (
          <Field
            placeholder="New code from your coach"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            maxLength={11}
            style={{ fontSize: 18, letterSpacing: 2, textAlign: 'center', fontWeight: '800', marginTop: spacing.md }}
          />
        ) : null}
        <Row style={{ marginTop: spacing.md }}>
          <Button title="Sync now" icon="sync" small loading={busy} onPress={() => sync(code)} disabled={code.replace(/[^0-9A-Z]/gi, '').length < 10} style={{ flex: 1 }} />
          <Button title={editingCode ? 'Cancel' : 'New code'} small variant="secondary" onPress={() => setEditingCode((v) => !v)} style={{ flex: 1 }} />
        </Row>
        <Txt variant="caption" muted style={{ marginTop: spacing.sm }}>
          Your coach turns on sharing; you both need the same Wi-Fi or their hotspot. If the code changed, tap New code. Not together? Use a QR code or a file below.
        </Txt>
      </Card>

      <SectionHeader title="Workout plans" />
      {workouts.length === 0 ? (
        <Card><Txt dim>No workout plan yet. Sync after your coach assigns one.</Txt></Card>
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
          </Card>
        ))
      )}
      <StudentOfflineOptions onChanged={load} />
      <BannerAdSlot placement="coach" />
      <Button
        title="Remove this coach"
        variant="ghost"
        style={{ marginTop: spacing.xl }}
        onPress={() =>
          Alert.alert('Remove your coach?', 'Their plans will be removed from this phone. You can join again with a new code.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: async () => {
                await unlinkTrainer(profile);
                cancelCoachSyncReminder().catch(() => undefined);
                await refresh();
                await load();
              },
            },
          ])
        }
      />
    </Screen>
  );
}

function CloudStudentView() {
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
