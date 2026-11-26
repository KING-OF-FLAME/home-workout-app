import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EXERCISES } from '@/data/exercises';
import type { MuscleGroup } from '@/data/types';
import { EQUIPMENT_LABEL } from '@/lib/workout';
import { useColors } from '@/store/AppStore';
import { spacing } from '@/theme';
import { ExerciseThumb, groupLabel } from './ExerciseThumb';
import { Chip, Field, IconButton, Row, Txt } from './ui';

const GROUPS: (MuscleGroup | 'all')[] = ['all', 'fullbody', 'cardio', 'chest', 'arms', 'shoulders', 'back', 'core', 'legs', 'glutes', 'mobility'];

export function ExercisePicker({ visible, onClose, onPick }: { visible: boolean; onClose: () => void; onPick: (id: string) => void }) {
  const c = useColors();
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<MuscleGroup | 'all'>('all');
  const data = useMemo(
    () =>
      EXERCISES.filter(
        (e) => (group === 'all' || e.group === group) && e.name.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [search, group],
  );
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
        <Row style={{ padding: spacing.lg, justifyContent: 'space-between' }}>
          <Txt variant="h2">Add exercise</Txt>
          <IconButton icon="close" onPress={onClose} label="Close" />
        </Row>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Field placeholder="Search exercises" value={search} onChangeText={setSearch} autoCorrect={false} />
        </View>
        <View>
          <FlatList
            horizontal
            data={GROUPS}
            keyExtractor={(g) => g}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.md }}
            renderItem={({ item }) => (
              <Chip label={item === 'all' ? 'All' : groupLabel(item)} active={group === item} onPress={() => setGroup(item)} />
            )}
          />
        </View>
        <FlatList
          data={data}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                onPick(item.id);
                onClose();
              }}
              style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }, pressed && { opacity: 0.7 }]}
            >
              <ExerciseThumb exercise={item} size={44} />
              <View style={{ flex: 1 }}>
                <Txt style={{ fontWeight: '600' }}>{item.name}</Txt>
                <Txt variant="small" muted>
                  {groupLabel(item.group)} · {EQUIPMENT_LABEL[item.equipment]} · {item.mode === 'time' ? `${item.defaultSeconds}s` : `${item.defaultReps} reps`}
                </Txt>
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}
