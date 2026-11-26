import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { Button, ErrorText, Field, Screen, Spacer, Txt } from '@/components/ui';
import { friendlyAuthError, useAuth } from '@/store/AuthStore';
import { spacing } from '@/theme';

export default function SignIn() {
  const router = useRouter();
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      router.back();
    } catch (e) {
      setError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError('Enter your email first, then tap "Forgot password".');
    try {
      await resetPassword(email);
      Alert.alert('Check your email', 'We sent you a link to reset your password.');
    } catch (e) {
      setError(friendlyAuthError(e));
    }
  };

  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'Sign in' }} />
      <Txt variant="h1">Welcome back</Txt>
      <Txt dim style={{ marginTop: 6 }}>Sign in to sync with your coach or your students.</Txt>
      <Spacer size={spacing.xl} />
      <ErrorText message={error} />
      <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
      <Button title="Forgot password?" variant="ghost" onPress={forgot} style={{ marginTop: spacing.sm }} />
      <Button title="New here? Create an account" variant="ghost" onPress={() => router.replace('/auth/sign-up')} />
    </Screen>
  );
}
