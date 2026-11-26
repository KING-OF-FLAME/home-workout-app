import type { ExpoConfig } from 'expo/config';
import cfg from './config/app-config.json';

/**
 * Native build configuration. Do not edit values here:
 * change config/app-config.json instead (see README > Rebranding).
 */
const config: ExpoConfig = {
  name: cfg.app.name,
  slug: cfg.app.slug,
  scheme: cfg.app.scheme,
  version: cfg.app.version,
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: cfg.app.iosBundleId,
    buildNumber: cfg.app.iosBuildNumber,
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: cfg.app.androidPackage,
    versionCode: cfg.app.androidVersionCode,
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: cfg.brand.splashBackground,
    },
    // Keep the permission list short for the Play Console Data safety form.
    permissions: ['android.permission.VIBRATE', 'android.permission.POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.USE_EXACT_ALARM',
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  web: { bundler: 'metro', favicon: './assets/favicon.png' },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: cfg.brand.splashBackground,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: cfg.brand.primaryColor,
      },
    ],
    [
      'react-native-google-mobile-ads',
      {
        androidAppId: cfg.ads.androidAppId,
        iosAppId: cfg.ads.iosAppId,
        delayAppMeasurementInit: true,
        userTrackingUsageDescription:
          'This identifier is used to show you more relevant ads. You can still use every feature if you decline.',
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          // Play Store: new apps must target the latest Android API level.
          compileSdkVersion: 36,
          targetSdkVersion: 36,
        },
      },
    ],
  ],
  extra: {
    ...(cfg.app.easProjectId ? { eas: { projectId: cfg.app.easProjectId } } : {}),
  },
};

export default config;
