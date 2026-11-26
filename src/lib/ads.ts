/**
 * AdMob banner ads (the only monetisation in this app).
 * The native module is loaded lazily so the app still runs in Expo Go,
 * where ads are simply hidden. Real ads need a development or release build.
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useSyncExternalStore } from 'react';
import { Platform, TurboModuleRegistry } from 'react-native';
import { AppConfig, type AdPlacement } from '@/config';

type AdsModule = typeof import('react-native-google-mobile-ads');

let mod: AdsModule | null | undefined;

/** True only in a development or release build that includes the AdMob native module. */
function nativeAdsAvailable(): boolean {
  if (Platform.OS === 'web') return false;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return false; // Expo Go
  try {
    return TurboModuleRegistry.get('RNGoogleMobileAdsModule') != null;
  } catch {
    return false;
  }
}

export function adsModule(): AdsModule | null {
  if (mod !== undefined) return mod;
  if (!nativeAdsAvailable()) {
    mod = null;
    return mod;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    mod = require('react-native-google-mobile-ads') as AdsModule;
  } catch {
    mod = null;
  }
  return mod;
}

let canRequestAds = false;
let started = false;
const listeners = new Set<() => void>();

function setAdsReady(value: boolean) {
  canRequestAds = value;
  listeners.forEach((l) => l());
}

export function adsAllowed(): boolean {
  return canRequestAds;
}

/** Re-renders the caller once consent is gathered and the SDK has started. */
export function useAdsReady(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => canRequestAds,
    () => false,
  );
}

/** Ask for consent where the law requires it (EEA/UK), then start the SDK. Call once at app start. */
export async function initAds(): Promise<boolean> {
  if (started || !AppConfig.ads.enabled || Platform.OS === 'web') return canRequestAds;
  started = true;
  const m = adsModule();
  if (!m) return false;
  let allowed = false;
  try {
    const info = await m.AdsConsent.gatherConsent();
    allowed = info.canRequestAds;
  } catch {
    // Consent form unavailable (offline, not configured): fall back to the cached status.
    try {
      allowed = (await m.AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      allowed = false;
    }
  }
  if (!allowed) return false;
  try {
    const rating = AppConfig.ads.maxAdContentRating as keyof typeof m.MaxAdContentRating;
    await m.default().setRequestConfiguration({
      maxAdContentRating: m.MaxAdContentRating[rating] ?? m.MaxAdContentRating.PG,
    });
    await m.default().initialize();
    setAdsReady(true); // only after the SDK has started
  } catch {
    setAdsReady(false);
  }
  return canRequestAds;
}

/** True when a "Privacy options" entry must be shown in Settings (GDPR). */
export async function privacyOptionsRequired(): Promise<boolean> {
  const m = adsModule();
  if (!m) return false;
  try {
    const info = await m.AdsConsent.getConsentInfo();
    return info.privacyOptionsRequirementStatus === m.AdsConsentPrivacyOptionsRequirementStatus.REQUIRED;
  } catch {
    return false;
  }
}

export async function showPrivacyOptions(): Promise<void> {
  const m = adsModule();
  if (!m) return;
  await m.AdsConsent.showPrivacyOptionsForm();
}

export function bannerUnitId(): string | null {
  const m = adsModule();
  if (!m) return null;
  if (__DEV__ && AppConfig.ads.useTestAdsInDebug) return m.TestIds.ADAPTIVE_BANNER;
  const id = Platform.OS === 'ios' ? AppConfig.ads.bannerUnitId.ios : AppConfig.ads.bannerUnitId.android;
  return id || null;
}

export function placementEnabled(p: AdPlacement): boolean {
  return AppConfig.ads.enabled && AppConfig.ads.placements[p] === true;
}
