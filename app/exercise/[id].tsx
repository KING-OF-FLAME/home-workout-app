import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { DemoStyleSwitch, ExerciseAnimation, hasDemo } from '@/components/ExerciseAnimation';
import { groupLabel } from '@/components/ExerciseThumb';
import { MuscleMap, MusclePills } from '@/components/MuscleMap';
import { ResultsTimeline } from '@/components/ResultsTimeline';
import { Button, Card, Chip, EmptyState, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { getExercise } from '@/data/exercises';
import { BODY_BENEFIT, BODY_LABEL, breathingFor, muscleInfo, timelineFor } from '@/data/muscles';
import { EQUIPMENT_LABEL } from '@/lib/workout';
import { useApp, useColors } from '@/store/AppStore';
import { muscleColors, spacing } from '@/theme';

const LEVEL = ['', 'Beginner', 'Intermediate', 'Advanced'];

export default function ExerciseDetail() {
  const c = useColors();
  const { settings } = useApp();
  const { width } = useWindowDimensions();
  const { id, fromPlayer } = useLocalSearchParams<{ id: string; fromPlayer?: string }>();
  const [playing, setPlaying] = useState(true);
  const [slow, setSlow] = useState(false);
  // Stop reading the steps aloud when leaving the screen.
  useEffect(() => () => { Speech.stop(); }, []);
  const ex = getExercise(id);
  if (!ex) return <EmptyState icon="alert-circle" title="Exercise not found" />;
  const info = muscleInfo(ex);
  const map = [...info.primary.map((slug) => ({ slug, intensity: 3 })), ...info.secondary.map((slug) => ({ slug, intensity: 1 }))];
  const breathing = breathingFor(ex);

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: ex.name }} />
      <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
        <ExerciseAnimation exercise={ex} width={width - spacing.lg * 2} playing={playing} speed={slow ? 0.45 : 1} />
      </View>
      <Row style={{ justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Chip icon={playing ? 'pause' : 'play'} label={playing ? 'Pause' : 'Play'} onPress={() => setPlaying((p) => !p)} />
        <Chip icon="speedometer-outline" label="Slow motion" active={slow} onPress={() => setSlow((s) => !s)} />
      </Row>
      <DemoStyleSwitch exerciseId={ex.id} />

      <Txt variant="h1" center style={{ marginTop: spacing.md }}>
        {ex.name}
      </Txt>
      <Row style={{ justifyContent: 'center', marginTop: spacing.sm, flexWrap: 'wrap' }}>
        <Txt variant="small" color={muscleColors[ex.group]} style={{ fontWeight: '700' }}>
          {groupLabel(ex.group)}
        </Txt>
        <Txt variant="small" muted>
          · {LEVEL[ex.level]} · {EQUIPMENT_LABEL[ex.equipment]}
        </Txt>
      </Row>

      <Row style={{ marginTop: spacing.lg }}>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{ex.mode === 'time' ? `${ex.defaultSeconds}s` : ex.defaultReps}</Txt>
          <Txt variant="caption" muted>
            {ex.mode === 'time' ? 'Hold / time' : 'Reps'}
            {ex.perSide ? ' each side' : ''}
          </Txt>
        </Card>
        <Card style={{ flex: 1, alignItems: 'center' }}>
          <Txt variant="h2">{Math.round(ex.met * 3.5 * 70 / 200 * 10) / 10}</Txt>
          <Txt variant="caption" muted>
            kcal / min (70 kg)
          </Txt>
        </Card>
      </Row>

      <SectionHeader title="How to do it" />
      {ex.steps.map((s, i) => (
        <Row key={i} style={{ alignItems: 'flex-start', marginBottom: spacing.md }} gap={spacing.md}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Txt variant="small" color="#fff" style={{ fontWeight: '800' }}>
              {i + 1}
            </Txt>
          </View>
          <Txt style={{ flex: 1 }}>{s}</Txt>
        </Row>
      ))}

      <Card tint={c.surfaceAlt} style={{ marginTop: spacing.sm }}>
        <Row gap={spacing.sm}>
          <Ionicons name="cloud-outline" size={18} color={c.accent} />
          <Txt variant="label" color={c.accent}>
            Breathing
          </Txt>
        </Row>
        <Txt dim style={{ marginTop: 4 }}>
          {breathing}
        </Txt>
      </Card>

      {info.mistakes.length ? (
        <>
          <SectionHeader title="Common mistakes" />
          {info.mistakes.map((mk) => (
            <Row key={mk} style={{ alignItems: 'flex-start', marginBottom: spacing.sm }} gap={spacing.sm}>
              <Ionicons name="close-circle" size={20} color={c.danger} />
              <Txt dim style={{ flex: 1 }}>
                {mk}
              </Txt>
            </Row>
          ))}
        </>
      ) : null}

      {ex.tip ? (
        <Card tint={c.surfaceAlt} style={{ marginTop: spacing.md }}>
          <Row gap={spacing.sm}>
            <Ionicons name="bulb" size={18} color={c.warning} />
            <Txt variant="label" color={c.warning}>
              Coach tip
            </Txt>
          </Row>
          <Txt dim style={{ marginTop: 4 }}>
            {ex.tip}
          </Txt>
        </Card>
      ) : null}

      <SectionHeader title="Muscles worked" />
      <Card>
        <MuscleMap data={map} />
        <View style={{ marginTop: spacing.md }}>
          <MusclePills data={map} />
        </View>
      </Card>

      <SectionHeader title="What it improves" />
      {info.primary.map((slug) => (
        <Row key={slug} style={{ alignItems: 'flex-start', marginBottom: spacing.sm }} gap={spacing.sm}>
          <Ionicons name="checkmark-circle" size={20} color={c.accent} />
          <Txt style={{ flex: 1 }}>
            <Txt style={{ fontWeight: '700' }}>{BODY_LABEL[slug]}: </Txt>
            <Txt dim>{BODY_BENEFIT[slug]}</Txt>
          </Txt>
        </Row>
      ))}

      <SectionHeader title="What to expect" />
      <Card>
        <ResultsTimeline items={timelineFor(ex.group)} />
      </Card>

      <Button
        title="Read instructions aloud"
        icon="volume-high"
        variant="secondary"
        style={{ marginTop: spacing.lg }}
        onPress={() => {
          Speech.stop();
          Speech.speak(`${ex.name}. ${ex.steps.join(' ')} ${breathing} ${ex.tip ?? ''}`);
        }}
      />
      {hasDemo(ex.id) && settings.demoStyle === 'photo' ? (
        <Txt variant="caption" muted center style={{ marginTop: spacing.md }}>
          Demo photos: Free Exercise DB (public domain)
        </Txt>
      ) : null}
      <BannerAdSlot placement="exerciseDetail" hidden={fromPlayer === '1'} />
    </Screen>
  );
}
