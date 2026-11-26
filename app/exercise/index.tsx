import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, View } from 'react-native';
import { BannerAdSlot } from '@/components/BannerAdSlot';
import { ExerciseThumb, groupLabel } from '@/components/ExerciseThumb';
import { Chip, Field, Txt } from '@/components/ui';
import { EXERCISES } from '@/data/exercises';
import type { Equipment, MuscleGroup } from '@/data/types';
import { EQUIPMENT_LABEL } from '@/lib/workout';
import { useColors } from '@/store/AppStore';
import { spacing } from '@/theme';

const GROUPS: (MuscleGroup | 'all')[] = ['all', 'fullbody', 'cardio', 'chest', 'arms', 'shoulders', 'back', 'core', 'legs', 'glutes', 'mobility'];

export default function ExerciseLibrary() {
  const c = useColors();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const [noEquipment, setNoEquipment] = useState(false);
  const data = useMemo(
    () =>
      EXERCISES.filter(
        (e) =>
          (group === 'all' || e.group === group) &&
          (!noEquipment || e.equipment === 'none' || e.equipment === 'mat') &&
          e.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search, group, noEquipment],
  );
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ title: `Exercises (${EXERCISES.length})` }} />
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Field placeholder="Search exercises" value={search} onChangeText={setSearch} autoCorrect={false} />
      </View>
      <View>
        <FlatList
          horizontal
          data={GROUPS}
          keyExtractor={(g) => g}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md }}
          ListHeaderComponent={<Chip label="No equipment" icon="checkmark-circle" active={noEquipment} onPress={() => setNoEquipment((v) => !v)} />}
          renderItem={({ item }) => <Chip label={item === 'all' ? 'All' : groupLabel(item)} active={group === item} onPress={() => setGroup(item)} />}
        />
      </View>
      <FlatList
        data={data}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
        ListFooterComponent={<BannerAdSlot placement="exerciseLibrary" />}
        ListEmptyComponent={<Txt muted center style={{ marginTop: spacing.xl }}>No exercises match.</Txt>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: item.id } })}
            style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }, pressed && { opacity: 0.7 }]}
          >
            <ExerciseThumb exercise={item} />
            <View style={{ flex: 1 }}>
              <Txt style={{ fontWeight: '700' }}>{item.name}</Txt>
              <Txt variant="small" muted>
                {item.muscles.join(', ')} · {EQUIPMENT_LABEL[item.equipment as Equipment]}
              </Txt>
            </View>
            <Txt variant="caption" muted>
              {'●'.repeat(item.level)}
            </Txt>
          </Pressable>
        )}
      />
    </View>
  );
}
