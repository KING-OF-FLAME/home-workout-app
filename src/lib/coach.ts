import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

/** Voice + haptic cues during a workout. Every call is safe to make when the feature is off. */
export function createCoach(opts: { voice: boolean; haptics: boolean }) {
  return {
    say(text: string) {
      if (!opts.voice) return;
      Speech.stop();
      Speech.speak(text, { rate: 1.0 });
    },
    tick() {
      if (opts.haptics) Haptics.selectionAsync().catch(() => undefined);
    },
    bump() {
      if (opts.haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined);
    },
    success() {
      if (opts.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    },
    stop() {
      Speech.stop();
    },
  };
}
