import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Button, Card, Chip, Row, Screen, StatTile, Txt } from '@/components/ui';
import { AppConfig } from '@/config';
import { formatClock } from '@/lib/workout';
import { useApp, useColors, type Session } from '@/store/AppStore';
import { spacing } from '@/theme';

export default function Complete() {
  const c = useColors();
  const router = useRouter();
  const { session: sessionId, partial } = useLocalSearchParams<{ session: string; partial?: string }>();
  const { history, stats, setSessionFeeling, adjustProgramIntensity } = useApp();
  const session = history.find((h) => h.id === sessionId);
  const [feeling, setFeeling] = useState<Session['feeling']>(session?.feeling);

  const rate = (f: NonNullable<Session['feeling']>) => {
    if (!session || feeling) return;
    setFeeling(f);
    setSessionFeeling(session.id, f);
    if (session.kind === 'program') adjustProgramIntensity(session.refId, f);
  };

  const share = () =>
    Share.share({
      message: `I just finished "${session?.title}" in ${formatClock(session?.durationSec ?? 0)} with ${AppConfig.app.name}! 🔥 ${stats.currentStreak}-day streak.`,
    }).catch(() => undefined);

  return (
    <Screen edges={['top', 'bottom']} footer={
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Button title="Done" onPress={() => router.replace('/')} />
        <Button title="Share" icon="share-social" variant="secondary" onPress={share} />
      </View>
    }>
      <View style={{ alignItems: 'center', paddingTop: spacing.xl }}>
        <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: c.accent + '33', alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={partial ? 'checkmark' : 'trophy'} size={48} color={c.accent} />
        </View>
        <Txt variant="h1" center style={{ marginTop: spacing.lg }}>
          {partial ? 'Nice effort!' : 'Workout complete!'}
        </Txt>
        <Txt dim center style={{ marginTop: 6 }}>{session?.title}</Txt>
      </View>

      <Row style={{ marginTop: spacing.xl }}>
        <StatTile icon="time" label="Duration" value={formatClock(session?.durationSec ?? 0)} />
        <StatTile icon="flame" label="kcal (est.)" value={session?.calories ?? 0} color={c.warning} />
      </Row>
      <Row style={{ marginTop: spacing.sm }}>
        <StatTile icon="barbell" label="Exercises" value={session?.exercisesDone ?? 0} color={c.accent} />
        <StatTile icon="flash" label="Day streak" value={stats.currentStreak} color="#B07CFF" />
      </Row>

      {session && !partial ? (
        <Card style={{ marginTop: spacing.lg }}>
          <Txt variant="h3">How did that feel?</Txt>
          <Txt variant="small" muted style={{ marginTop: 4 }}>
            {session.kind === 'program' ? 'We adjust your next workouts to match.' : 'This helps you track your effort.'}
          </Txt>
          <Row style={{ marginTop: spacing.md }}>
            <Chip label="Too easy" icon="happy" active={feeling === 'easy'} onPress={() => rate('easy')} />
            <Chip label="Just right" icon="thumbs-up" active={feeling === 'ok'} onPress={() => rate('ok')} />
            <Chip label="Too hard" icon="sad" active={feeling === 'hard'} onPress={() => rate('hard')} />
          </Row>
          {feeling && session.kind === 'program' && feeling !== 'ok' ? (
            <Txt variant="small" color={c.accent} style={{ marginTop: spacing.sm }}>
              Got it. Your next sessions will be {feeling === 'easy' ? 'a bit harder' : 'a bit easier'}.
            </Txt>
          ) : null}
        </Card>
      ) : null}

      <BannerAdSlot placement="workoutComplete" />
    </Screen>
  );
}
