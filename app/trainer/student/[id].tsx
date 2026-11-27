import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Divider, EmptyState, ErrorText, Field, ListRow, Loading, Row, Screen, SectionHeader, StatTile, Txt } from '@/components/ui';
import { dayKey, friendlyDate, streaks } from '@/lib/dates';
import { formatClock } from '@/lib/workout';
import {
  deleteAssignment,
  getRosterEntry,
  listAssignmentsForStudent,
  listCompletionsForStudent,
  refreshAssignment,
  removeStudent,
  setAssignmentActive,
  updateStudentNote,
  type Assignment,
  type Completion,
  type RosterEntry,
} from '@/services/cloud';
import { useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { buildPlanPacket, sharePacketFile } from '@/services/offlineShare';
import { spacing } from '@/theme';

export default function StudentDetail() {
  const c = useColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const [student, setStudent] = useState<RosterEntry | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'note' | 'remove' | 'plan' | null>(null);
  // The note is filled in once per student, so coming back to this screen
  // does not wipe what the trainer is typing.
  const noteFor = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [s, a, comp] = await Promise.all([
        getRosterEntry(profile.uid, id),
        listAssignmentsForStudent(profile.uid, id),
        listCompletionsForStudent(profile.uid, id),
      ]);
      setStudent(s);
      if (noteFor.current !== id) {
        noteFor.current = id;
        setNote(s?.note ?? '');
      }
      setAssignments(a);
      setCompletions(comp);
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setLoading(false);
    }
  }, [profile, id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <Loading />;
  if (!student || !profile) return <EmptyState icon="person" title="Student not found" message="They may have left your team." />;

  const weekAgo = Date.now() - 7 * 86400000;
  const thisWeek = completions.filter((x) => x.completedAt >= weekAgo).length;
  const { current } = streaks(new Set(completions.map((x) => dayKey(x.completedAt))));
  const totalMin = Math.round(completions.reduce((s, x) => s + x.durationSec, 0) / 60);
  const active = assignments.filter((a) => a.active);
  const past = assignments.filter((a) => !a.active);

  /** Runs one change at a time and shows an alert if it fails. */
  const run = async (kind: 'note' | 'remove' | 'plan', failTitle: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(kind);
    try {
      await fn();
    } catch (e) {
      Alert.alert(failTitle, friendlyAuthError(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmDelete = (a: Assignment) =>
    Alert.alert(
      'Delete this plan?',
      `"${a.title}" will be removed from ${student.name}'s plans. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => run('plan', 'Could not delete', async () => { await deleteAssignment(a.id); await load(); }) },
      ],
      { cancelable: true },
    );

  // Android shows at most 3 buttons; tapping outside closes the dialog.
  const assignmentActions = (a: Assignment) =>
    Alert.alert(
      a.title,
      'Tap outside to close.',
      [
        { text: 'Update', onPress: () => run('plan', 'Could not update', async () => { await refreshAssignment(a); await load(); }) },
        a.active
          ? { text: 'Stop', onPress: () => run('plan', 'Could not stop the plan', async () => { await setAssignmentActive(a.id, false); await load(); }) }
          : { text: 'Resume', onPress: () => run('plan', 'Could not resume the plan', async () => { await setAssignmentActive(a.id, true); await load(); }) },
        { text: 'Delete…', style: 'destructive', onPress: () => confirmDelete(a) },
      ],
      { cancelable: true },
    );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: student.name }} />
      <ErrorText message={error} />
      <Txt variant="h1">{student.name}</Txt>
      <Txt muted>{student.email ? `${student.email} · ` : ''}joined {new Date(student.joinedAt).toLocaleDateString()}</Txt>

      <Row style={{ marginTop: spacing.lg }}>
        <StatTile icon="calendar" label="This week" value={thisWeek} />
        <StatTile icon="flame" label="Streak" value={`${current}d`} color={c.warning} />
        <StatTile icon="time" label="Total min" value={totalMin} color={c.accent} />
      </Row>

      <SectionHeader title="Assign" />
      <Row>
        <Button title="Workout plan" icon="barbell" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/trainer/assign', params: { student: id, type: 'workout' } })} />
        <Button title="Meal plan" icon="restaurant" small variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/trainer/assign', params: { student: id, type: 'meal' } })} />
      </Row>

      <SectionHeader title="Send plans to their phone" />
      <Row>
        <Button title="Show plans as QR" icon="qr-code" small style={{ flex: 1 }} onPress={() => router.push({ pathname: '/share-qr', params: { kind: 'plan', student: id } })} />
        <Button
          title="Send as a file"
          icon="share-social"
          small
          variant="secondary"
          style={{ flex: 1 }}
          onPress={async () => {
            if (!profile) return;
            try {
              await sharePacketFile(await buildPlanPacket(profile, id));
            } catch (e) {
              Alert.alert('Could not share', e instanceof Error ? e.message : 'Try again.');
            }
          }}
        />
      </Row>
      <Txt variant="caption" muted style={{ marginTop: spacing.sm }}>
        Works with no Wi-Fi. On the same Wi-Fi you can also use Share & sync.
      </Txt>

      <SectionHeader title={`Active plans (${active.length})`} />
      {active.length === 0 ? (
        <Txt muted>Nothing assigned yet.</Txt>
      ) : (
        <Card style={{ paddingVertical: spacing.sm }}>
          {active.map((a, i) => (
            <View key={a.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                icon={a.type === 'workout' ? 'barbell' : 'restaurant'}
                iconColor={a.type === 'workout' ? c.primary : c.accent}
                title={a.title}
                subtitle={`From ${a.startDate}${a.note ? ` · ${a.note}` : ''}`}
                onPress={() => assignmentActions(a)}
                right={<Ionicons name="ellipsis-horizontal" size={18} color={c.textMuted} />}
              />
            </View>
          ))}
        </Card>
      )}
      {past.length ? (
        <>
          <SectionHeader title="Archived" />
          <Card style={{ paddingVertical: spacing.sm }}>
            {past.map((a, i) => (
              <View key={a.id}>
                {i > 0 ? <Divider /> : null}
                <ListRow icon="archive-outline" title={a.title} subtitle={a.type === 'workout' ? 'Workout plan' : 'Meal plan'} onPress={() => assignmentActions(a)} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Recent sessions" />
      {completions.length === 0 ? (
        <Txt muted>No workouts logged yet.</Txt>
      ) : (
        <Card style={{ paddingVertical: spacing.sm }}>
          {completions.slice(0, 20).map((x, i) => (
            <View key={x.id}>
              {i > 0 ? <Divider /> : null}
              <ListRow
                icon="checkmark-done"
                iconColor={c.accent}
                title={x.title}
                subtitle={`${friendlyDate(x.completedAt)} · ${formatClock(x.durationSec)} · ${x.calories} kcal`}
              />
            </View>
          ))}
        </Card>
      )}

      <SectionHeader title="Private notes" />
      <Field value={note} onChangeText={setNote} multiline placeholder="Injuries, goals, preferences (only you can see this)" />
      <Button
        title="Save note"
        small
        variant="secondary"
        style={{ alignSelf: 'flex-start' }}
        loading={busy === 'note'}
        disabled={busy !== null}
        onPress={() => run('note', 'Could not save the note', async () => { await updateStudentNote(profile.uid, id, note); Alert.alert('Saved'); })}
      />

      <Button
        title="Remove student"
        variant="ghost"
        style={{ marginTop: spacing.xl }}
        loading={busy === 'remove'}
        disabled={busy !== null}
        onPress={() =>
          Alert.alert(
            'Remove student?',
            `${student.name} will leave your team and their plans will be archived.`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove', style: 'destructive', onPress: () => run('remove', 'Could not remove', async () => { await removeStudent(profile.uid, id); router.back(); }) },
            ],
            { cancelable: true },
          )
        }
      />
    </Screen>
  );
}
