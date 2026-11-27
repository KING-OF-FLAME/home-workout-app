import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button, Card, ErrorText, Loading, Row, Screen, Txt } from '@/components/ui';
import { buildPlanPacket, buildProgressPacket, sharePacketFile, type Packet } from '@/services/offlineShare';
import { encodePacket, toQrParts } from '@/services/packetCodec';
import { useColors } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

/** How long each QR part stays on screen when there are several. */
const PART_MS = 1300;

/**
 * Shows plans (trainer → student) or progress (student → trainer) as QR codes.
 * Big packets are split into a few codes that change by themselves; the other
 * phone keeps its camera on them until every part is in. No network needed.
 *
 * Params: kind=plan&student=<id>  or  kind=progress
 */
export default function ShareQr() {
  useKeepAwake();
  const c = useColors();
  const { profile } = useAuth();
  const { kind, student } = useLocalSearchParams<{ kind: 'plan' | 'progress'; student?: string }>();
  const [packet, setPacket] = useState<Packet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [part, setPart] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (kind === 'plan' && student ? buildPlanPacket(profile, student) : buildProgressPacket(profile))
      .then(setPacket)
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not prepare the code.'));
  }, [profile, kind, student]);

  const parts = useMemo(() => (packet ? toQrParts(encodePacket(packet)) : []), [packet]);

  useEffect(() => {
    if (parts.length < 2 || paused) return;
    const t = setInterval(() => setPart((p) => (p + 1) % parts.length), PART_MS);
    return () => clearInterval(t);
  }, [parts.length, paused]);

  const sendFile = async () => {
    if (!packet) return;
    try {
      await sharePacketFile(packet);
    } catch (e) {
      Alert.alert('Could not share', e instanceof Error ? e.message : 'Try again.');
    }
  };

  const title = kind === 'plan' ? 'Send plans' : 'Send my progress';
  if (!packet && !error) return <Loading />;

  const plans = packet?.fithome === 'plan' ? packet.assignments.filter((a) => a.active).length : 0;
  const workouts = packet?.fithome === 'progress' ? packet.completions.length : 0;

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title }} />
      <ErrorText message={error} />
      {packet ? (
        <>
          <Txt dim>
            {packet.fithome === 'plan'
              ? `${plans} plan${plans === 1 ? '' : 's'} for ${packet.student.name}. On their phone: Coach tab, then "Scan trainer's QR".`
              : `${workouts} finished workout${workouts === 1 ? '' : 's'}. On your trainer's phone: Coach tab, then "Scan a student's QR".`}
          </Txt>
          <View style={{ alignItems: 'center', marginTop: spacing.lg }}>
            <View style={{ backgroundColor: '#FFFFFF', padding: spacing.lg, borderRadius: radius.lg }}>
              <QRCode value={parts[part] ?? ''} size={280} ecl="M" backgroundColor="#FFFFFF" color="#000000" />
            </View>
            {parts.length > 1 ? (
              <Row style={{ marginTop: spacing.md, gap: 6 }}>
                {parts.map((_, i) => (
                  <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === part ? c.primary : c.border }} />
                ))}
              </Row>
            ) : null}
            <Txt variant="small" muted center style={{ marginTop: spacing.sm }}>
              {parts.length > 1
                ? `Code ${part + 1} of ${parts.length}. The codes change by themselves; keep the other phone's camera on them.`
                : 'Hold the other phone about 20 cm away.'}
            </Txt>
            {parts.length > 1 ? (
              <Button title={paused ? 'Play' : 'Pause'} icon={paused ? 'play' : 'pause'} small variant="secondary" onPress={() => setPaused((v) => !v)} style={{ marginTop: spacing.sm }} />
            ) : null}
          </View>
          <Card style={{ marginTop: spacing.xl }}>
            <Row>
              <Ionicons name="document-attach" size={22} color={c.accent} />
              <View style={{ flex: 1 }}>
                <Txt variant="h3">Not in the same place?</Txt>
                <Txt variant="small" muted>Send it as a file on WhatsApp, email or any app. They open it in FitHome.</Txt>
              </View>
            </Row>
            <Button title="Send as a file" icon="share-social" onPress={sendFile} style={{ marginTop: spacing.md }} />
          </Card>
        </>
      ) : null}
    </Screen>
  );
}
