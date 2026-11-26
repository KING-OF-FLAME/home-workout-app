import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import { Button, ErrorText, Field, Row, Screen, Spacer, Txt } from '@/components/ui';
import { AppConfig } from '@/config';
import type { Role } from '@/services/cloud';
import { useApp, useColors } from '@/store/AppStore';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { radius, spacing } from '@/theme';

export default function SignUp() {
  const c = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { profile } = useApp();
  const { signUp } = useAuth();
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>(params.role === 'trainer' && AppConfig.features.allowTrainerSignup ? 'trainer' : 'member');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signUp(name, email, password, role);
      router.back();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const RoleCard = ({ id, title, sub, icon }: { id: Role; title: string; sub: string; icon: React.ComponentProps<typeof Ionicons>['name'] }) => (
    <Pressable
      onPress={() => setRole(id)}
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: role === id ? c.primary : c.border,
        backgroundColor: role === id ? c.primary + '1f' : c.surface,
      }}
    >
      <Ionicons name={icon} size={22} color={role === id ? c.primary : c.textDim} />
      <Txt variant="h3" style={{ marginTop: 6 }}>{title}</Txt>
      <Txt variant="caption" muted>{sub}</Txt>
    </Pressable>
  );

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Create account' }} />
      <Txt variant="h1">Create your account</Txt>
      <Spacer />
      {AppConfig.features.allowTrainerSignup ? (
        <Row style={{ marginBottom: spacing.lg, alignItems: 'stretch' }}>
          <RoleCard id="member" title="I train" sub="Follow plans, join a coach" icon="fitness" />
          <RoleCard id="trainer" title="I coach" sub="Add students, assign plans and meals" icon="people" />
        </Row>
      ) : null}
      <ErrorText message={error} />
      <Field label="Name" value={name} onChangeText={setName} autoComplete="name" />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password (6+ characters)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" />
      <Button title="Create account" onPress={submit} loading={busy} disabled={!name.trim() || !email || password.length < 6} />
      <View style={{ marginTop: spacing.lg }}>
        <Txt variant="caption" muted center>
          By creating an account you agree to our Terms and Privacy policy.
        </Txt>
        <Row style={{ justifyContent: 'center' }}>
          <Button title="Terms" variant="ghost" small onPress={() => Linking.openURL(AppConfig.brand.termsUrl)} />
          <Button title="Privacy policy" variant="ghost" small onPress={() => Linking.openURL(AppConfig.brand.privacyPolicyUrl)} />
        </Row>
      </View>
      <Button title="Already have an account? Sign in" variant="ghost" onPress={() => router.replace('/auth/sign-in')} />
    </Screen>
  );
}
