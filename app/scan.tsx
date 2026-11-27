import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Card, Loading, Row, Screen, Txt } from '@/components/ui';
import { applyPacket, importFromFile } from '@/lib/offlineImport';
import { readPacket } from '@/services/offlineShare';
import { QrCollector } from '@/services/packetCodec';
import { useColors } from '@/store/AppStore';
import { useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

/**
 * Scans FitHome QR codes from the other phone's screen. A student scans the
 * trainer's plans; a trainer scans a student's progress. Big packets come in a
 * few parts that the other screen cycles through, collected here.
 */
export default function Scan() {
  const c = useColors();
  const router = useRouter();
  const { profile, refresh } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const collector = useRef(new QrCollector());
  const [progress, setProgress] = useState({ have: 0, total: 0 });
  const [working, setWorking] = useState(false);
  const busy = useRef(false);
  const lastBad = useRef(0);

  const finish = async (text: string) => {
    if (!profile) return;
    setWorking(true);
    try {
      const r = await applyPacket(profile, readPacket(text));
      await refresh();
      Alert.alert(r.title, r.message, [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      Alert.alert('Could not add it', e instanceof Error ? e.message : 'Try again.', [
        { text: 'OK', onPress: () => { collector.current = new QrCollector(); setProgress({ have: 0, total: 0 }); busy.current = false; setWorking(false); } },
      ]);
    }
  };

  const onScan = ({ data }: { data: string }) => {
    if (busy.current) return;
    try {
      const full = collector.current.add(data);
      setProgress({ have: collector.current.have, total: collector.current.total });
      if (full) {
        busy.current = true;
        finish(full);
      }
    } catch (e) {
      // Ignore other QR codes in view, but say so now and then.
      if (Date.now() - lastBad.current > 4000) {
        lastBad.current = Date.now();
        Alert.alert('Not a FitHome code', e instanceof Error ? e.message : '');
      }
    }
  };

  const title = profile?.role === 'trainer' ? "Scan a student's QR" : "Scan trainer's QR";
  if (!profile || !permission) return <Loading />;

  if (!permission.granted) {
    return (
      <Screen>
        <Stack.Screen options={{ title }} />
        <Card style={{ marginTop: spacing.lg }}>
          <Ionicons name="camera" size={32} color={c.primary} />
          <Txt variant="h2" style={{ marginTop: spacing.sm }}>Camera needed</Txt>
          <Txt dim style={{ marginTop: 6, marginBottom: spacing.lg }}>
            The camera reads the code on the other phone. Nothing is recorded or sent anywhere.
          </Txt>
          <Button title="Allow camera" icon="camera" onPress={requestPermission} />
          <Button title="Open a file instead" variant="secondary" style={{ marginTop: spacing.sm }} onPress={async () => { if (await importFromFile(profile)) { await refresh(); router.back(); } }} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen>
      <Stack.Screen options={{ title }} />
      <View style={{ borderRadius: radius.lg, overflow: 'hidden', aspectRatio: 1, backgroundColor: '#000' }}>
        {working ? null : (
          <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScan} />
        )}
      </View>
      <Card style={{ marginTop: spacing.lg }}>
        <Row>
          <Ionicons name={progress.total && progress.have === progress.total ? 'checkmark-circle' : 'qr-code'} size={22} color={c.primary} />
          <View style={{ flex: 1 }}>
            <Txt variant="h3">
              {progress.total > 1 ? `Got ${progress.have} of ${progress.total} codes` : working ? 'Adding…' : 'Point the camera at the code'}
            </Txt>
            <Txt variant="small" muted>
              {profile.role === 'trainer'
                ? 'On the student’s phone: Coach tab, then "Show my QR".'
                : 'On your trainer’s phone: open your name, then "Show plans as QR".'}
            </Txt>
          </View>
        </Row>
      </Card>
    </Screen>
  );
}
