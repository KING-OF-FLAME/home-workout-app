/**
 * Phone-to-phone sync for trainers and students, with no server.
 *
 * The trainer's phone is the host: "Start sharing" opens a small TCP server on
 * the local network and shows a code. The code holds the phone's local IP
 * address and a random PIN. A student on the same Wi-Fi (or on the trainer's
 * hotspot) types the code once to join; later "Sync now" sends the student's
 * finished workouts to the trainer and brings back the latest plans.
 *
 * Messages are single lines of JSON. Nothing leaves the local network.
 */
import * as Network from 'expo-network';
import type TcpSocketModule from 'react-native-tcp-socket';

/** Loaded on first use, so a phone without the native module can still open the app. */
function tcp(): typeof TcpSocketModule {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('react-native-tcp-socket');
  return (mod.default ?? mod) as typeof TcpSocketModule;
}
import {
  addRosterEntry,
  getRosterEntry,
  getUserDoc,
  listAssignmentsForStudent,
  updateUserDoc,
  type Assignment,
  type Completion,
  type UserDoc,
} from './cloud';
import { localStore } from './docstore';

export const SYNC_PORT = 47820;
const PROTOCOL = 1;
const MAX_LINE = 4_000_000;

import { makeCode, readCode } from './syncCode';

export { makeCode, readCode };

// ---------------- Messages ----------------

type Hello = {
  t: 'hello';
  v: number;
  pin: number;
  student: { uid: string; name: string };
  /** True when this phone already thinks it belongs to this trainer. */
  linked: boolean;
  completions: Completion[];
};
type Reply =
  | { t: 'sync'; trainer: { uid: string; name: string }; assignments: Assignment[]; at: number }
  | { t: 'denied'; reason: string }
  | { t: 'removed' };

function lineReader(onLine: (line: string) => void, onTooBig: () => void) {
  let buf = '';
  return (chunk: string | Uint8Array) => {
    buf += typeof chunk === 'string' ? chunk : String.fromCharCode(...Array.from(chunk));
    if (buf.length > MAX_LINE) return onTooBig();
    let i: number;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 1);
      if (line.trim()) onLine(line);
    }
  };
}

// ---------------- Trainer: host ----------------

export interface HostEvent {
  at: number;
  text: string;
  ok: boolean;
}

export interface HostHandle {
  code: string;
  ip: string;
  stop: () => void;
}

export async function localIp(): Promise<string> {
  const ip = await Network.getIpAddressAsync().catch(() => '0.0.0.0');
  return ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip) ? ip : '0.0.0.0';
}

/**
 * Start sharing from the trainer's phone. `approveJoin` is asked before a new
 * student is added; known students sync straight away.
 */
export async function startHosting(opts: {
  trainer: UserDoc;
  approveJoin: (studentName: string) => Promise<boolean>;
  onEvent: (e: HostEvent) => void;
  pin?: number;
}): Promise<HostHandle> {
  const ip = await localIp();
  if (ip === '0.0.0.0') throw new Error('Connect to Wi-Fi or turn on your hotspot first.');
  const pin = opts.pin ?? Math.floor(Math.random() * 65536);
  const log = (text: string, ok = true) => opts.onEvent({ at: Date.now(), text, ok });

  const server = tcp().createServer((socket) => {
    socket.setEncoding('utf8');
    socket.setTimeout(30000, () => socket.destroy());
    // end(data) waits for the write to finish before closing. On Android a
    // separate write() + end() can close the socket before the reply is sent.
    const send = (r: Reply) => {
      socket.end(JSON.stringify(r) + '\n');
    };
    const onData = lineReader(
      async (line) => {
        let msg: Hello;
        try {
          msg = JSON.parse(line);
        } catch {
          return socket.destroy();
        }
        if (msg.t !== 'hello' || msg.pin !== pin || !msg.student?.uid) {
          log('Someone tried a wrong code', false);
          return send({ t: 'denied', reason: 'Wrong code. Ask your trainer for the current code.' });
        }
        try {
          const trainerId = opts.trainer.uid;
          let entry = await getRosterEntry(trainerId, msg.student.uid);
          if (!entry && msg.linked) {
            log(`${msg.student.name} was removed earlier, told their phone`, false);
            return send({ t: 'removed' });
          }
          if (!entry) {
            const ok = await opts.approveJoin(msg.student.name);
            if (!ok) {
              log(`Declined ${msg.student.name}`, false);
              return send({ t: 'denied', reason: 'Your trainer declined the request.' });
            }
            entry = { studentId: msg.student.uid, name: msg.student.name.slice(0, 40), email: '', inviteCode: 'NEARBY', joinedAt: Date.now() };
            await addRosterEntry(trainerId, entry);
          }
          // Keep the student's finished workouts so the trainer can see progress.
          const done = (msg.completions ?? []).filter((c) => c && typeof c.id === 'string').slice(0, 2000);
          await localStore.batch(done.map((c) => ({ op: 'set' as const, path: `completions/${c.id}`, data: { ...c, studentId: msg.student.uid, trainerId } })));
          const assignments = await listAssignmentsForStudent(trainerId, msg.student.uid);
          send({ t: 'sync', trainer: { uid: trainerId, name: opts.trainer.displayName }, assignments, at: Date.now() });
          log(`Synced ${entry.name}: ${done.length} workouts in, ${assignments.filter((a) => a.active).length} plans out`);
        } catch (e) {
          log(`Sync failed: ${e instanceof Error ? e.message : 'error'}`, false);
          socket.destroy();
        }
      },
      () => socket.destroy(),
    );
    socket.on('data', onData);
    socket.on('error', () => socket.destroy());
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', (e: Error) => reject(new Error(`Could not start sharing: ${e.message}`)));
    server.listen({ port: SYNC_PORT, host: '0.0.0.0' }, () => resolve());
  });
  log('Sharing started');
  return {
    code: makeCode(ip, pin),
    ip,
    stop: () => {
      server.close();
      log('Sharing stopped');
    },
  };
}

