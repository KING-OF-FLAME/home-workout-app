/**
 * AdMob banner ads (the only monetisation in this app).
 * The native module is loaded lazily so the app still runs in Expo Go,
 * where ads are simply hidden. Real ads need a development or release build.
 */
import { Platform } from 'react-native';
import { AppConfig, type AdPlacement } from '@/config';

type AdsModule = typeof import('react-native-google-mobile-ads');

let mod: AdsModule | null | undefined;

export function adsModule(): AdsModule | null {
  if (mod !== undefined) return mod;
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

export function adsAllowed(): boolean {
  return canRequestAds;
}

/** Ask for consent where the law requires it (EEA/UK), then start the SDK. Call once at app start. */
export async function initAds(): Promise<boolean> {
  if (started || !AppConfig.ads.enabled || Platform.OS === 'web') return canRequestAds;
  started = true;
  const m = adsModule();
  if (!m) return false;
  try {
    const info = await m.AdsConsent.gatherConsent();
    canRequestAds = info.canRequestAds;
  } catch {
    // Consent form unavailable (offline, not configured): fall back to the cached status.
    try {
      canRequestAds = (await m.AdsConsent.getConsentInfo()).canRequestAds;
    } catch {
      canRequestAds = false;
    }
  }
  if (!canRequestAds) return false;
  try {
    const rating = AppConfig.ads.maxAdContentRating as keyof typeof m.MaxAdContentRating;
    await m.default().setRequestConfiguration({
      maxAdContentRating: m.MaxAdContentRating[rating] ?? m.MaxAdContentRating.PG,
    });
    await m.default().initialize();
  } catch {
    canRequestAds = false;
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
