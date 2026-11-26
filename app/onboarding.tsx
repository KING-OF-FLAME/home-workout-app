import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Field, Row, Screen, Spacer, Stepper, Txt, type IconName } from '@/components/ui';
import { AppConfig } from '@/config';
import type { Goal, Level } from '@/data/types';
import { useApp, useColors } from '@/store/AppStore';
import { radius, spacing } from '@/theme';

const GOALS: { id: Goal; title: string; sub: string; icon: IconName }[] = [
  { id: 'lose_weight', title: 'Lose weight', sub: 'Burn fat with cardio and circuits', icon: 'flame' },
  { id: 'build_muscle', title: 'Build muscle', sub: 'Get stronger with bodyweight training', icon: 'barbell' },
  { id: 'get_fit', title: 'Get fit & healthy', sub: 'Feel more energetic every day', icon: 'heart' },
  { id: 'flexibility', title: 'Improve flexibility', sub: 'Move better, feel less stiff', icon: 'leaf' },
];

const LEVELS: { id: Level; title: string; sub: string }[] = [
  { id: 1, title: 'Beginner', sub: 'I am new or getting back into it' },
  { id: 2, title: 'Intermediate', sub: 'I train now and then' },
  { id: 3, title: 'Advanced', sub: 'I train regularly and want a challenge' },
];

function Option({ title, sub, icon, active, onPress }: { title: string; sub: string; icon?: IconName; active: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        padding: spacing.lg,
        borderRadius: radius.lg,
        backgroundColor: active ? c.primary + '22' : c.surface,
        borderWidth: 2,
        borderColor: active ? c.primary : c.border,
        marginBottom: spacing.md,
      }}
    >
      {icon ? <Ionicons name={icon} size={24} color={active ? c.primary : c.textDim} /> : null}
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{title}</Txt>
        <Txt variant="small" dim>
          {sub}
        </Txt>
      </View>
      {active ? <Ionicons name="checkmark-circle" size={22} color={c.primary} /> : null}
    </Pressable>
  );
}

export default function Onboarding() {
  const c = useColors();
  const router = useRouter();
  const { profile, updateProfile, settings } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [level, setLevel] = useState<Level>(profile.level);
  const [days, setDays] = useState(profile.daysPerWeek);
  const [weight, setWeight] = useState(profile.weightKg);
  const [height, setHeight] = useState(profile.heightCm);
  const imperial = settings.units === 'imperial';
  const total = 5;

  const finish = () => {
    updateProfile({ name: name.trim(), goal, level, daysPerWeek: days, weightKg: weight, heightCm: height, onboarded: true });
    router.replace('/');
  };

  const next = () => (step < total - 1 ? setStep(step + 1) : finish());

  return (
    <Screen
      edges={['top', 'bottom']}
      footer={
        <View style={{ padding: spacing.lg, gap: spacing.sm }}>
          <Button title={step === total - 1 ? 'Start training' : 'Continue'} onPress={next} disabled={step === 1 && !name.trim()} />
          {step > 0 ? <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
        </View>
      }
    >
      <Row gap={6} style={{ marginBottom: spacing.xl }}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= step ? c.primary : c.surfaceAlt }} />
        ))}
      </Row>

      {step === 0 && (
        <View style={{ paddingTop: spacing.xxl }}>
          <View style={{ width: 84, height: 84, borderRadius: 24, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="barbell" size={44} color="#fff" />
          </View>
          <Spacer size={spacing.xl} />
          <Txt variant="h1">Welcome to {AppConfig.app.name}</Txt>
          <Txt dim style={{ marginTop: spacing.sm, fontSize: 17 }}>
            {AppConfig.brand.tagline} Free workouts, no equipment, no subscriptions.
          </Txt>
          <Spacer size={spacing.xl} />
          {[
            ['flash', 'Personal plans for your goal and level'],
            ['timer', 'Guided timer with voice coaching'],
            ['trending-up', 'Track streaks, calories and weight'],
            ['people', 'Train with your coach: plans and meals in one app'],
          ].map(([icon, text]) => (
            <Row key={text} style={{ marginBottom: spacing.md }} gap={spacing.md}>
              <Ionicons name={icon as IconName} size={20} color={c.accent} />
              <Txt style={{ flex: 1 }}>{text}</Txt>
            </Row>
          ))}
        </View>
      )}

      {step === 1 && (
        <View>
          <Txt variant="h1">What should we call you?</Txt>
          <Spacer />
          <Field placeholder="Your first name" value={name} onChangeText={setName} autoFocus maxLength={30} />
        </View>
      )}

      {step === 2 && (
        <View>
          <Txt variant="h1">What is your main goal?</Txt>
          <Spacer />
          {GOALS.map((g) => (
            <Option key={g.id} title={g.title} sub={g.sub} icon={g.icon} active={goal === g.id} onPress={() => setGoal(g.id)} />
          ))}
        </View>
      )}

      {step === 3 && (
        <View>
          <Txt variant="h1">Your fitness level</Txt>
          <Spacer />
          {LEVELS.map((l) => (
            <Option key={l.id} title={l.title} sub={l.sub} active={level === l.id} onPress={() => setLevel(l.id)} />
          ))}
          <Spacer size={spacing.md} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Workouts per week</Txt>
            <Stepper value={days} min={1} max={7} onChange={setDays} />
          </Row>
        </View>
      )}

      {step === 4 && (
        <View>
          <Txt variant="h1">About your body</Txt>
          <Txt dim style={{ marginTop: 6 }}>
            Used only on this phone to estimate calories and BMI.
          </Txt>
          <Spacer />
          <Row style={{ justifyContent: 'space-between', marginBottom: spacing.lg }}>
            <Txt variant="h3">Weight</Txt>
            {imperial ? (
              <Stepper value={Math.round(weight * 2.2046)} min={66} max={660} onChange={(lb) => setWeight(Math.round((lb / 2.2046) * 10) / 10)} suffix="lb" />
            ) : (
              <Stepper value={Math.round(weight)} min={30} max={300} onChange={setWeight} suffix="kg" />
            )}
          </Row>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="h3">Height</Txt>
            {imperial ? (
              <Stepper value={Math.round(height / 2.54)} min={39} max={98} onChange={(inch) => setHeight(Math.round(inch * 2.54))} suffix="in" />
            ) : (
              <Stepper value={height} min={100} max={250} onChange={setHeight} suffix="cm" />
            )}
          </Row>
        </View>
      )}
    </Screen>
  );
}
