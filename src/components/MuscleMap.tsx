import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Body from 'react-native-body-highlighter';
import { BODY_LABEL, type BodySlug } from '@/data/muscles';
import { useColors } from '@/store/AppStore';
import { spacing } from '@/theme';
import { Row, Txt } from './ui';

/** Light, medium and strong highlight colours for intensity 1, 2 and 3. */
export const HEAT = ['#FFC2A8', '#FF8A5B', '#FF3D1F'] as const;

export interface MuscleHighlight {
  slug: BodySlug;
  intensity: number;
}

const BACK_ONLY = new Set<BodySlug>(['gluteal', 'hamstring', 'lower-back', 'upper-back']);
const FRONT_ONLY = new Set<BodySlug>(['chest', 'abs', 'obliques', 'biceps', 'quadriceps', 'adductors', 'tibialis', 'forearm', 'neck']);

/**
 * Front and back body map. Worked muscles glow and gently pulse so the
 * user can see at a glance what an exercise or workout trains.
 */
export function MuscleMap({
  data,
  scale = 0.62,
  animate = true,
  legend = true,
  gender = 'male',
  onPress,
  selected,
}: {
  data: MuscleHighlight[];
  /** Tap a muscle on the map. */
  onPress?: (slug: BodySlug) => void;
  /** Outline this muscle. */
  selected?: BodySlug | null;
  scale?: number;
  animate?: boolean;
  legend?: boolean;
  gender?: 'male' | 'female';
}) {
  const c = useColors();
  const pulse = useRef(new Animated.Value(1)).current;
  const enter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(enter, { toValue: 1, duration: 650, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }).start();
    if (!animate) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animate, enter, pulse]);

  const base = c.surfaceAlt;
  const border = c.border;
  const front = data.some((d) => !BACK_ONLY.has(d.slug));
  const back = data.some((d) => !FRONT_ONLY.has(d.slug));
  const sides: ('front' | 'back')[] = front && back ? ['front', 'back'] : back ? ['back', 'front'] : ['front', 'back'];
  const w = 200 * scale;
  const h = 400 * scale;

  return (
    <View style={{ alignItems: 'center' }}>
      <Animated.View
        style={{
          flexDirection: 'row',
          gap: spacing.lg,
          opacity: enter,
          transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
        }}
      >
        {sides.map((side) => (
          <View key={side} style={{ alignItems: 'center' }}>
            <View style={{ width: w, height: h }}>
              <Body data={[]} side={side} gender={gender} scale={scale} defaultFill={base} border={border} />
              <Animated.View style={{ position: 'absolute', left: 0, top: 0, opacity: pulse }} pointerEvents="none">
                <Body data={data} side={side} gender={gender} scale={scale} colors={HEAT} defaultFill="transparent" border="none" />
              </Animated.View>
              {selected ? (
                <View style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
                  <Body
                    data={[{ slug: selected, styles: { fill: 'transparent', stroke: c.text, strokeWidth: 3 } }]}
                    side={side}
                    gender={gender}
                    scale={scale}
                    defaultFill="transparent"
                    border="none"
                  />
                </View>
              ) : null}
              {onPress ? (
                <View style={{ position: 'absolute', left: 0, top: 0, opacity: 0.01 }}>
                  <Body
                    data={[]}
                    side={side}
                    gender={gender}
                    scale={scale}
                    defaultFill="#000"
                    border="none"
                    onBodyPartPress={(b) => b.slug && b.slug in BODY_LABEL && onPress(b.slug as BodySlug)}
                  />
                </View>
              ) : null}
            </View>
            <Txt variant="caption" muted style={{ marginTop: 4 }}>
              {side === 'front' ? 'Front' : 'Back'}
            </Txt>
          </View>
        ))}
      </Animated.View>
      {legend ? (
        <Row gap={spacing.lg} style={{ marginTop: spacing.sm }}>
          <Row gap={6}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: HEAT[2] }} />
            <Txt variant="caption" dim>Main muscles</Txt>
          </Row>
          <Row gap={6}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: HEAT[0] }} />
            <Txt variant="caption" dim>Also working</Txt>
          </Row>
        </Row>
      ) : null}
    </View>
  );
}

/** Small pills naming the highlighted muscles, strongest first. */
export function MusclePills({ data, max = 8 }: { data: MuscleHighlight[]; max?: number }) {
  const sorted = [...data].sort((a, b) => b.intensity - a.intensity).slice(0, max);
  return (
    <Row style={{ flexWrap: 'wrap', justifyContent: 'center' }} gap={6}>
      {sorted.map((d) => (
        <View
          key={d.slug}
          style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: HEAT[Math.min(2, d.intensity - 1)] + '33', borderWidth: 1, borderColor: HEAT[Math.min(2, d.intensity - 1)] }}
        >
          <Txt variant="caption" style={{ fontWeight: '700' }}>
            {BODY_LABEL[d.slug]}
          </Txt>
        </View>
      ))}
    </Row>
  );
}
