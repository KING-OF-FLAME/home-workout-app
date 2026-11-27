import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { RESULTS_NOTE, type Milestone } from '@/data/muscles';
import { useColors } from '@/store/AppStore';
import { spacing } from '@/theme';
import { Txt } from './ui';

/** "What to expect" timeline. Each step fades in one after the other. */
export function ResultsTimeline({ items, note = true }: { items: Milestone[]; note?: boolean }) {
  const c = useColors();
  const anims = useRef(items.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      180,
      anims.map((a) => Animated.timing(a, { toValue: 1, duration: 400, useNativeDriver: true })),
    ).start();
  }, [anims]);

  return (
    <View>
      {items.map((m, i) => (
        <Animated.View
          key={m.when}
          style={{
            flexDirection: 'row',
            gap: spacing.md,
            opacity: anims[i] ?? 1,
            transform: [{ translateX: (anims[i] ?? new Animated.Value(1)).interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
          }}
        >
          <View style={{ alignItems: 'center', width: 18 }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.primary, marginTop: 3, opacity: 0.4 + (0.6 * (i + 1)) / items.length }} />
            {i < items.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: c.border, marginVertical: 2 }} /> : null}
          </View>
          <View style={{ flex: 1, paddingBottom: spacing.md }}>
            <Txt variant="label" color={c.primary}>
              {m.when}
            </Txt>
            <Txt dim style={{ marginTop: 2 }}>
              {m.text}
            </Txt>
          </View>
        </Animated.View>
      ))}
      {note ? (
        <Txt variant="caption" muted>
          {RESULTS_NOTE}
        </Txt>
      ) : null}
    </View>
  );
}
