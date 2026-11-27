import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { AppConfig } from '@/config';

const CHANNEL = 'reminders';
const DAILY_ID = 'daily-workout';
const COACH_ID = 'coach-sync';

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
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_ID,
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
  await Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined);
}

/**
 * Weekly nudge for students to sync with their coach (phone-to-phone sync needs
 * both phones nearby, so a reminder keeps plans and progress fresh).
 */
export async function scheduleCoachSyncReminder(coachName: string): Promise<boolean> {
  const ok = await ensurePermission();
  if (!ok) return false;
  await Notifications.cancelScheduledNotificationAsync(COACH_ID).catch(() => undefined);
  const now = new Date();
  await Notifications.scheduleNotificationAsync({
    identifier: COACH_ID,
    content: { title: AppConfig.app.name, body: `Time to sync with ${coachName}: get your new plan and share this week's workouts.` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: now.getDay() + 1, hour: 18, minute: 0, channelId: CHANNEL },
  });
  return true;
}

export async function cancelCoachSyncReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  await Notifications.cancelScheduledNotificationAsync(COACH_ID).catch(() => undefined);
}
