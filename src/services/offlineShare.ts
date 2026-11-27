/**
 * Trainer ⇄ student sharing without any network: QR codes shown on screen,
 * or a small .fithome file sent through WhatsApp, email, Bluetooth or any app.
 *
 * Two kinds of packet:
 *  - plan:     trainer → student. The student's plans (workout and meal) with a full copy of each plan.
 *  - progress: student → trainer. Who the student is and the workouts they finished.
 *
 * A new student first sends progress (it introduces them, even with no workouts),
 * the trainer adds them and assigns plans, then sends the plans back.
 */
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import {
  addRosterEntry,
  getRosterEntry,
  listAssignmentsForStudent,
  listMyCompletions,
  type Assignment,
  type Completion,
  type UserDoc,
} from './cloud';
import { localStore } from './docstore';
import { saveTrainerPlans } from './nearbySync';
import { decodePacket, encodePacket } from './packetCodec';

export const PACKET_VERSION = 1;

export interface PlanPacket {
  fithome: 'plan';
  v: number;
  trainer: { uid: string; name: string };
  student: { uid: string; name: string };
  assignments: Assignment[];
  at: number;
}

export interface ProgressPacket {
  fithome: 'progress';
  v: number;
  student: { uid: string; name: string };
  trainerId: string | null;
  completions: Completion[];
  at: number;
}

export type Packet = PlanPacket | ProgressPacket;

// ---------------- Building ----------------

export async function buildPlanPacket(trainer: UserDoc, studentId: string): Promise<PlanPacket> {
  const entry = await getRosterEntry(trainer.uid, studentId);
  const assignments = await listAssignmentsForStudent(trainer.uid, studentId);
  return {
    fithome: 'plan',
    v: PACKET_VERSION,
    trainer: { uid: trainer.uid, name: trainer.displayName || 'Trainer' },
    student: { uid: studentId, name: entry?.name ?? 'Student' },
    assignments,
    at: Date.now(),
  };
}

export async function buildProgressPacket(student: UserDoc): Promise<ProgressPacket> {
  const completions = (await listMyCompletions(student.uid)).slice(0, 500);
  return {
    fithome: 'progress',
    v: PACKET_VERSION,
    student: { uid: student.uid, name: student.displayName || 'Student' },
    trainerId: student.trainerId,
    completions,
    at: Date.now(),
  };
}

// ---------------- Reading ----------------

export function readPacket(text: string): Packet {
  let p: Packet;
  try {
    p = decodePacket<Packet>(text);
  } catch {
    throw new Error('This is not a FitHome code or file.');
  }
  if (!p || (p.fithome !== 'plan' && p.fithome !== 'progress')) throw new Error('This is not a FitHome code or file.');
  if (typeof p.v !== 'number' || p.v > PACKET_VERSION) throw new Error('This was made by a newer version of the app. Update the app and try again.');
  if (!p.student?.uid) throw new Error('This file is missing the student details.');
  return p;
}

export interface ApplyResult {
  title: string;
  message: string;
}

/** Student phone: store the trainer's plans. `confirmOther` is asked when the plans were made for someone else. */
export async function applyPlanPacket(
  student: UserDoc,
  p: PlanPacket,
  confirmOther: (forName: string) => Promise<boolean>,
): Promise<ApplyResult> {
  if (p.student.uid !== student.uid && !(await confirmOther(p.student.name))) {
    return { title: 'Not added', message: 'Nothing changed on this phone.' };
  }
  await saveTrainerPlans(student, p.trainer, p.assignments, p.at, 'OFFLINE');
  const plans = p.assignments.filter((a) => a.active).length;
  return {
    title: `Plans from ${p.trainer.name}`,
    message: plans ? `${plans} plan${plans === 1 ? '' : 's'} added. Open them from the Coach tab.` : 'You are linked to your trainer. They have not assigned a plan yet.',
  };
}

/** Trainer phone: add the student if new (after `approveNew`) and keep their finished workouts. */
export async function applyProgressPacket(
  trainer: UserDoc,
  p: ProgressPacket,
  approveNew: (studentName: string) => Promise<boolean>,
): Promise<ApplyResult> {
  let entry = await getRosterEntry(trainer.uid, p.student.uid);
  if (!entry) {
    if (!(await approveNew(p.student.name))) return { title: 'Not added', message: 'Nothing changed on this phone.' };
    entry = { studentId: p.student.uid, name: p.student.name.slice(0, 40), email: '', inviteCode: 'OFFLINE', joinedAt: Date.now() };
    await addRosterEntry(trainer.uid, entry);
  }
  const done = (p.completions ?? []).filter((c) => c && typeof c.id === 'string').slice(0, 2000);
  await localStore.batch(
    done.map((c) => ({ op: 'set' as const, path: `completions/${c.id}`, data: { ...c, studentId: p.student.uid, trainerId: trainer.uid } })),
  );
  return {
    title: `Progress from ${entry.name}`,
    message: `${done.length} finished workout${done.length === 1 ? '' : 's'} saved. Assign plans on their page, then send them back.`,
  };
}

// ---------------- Files ----------------

const safeName = (s: string) => s.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'fithome';

/** Write the packet to a .fithome file and open the share sheet (WhatsApp, email, Drive, Bluetooth…). */
export async function sharePacketFile(p: Packet): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this phone.');
  const who = p.fithome === 'plan' ? `plan-for-${safeName(p.student.name)}` : `progress-${safeName(p.student.name)}`;
  const file = new File(Paths.cache, `${who}.fithome`);
  if (file.exists) file.delete();
  file.create();
  // Compact text keeps files small; readPacket also accepts plain JSON.
  file.write(encodePacket(p));
  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: p.fithome === 'plan' ? 'Send plans to your student' : 'Send your progress to your trainer',
  });
}

/** Let the user pick a .fithome file (from WhatsApp downloads, Files, Drive…). Returns null when cancelled. */
export async function pickPacketFile(): Promise<Packet | null> {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const text = await new File(res.assets[0].uri).text();
  return readPacket(text);
}
