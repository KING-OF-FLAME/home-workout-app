/**
 * Applies a scanned QR or an opened .fithome file on this phone, asking the
 * user where needed. Plans go to a student's phone; progress goes to a trainer's.
 */
import { Alert } from 'react-native';
import type { UserDoc } from '../services/cloud';
import { applyPlanPacket, applyProgressPacket, pickPacketFile, type ApplyResult, type Packet } from '../services/offlineShare';
import { scheduleCoachSyncReminder } from './notifications';

const ask = (title: string, message: string, yes: string) =>
  new Promise<boolean>((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: yes, onPress: () => resolve(true) },
    ]),
  );

export async function applyPacket(me: UserDoc, p: Packet): Promise<ApplyResult> {
  if (p.fithome === 'plan') {
    if (me.role === 'trainer') throw new Error('These are plans for a student. Open them on the student’s phone.');
    const r = await applyPlanPacket(me, p, (name) =>
      ask('Plans for someone else?', `${p.trainer.name} made these plans for ${name}. Add them to this phone anyway?`, 'Add'),
    );
    scheduleCoachSyncReminder(p.trainer.name).catch(() => undefined);
    return r;
  }
  if (me.role !== 'trainer') throw new Error('This is a student’s progress. Open it on the trainer’s phone.');
  return applyProgressPacket(me, p, (name) => ask('New student', `Add ${name} to your students?`, 'Add'));
}

/** Pick a .fithome file and apply it. Shows the result or the problem. Returns true when something changed. */
export async function importFromFile(me: UserDoc): Promise<boolean> {
  try {
    const p = await pickPacketFile();
    if (!p) return false;
    const r = await applyPacket(me, p);
    Alert.alert(r.title, r.message);
    return r.title !== 'Not added';
  } catch (e) {
    Alert.alert('Could not open the file', e instanceof Error ? e.message : 'Try again.');
    return false;
  }
}
