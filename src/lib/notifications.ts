import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppConfig } from '@/config';

const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

const MESSAGES = [
  'Time to move! Your workout is waiting.',
  'A few minutes today keeps the streak alive.',
  'Small steps, big results. Let us train!',
  'Your future self will thank you. Start now.',
];

/**
 * Schedule one daily reminder. Uses an inexact daily trigger (no exact-alarm
 * permission needed, which keeps the Play Store review simple).
 */
export async function scheduleDailyReminder(hour: number, minute: number): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  await Notifications.cancelAllScheduledNotificationsAsync();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: AppConfig.app.name,
      body: MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
  });
  return true;
}

export async function cancelReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelAllScheduledNotificationsAsync();
}
