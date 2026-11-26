import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Linking, Switch, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { Card, Chip, Divider, Field, ListRow, Row, Screen, SectionHeader, Stepper, Txt, Button } from '@/components/ui';
import { AppConfig } from '@/config';
import type { Goal, Level } from '@/data/types';
import { privacyOptionsRequired, showPrivacyOptions } from '@/lib/ads';
import { cancelReminders, scheduleDailyReminder } from '@/lib/notifications';
import { useApp, useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { spacing } from '@/theme';

const GOALS: { id: Goal; label: string }[] = [
  { id: 'lose_weight', label: 'Lose weight' },
  { id: 'build_muscle', label: 'Build muscle' },
  { id: 'get_fit', label: 'Get fit' },
  { id: 'flexibility', label: 'Flexibility' },
];

function SwitchRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  const c = useColors();
  return (
    <ListRow
      title={title}
      subtitle={subtitle}
      right={<Switch value={value} onValueChange={onChange} trackColor={{ true: c.primary, false: c.surfaceAlt }} thumbColor="#fff" />}
    />
  );
}

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const { profile, settings, updateProfile, updateSettings, resetAllData } = useApp();
  const auth = useAuth();
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [deletePw, setDeletePw] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  useEffect(() => {
    privacyOptionsRequired().then(setShowPrivacy);
  }, []);

  const pad = (n: number) => String(n).padStart(2, '0');

  const toggleReminder = async (on: boolean) => {
    if (on) {
      const ok = await scheduleDailyReminder(settings.reminderHour, settings.reminderMinute);
      if (!ok) {
        Alert.alert('Notifications are off', 'Allow notifications for this app in your phone settings to get reminders.');
        return;
      }
    } else {
      await cancelReminders();
    }
    updateSettings({ reminderEnabled: on });
  };

  const setReminderTime = async (hour: number, minute: number) => {
    updateSettings({ reminderHour: hour, reminderMinute: minute });
    if (settings.reminderEnabled) await scheduleDailyReminder(hour, minute);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await auth.deleteAccount(deletePw);
      setShowDelete(false);
      Alert.alert('Account deleted', 'Your account and cloud data were removed.');
    } catch (e) {
      Alert.alert('Could not delete account', friendlyAuthError(e));
    } finally {
      setDeleting(false);
      setDeletePw('');
    }
  };

  return (
    <Screen>
      <Txt variant="h1">Profile</Txt>

      <SectionHeader title="Account" />
      <Card>
        {!auth.enabled ? (
          <Txt dim>You are using the app offline. Everything is saved on this phone.</Txt>
        ) : auth.user ? (
          <>
            <ListRow
              icon="person"
              title={auth.profile?.displayName ?? auth.user.email ?? 'Signed in'}
              subtitle={auth.profile ? `${auth.profile.email} · ${auth.profile.role === 'trainer' ? 'Trainer' : 'Member'}` : 'Account details could not load. Check your connection.'}
            />
            <Divider />
            <ListRow icon="log-out-outline" title="Sign out" onPress={() => auth.signOut()} />
          </>
        ) : (
          <>
            <Txt dim style={{ marginBottom: spacing.md }}>
              Sign in to train with a coach or to coach your own students. Workouts work without an account.
            </Txt>
            <Row>
              <Button title="Sign in" small onPress={() => router.push('/auth/sign-in')} style={{ flex: 1 }} />
              <Button title="Create account" small variant="secondary" onPress={() => router.push('/auth/sign-up')} style={{ flex: 1 }} />
            </Row>
          </>
        )}
      </Card>

      <SectionHeader title="About you" />
      <Card>
        <Field label="Name" value={profile.name} onChangeText={(name) => updateProfile({ name })} maxLength={30} />
        <Txt variant="label" muted style={{ marginBottom: 6 }}>
          Goal
        </Txt>
        <Row style={{ flexWrap: 'wrap', marginBottom: spacing.md }}>
          {GOALS.map((g) => (
            <Chip key={g.id} label={g.label} active={profile.goal === g.id} onPress={() => updateProfile({ goal: g.id })} />
          ))}
        </Row>
        <Txt variant="label" muted style={{ marginBottom: 6 }}>
          Level
        </Txt>
        <Row style={{ marginBottom: spacing.md }}>
          {(['Beginner', 'Intermediate', 'Advanced'] as const).map((l, i) => (
            <Chip key={l} label={l} active={profile.level === i + 1} onPress={() => updateProfile({ level: (i + 1) as Level })} />
          ))}
        </Row>
        <Row style={{ justifyContent: 'space-between', marginBottom: spacing.sm }}>
          <Txt>Workouts per week</Txt>
          <Stepper value={profile.daysPerWeek} min={1} max={7} onChange={(daysPerWeek) => updateProfile({ daysPerWeek })} />
        </Row>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt>Height</Txt>
          <Stepper value={profile.heightCm} min={100} max={250} onChange={(heightCm) => updateProfile({ heightCm })} suffix="cm" />
        </Row>
      </Card>

      <SectionHeader title="Workout" />
      <Card>
        <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.sm }}>
          <Txt>Default rest</Txt>
          <Stepper value={settings.restSeconds} min={5} max={180} step={5} onChange={(restSeconds) => updateSettings({ restSeconds })} suffix="s" />
        </Row>
        <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.sm }}>
          <Txt>Get-ready countdown</Txt>
          <Stepper value={settings.getReadySeconds} min={0} max={30} step={5} onChange={(getReadySeconds) => updateSettings({ getReadySeconds })} suffix="s" />
        </Row>
        <Divider />
        <SwitchRow title="Voice coach" subtitle="Announces exercises and countdowns" value={settings.voice} onChange={(voice) => updateSettings({ voice })} />
        <SwitchRow title="Vibration" value={settings.haptics} onChange={(haptics) => updateSettings({ haptics })} />
      </Card>

      {AppConfig.features.reminders ? (
        <>
          <SectionHeader title="Reminder" />
          <Card>
            <SwitchRow title="Daily workout reminder" value={settings.reminderEnabled} onChange={toggleReminder} />
            <Row style={{ justifyContent: 'space-between', paddingTop: spacing.sm }}>
              <Txt>Time</Txt>
              <Row>
                <Stepper value={settings.reminderHour} min={0} max={23} onChange={(h) => setReminderTime(h, settings.reminderMinute)} />
                <Txt>:</Txt>
                <Stepper value={settings.reminderMinute} min={0} max={55} step={5} onChange={(m) => setReminderTime(settings.reminderHour, m)} />
              </Row>
            </Row>
            <Txt variant="caption" muted style={{ marginTop: 6 }}>
              Reminder at {pad(settings.reminderHour)}:{pad(settings.reminderMinute)} every day
            </Txt>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Appearance" />
      <Card>
        <Txt variant="label" muted style={{ marginBottom: 6 }}>
          Theme
        </Txt>
        <Row style={{ marginBottom: spacing.md }}>
          {(['dark', 'light', 'system'] as const).map((t) => (
            <Chip key={t} label={t[0].toUpperCase() + t.slice(1)} active={settings.theme === t} onPress={() => updateSettings({ theme: t })} />
          ))}
        </Row>
        <Txt variant="label" muted style={{ marginBottom: 6 }}>
          Units
        </Txt>
        <Row>
          <Chip label="Metric (kg)" active={settings.units === 'metric'} onPress={() => updateSettings({ units: 'metric' })} />
          <Chip label="Imperial (lb)" active={settings.units === 'imperial'} onPress={() => updateSettings({ units: 'imperial' })} />
        </Row>
      </Card>

      <SectionHeader title="About" />
      <Card style={{ paddingVertical: spacing.sm }}>
        {showPrivacy ? <ListRow icon="shield-checkmark-outline" title="Ad privacy options" onPress={() => showPrivacyOptions()} /> : null}
        <ListRow icon="document-text-outline" title="Privacy policy" onPress={() => Linking.openURL(AppConfig.brand.privacyPolicyUrl)} />
        <ListRow icon="reader-outline" title="Terms of use" onPress={() => Linking.openURL(AppConfig.brand.termsUrl)} />
        <ListRow icon="mail-outline" title="Contact support" subtitle={AppConfig.brand.supportEmail} onPress={() => Linking.openURL(`mailto:${AppConfig.brand.supportEmail}`)} />
        <ListRow
          icon="refresh-outline"
          title="Reset data on this phone"
          danger
          onPress={() =>
            Alert.alert('Reset all data?', 'Your history, custom workouts and settings on this phone will be deleted.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Reset', style: 'destructive', onPress: () => resetAllData() },
            ])
          }
        />
        {auth.user ? <ListRow icon="trash-outline" title="Delete my account" danger onPress={() => setShowDelete((v) => !v)} /> : null}
        {showDelete ? (
          <View style={{ paddingVertical: spacing.sm }}>
            <Txt variant="small" dim style={{ marginBottom: spacing.sm }}>
              This permanently deletes your account and cloud data (plans, students, progress). Enter your password to confirm.
            </Txt>
            <Field placeholder="Password" secureTextEntry value={deletePw} onChangeText={setDeletePw} />
            <Button title="Delete account permanently" variant="danger" loading={deleting} disabled={!deletePw} onPress={deleteAccount} />
          </View>
        ) : null}
      </Card>

      <BannerAdSlot placement="settings" />

      <Txt variant="caption" muted center style={{ marginTop: spacing.xl }}>
        {AppConfig.app.name} v{Constants.expoConfig?.version ?? AppConfig.app.version}
      </Txt>
      <Txt variant="caption" muted center style={{ marginTop: 4, color: c.textMuted }}>
        Not medical advice. Check with a doctor before starting a new exercise program.
      </Txt>
    </Screen>
  );
}
