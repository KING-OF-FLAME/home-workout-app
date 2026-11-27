import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Row, Screen, Txt } from '@/components/ui';
import { AppConfig } from '@/config';
import { HELP } from '@/data/help';
import { useColors } from '@/store/AppStore';
import { spacing } from '@/theme';

export default function Help() {
  const c = useColors();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Screen edges={['bottom']}>
      <Stack.Screen options={{ title: 'How to use' }} />
      <Txt dim style={{ marginBottom: spacing.lg }}>
        Everything you need to know about {AppConfig.app.name}, in one place.
      </Txt>
      {HELP.map((sec, i) => (
        <Card key={sec.title} style={{ marginBottom: spacing.md }}>
          <Pressable onPress={() => setOpen(open === i ? null : i)}>
            <Row>
              <Ionicons name={sec.icon as 'rocket'} size={22} color={c.primary} />
              <Txt variant="h3" style={{ flex: 1 }}>
                {sec.title}
              </Txt>
              <Ionicons name={open === i ? 'chevron-up' : 'chevron-down'} size={18} color={c.textMuted} />
            </Row>
          </Pressable>
          {open === i ? (
            <View style={{ marginTop: spacing.md }}>
              {sec.steps.map((st, k) => (
                <Row key={k} style={{ alignItems: 'flex-start', marginBottom: spacing.sm }} gap={spacing.md}>
                  <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: c.primary + '26', alignItems: 'center', justifyContent: 'center' }}>
                    <Txt variant="caption" color={c.primary} style={{ fontWeight: '800' }}>
                      {k + 1}
                    </Txt>
                  </View>
                  <Txt dim style={{ flex: 1 }}>
                    {st}
                  </Txt>
                </Row>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}
