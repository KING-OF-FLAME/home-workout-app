import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initAds } from '@/lib/ads';
import { AppStoreProvider, useApp } from '@/store/AppStore';
import { AuthProvider } from '@/store/AuthStore';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function RootNavigator() {
  const { ready, profile, colors } = useApp();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync().catch(() => undefined);
    initAds().catch(() => undefined);
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    // Screens the plan summary opens before the first start is finished.
    const inOnboarding = ['onboarding', 'plan-edit', 'workout', 'exercise'].includes(segments[0] ?? '');
    if (!profile.onboarded && !inOnboarding) router.replace('/onboarding');
  }, [ready, profile.onboarded, segments, router]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={colors.mode === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: colors.bg },
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="player" options={{ headerShown: false, gestureEnabled: false, animation: 'slide_from_bottom' }} />
        <Stack.Screen name="complete" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStoreProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </AppStoreProvider>
    </SafeAreaProvider>
  );
}