// ---------------- Student: client ----------------

function talk(host: string, hello: Hello, timeoutMs: number): Promise<Reply> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
      socket.destroy();
    };
    const timer = setTimeout(() => done(() => reject(new Error('timeout'))), timeoutMs);
    const socket = tcp().createConnection({ host, port: SYNC_PORT }, () => {
      socket.write(JSON.stringify(hello) + '\n');
    });
    socket.setEncoding('utf8');
    socket.on(
      'data',
      lineReader(
        (line) => {
          try {
            done(() => resolve(JSON.parse(line) as Reply));
          } catch {
            done(() => reject(new Error('bad reply')));
          }
        },
        () => done(() => reject(new Error('too big'))),
      ),
    );
    socket.on('error', () => done(() => reject(new Error('unreachable'))));
  });
}

/** Hotspot hosts usually sit at .1 of the student's network; try that too if the code's address fails. */
async function candidateHosts(codeIp: string): Promise<string[]> {
  const mine = await localIp();
  const list = [codeIp];
  if (mine !== '0.0.0.0') list.push(mine.split('.').slice(0, 3).join('.') + '.1');
  list.push('192.168.43.1', '192.168.49.1');
  return [...new Set(list)];
}

export interface SyncResult {
  trainerName: string;
  plans: number;
  sent: number;
}

const LINK_PATH = 'coachLink/me';
export interface CoachLink {
  code: string;
  trainerId: string;
  trainerName: string;
  lastSyncAt: number;
}

export async function getCoachLink(): Promise<CoachLink | null> {
  return localStore.get<CoachLink>(LINK_PATH);
}

/**
 * Join or sync with a trainer. On success the trainer's plans replace the old
 * copies on this phone and the student's profile points at the trainer.
 */
export async function syncWithTrainer(student: UserDoc, code: string): Promise<SyncResult> {
  const parsed = readCode(code);
  if (!parsed) throw new Error('That code does not look right. It has 10 letters and numbers, like K7Q2M-9XA3F.');
  const link = await getCoachLink();
  const completions = await localStore.query<Completion>('completions', [['studentId', student.uid]]);
  const hello: Hello = {
    t: 'hello',
    v: PROTOCOL,
    pin: parsed.pin,
    student: { uid: student.uid, name: student.displayName || 'Student' },
    linked: Boolean(link && student.trainerId),
    completions,
  };

  let reply: Reply | null = null;
  for (const host of await candidateHosts(parsed.ip)) {
    try {
      // A new join waits for the trainer to tap Accept, so allow longer.
      reply = await talk(host, hello, hello.linked ? 10000 : 45000);
      break;
    } catch {
      // try the next address
    }
  }
  if (!reply) {
    throw new Error("Could not reach your trainer's phone. Make sure sharing is on and both phones are on the same Wi-Fi or hotspot.");
  }
  if (reply.t === 'denied') throw new Error(reply.reason);
  if (reply.t === 'removed') {
    await unlinkTrainer(student);
    throw new Error('Your trainer removed you from their list. Ask for a new invite to join again.');
  }

  const { trainer, assignments } = reply;
  await saveTrainerPlans(student, trainer, assignments, reply.at, code);
  return { trainerName: trainer.name, plans: assignments.filter((a) => a.active).length, sent: completions.length };
}

/**
 * Store a trainer's latest plans on the student's phone (used by Wi-Fi sync,
 * QR codes and plan files). This trainer's old copies are replaced.
 */
export async function saveTrainerPlans(
  student: UserDoc,
  trainer: { uid: string; name: string },
  assignments: Assignment[],
  at: number,
  code: string,
) {
  const existing = await localStore.query<Assignment>('assignments', [['studentId', student.uid]]);
  await localStore.batch([
    ...existing.filter((a) => a.trainerId === trainer.uid).map((a) => ({ op: 'delete' as const, path: `assignments/${a.id}` })),
    ...assignments.map((a) => ({ op: 'set' as const, path: `assignments/${a.id}`, data: { ...a, studentId: student.uid } })),
    { op: 'set', path: LINK_PATH, data: { code, trainerId: trainer.uid, trainerName: trainer.name, lastSyncAt: at } satisfies CoachLink },
  ]);
  if (student.trainerId !== trainer.uid || student.trainerName !== trainer.name) {
    await updateUserDoc(student.uid, { trainerId: trainer.uid, trainerName: trainer.name });
  }
}

/** Student removes the trainer from this phone (plans are kept off the list). */
export async function unlinkTrainer(student: UserDoc) {
  const existing = await localStore.query<Assignment>('assignments', [['studentId', student.uid]]);
  await localStore.batch([
    ...existing.map((a) => ({ op: 'delete' as const, path: `assignments/${a.id}` })),
    { op: 'delete', path: LINK_PATH },
  ]);
  if (await getUserDoc(student.uid)) await updateUserDoc(student.uid, { trainerId: null, trainerName: null });
}
