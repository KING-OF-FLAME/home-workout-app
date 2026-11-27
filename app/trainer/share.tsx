import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Share, View } from 'react-native';
import { Button, Card, ErrorText, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { AppConfig } from '@/config';
import { startHosting, type HostEvent, type HostHandle } from '@/services/nearbySync';
import { useColors } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

const ask = (name: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert('New student', `${name} wants to join your team.`, [
      { text: 'Decline', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Accept', onPress: () => resolve(true) },
    ], { cancelable: false }),
  );

/**
 * The trainer's phone becomes the host. Students on the same Wi-Fi or on this
 * phone's hotspot enter the code to join, and tap "Sync now" later to get new
 * plans and send their progress. No server and no internet needed.
 */
export default function ShareWithStudents() {
  useKeepAwake();
  const c = useColors();
  const { profile } = useAuth();
  const [host, setHost] = useState<HostHandle | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<HostEvent[]>([]);
  const hostRef = useRef<HostHandle | null>(null);

  const start = async () => {
    if (!profile) return;
    setStarting(true);
    setError(null);
    try {
      const h = await startHosting({ trainer: profile, approveJoin: ask, onEvent: (e) => setLog((l) => [e, ...l].slice(0, 30)) });
      hostRef.current = h;
      setHost(h);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start sharing.');
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    hostRef.current?.stop();
    hostRef.current = null;
    setHost(null);
  };

  // Start right away; stop when the trainer leaves this screen.
  useEffect(() => {
    start();
    return () => hostRef.current?.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid]);

  if (!profile) return <Loading />;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Share with students' }} />
      <Card tint={host ? c.primary : c.surface}>
        <Row>
          <Ionicons name={host ? 'radio' : 'radio-outline'} size={22} color={host ? '#fff' : c.textDim} />
          <Txt variant="label" color={host ? '#ffffffcc' : c.textMuted}>
            {host ? 'Sharing is on' : starting ? 'Starting…' : 'Sharing is off'}
          </Txt>
        </Row>
        {host ? (
          <>
            <Txt color="#ffffffcc" style={{ marginTop: spacing.md }}>
              Your code
            </Txt>
            <Txt style={{ fontSize: 38, lineHeight: 46, fontWeight: '900', letterSpacing: 3, color: '#fff', marginTop: 4 }}>
              {host.code}
            </Txt>
            <Txt variant="small" color="#ffffffcc" style={{ marginTop: spacing.sm }}>
              Keep this screen open while students join or sync.
            </Txt>
            <Row style={{ marginTop: spacing.md }}>
              <Button
                title="Share code"
                icon="share-social"
                variant="secondary"
                small
                onPress={() =>
                  Share.share({
                    message: `Join my training team on ${AppConfig.app.name}: open the Coach tab, tap "Join your coach" and enter ${host.code}. Your phone must be on the same Wi-Fi as mine or on my hotspot.`,
                  }).catch(() => undefined)
                }
              />
              <Button title="Stop" variant="ghost" small onPress={stop} />
            </Row>
          </>
        ) : (
          <>
            <ErrorText message={error} />
            <Button title="Start sharing" icon="radio" style={{ marginTop: spacing.md }} loading={starting} onPress={start} />
          </>
        )}
      </Card>

      <SectionHeader title="How it works" />
      <Card>
        {[
          ['wifi', 'Both phones on the same Wi-Fi, or the student joins your phone’s hotspot. No internet needed.'],
          ['keypad', 'New student: Coach tab → Join your coach → enter the code. You tap Accept here.'],
          ['sync', 'Every week (or when you ask), turn sharing on and the student taps Sync now: they get your latest plans, you get their finished workouts.'],
          ['person-remove', 'Remove a student from their page. Their plans disappear from their phone on the next sync.'],
        ].map(([icon, text]) => (
          <Row key={text} style={{ alignItems: 'flex-start', marginBottom: spacing.md }} gap={spacing.md}>
            <Ionicons name={icon as 'wifi'} size={20} color={c.accent} />
            <Txt dim style={{ flex: 1 }}>
              {text}
            </Txt>
          </Row>
        ))}
        <Txt variant="caption" muted>
          The code changes each time you start sharing, so an old code cannot be reused by someone else.
        </Txt>
      </Card>

      {log.length ? (
        <>
          <SectionHeader title="Activity" />
          <Card>
            {log.map((e, i) => (
              <Row key={i} style={{ marginBottom: spacing.sm, alignItems: 'flex-start' }} gap={spacing.sm}>
                <View style={{ width: 8, height: 8, borderRadius: radius.pill, marginTop: 6, backgroundColor: e.ok ? c.success : c.danger }} />
                <Txt variant="small" style={{ flex: 1 }}>
                  {e.text}
                </Txt>
                <Txt variant="caption" muted>
                  {new Date(e.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Txt>
              </Row>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
