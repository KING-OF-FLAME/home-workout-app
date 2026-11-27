/**
 * A tiny document store with two backends behind one interface:
 * - Firestore, when Firebase keys are set in config/app-config.json
 * - this phone's storage, otherwise (the default: everything works offline,
 *   and trainers share plans with students phone to phone, see nearbySync.ts)
 *
 * Paths look like Firestore paths: "users/abc", "rosters/t1/students/s1".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { isFirebaseConfigured } from '@/config';
import { firebase } from '@/lib/firebase';

export type Filter = [field: string, value: unknown];
export type BatchOp = { op: 'set'; path: string; data: object } | { op: 'update'; path: string; data: object } | { op: 'delete'; path: string };

export interface DocStore {
  get<T>(path: string): Promise<T | null>;
  set(path: string, data: object): Promise<void>;
  update(path: string, patch: object): Promise<void>;
  remove(path: string): Promise<void>;
  query<T>(collectionPath: string, filters?: Filter[]): Promise<T[]>;
  batch(ops: BatchOp[]): Promise<void>;
}

/** Firestore rejects `undefined`; strip it. */
export function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// ---------------- Firestore ----------------

function fs() {
  const fb = firebase();
  if (!fb) throw new Error('Cloud features are not set up.');
  return fb.db;
}

const firestoreStore: DocStore = {
  async get<T>(path: string) {
    const snap = await getDoc(doc(fs(), path));
    return snap.exists() ? (snap.data() as T) : null;
  },
  async set(path, data) {
    await setDoc(doc(fs(), path), clean(data));
  },
  async update(path, patch) {
    await updateDoc(doc(fs(), path), clean(patch));
  },
  async remove(path) {
    await deleteDoc(doc(fs(), path));
  },
  async query<T>(collectionPath: string, filters: Filter[] = []) {
    const q = query(collection(fs(), collectionPath), ...filters.map(([f, v]) => where(f, '==', v)));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as T);
  },
  async batch(ops) {
    for (let i = 0; i < ops.length; i += 400) {
      const b = writeBatch(fs());
      for (const o of ops.slice(i, i + 400)) {
        const ref = doc(fs(), o.path);
        if (o.op === 'set') b.set(ref, clean(o.data));
        else if (o.op === 'update') b.update(ref, clean(o.data));
        else b.delete(ref);
      }
      await b.commit();
    }
  },
};

// ---------------- This phone ----------------

const KEY = 'fithome:v1:db';
let cache: Record<string, object> | null = null;
let loading: Promise<Record<string, object>> | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function data(): Promise<Record<string, object>> {
  if (cache) return cache;
  if (!loading) {
    loading = AsyncStorage.getItem(KEY)
      .then((raw) => (raw ? (JSON.parse(raw) as Record<string, object>) : {}))
      .catch(() => ({}))
      .then((d) => (cache = d));
  }
  return loading;
}

function persist() {
  const snapshot = JSON.stringify(cache ?? {});
  writeQueue = writeQueue.then(() => AsyncStorage.setItem(KEY, snapshot)).catch(() => undefined);
  return writeQueue;
}

const isChildOf = (path: string, col: string) => path.startsWith(col + '/') && !path.slice(col.length + 1).includes('/');
const matches = (d: object, filters: Filter[]) => filters.every(([f, v]) => (d as Record<string, unknown>)[f] === v);

export const localStore: DocStore = {
  async get<T>(path: string) {
    const d = await data();
    return d[path] ? (clean(d[path]) as T) : null;
  },
  async set(path, value) {
    const d = await data();
    d[path] = clean(value);
    await persist();
  },
  async update(path, patch) {
    const d = await data();
    if (!d[path]) throw new Error('Not found.');
    d[path] = clean({ ...d[path], ...patch });
    await persist();
  },
  async remove(path) {
    const d = await data();
    delete d[path];
    await persist();
  },
  async query<T>(collectionPath: string, filters: Filter[] = []) {
    const d = await data();
    return Object.keys(d)
      .filter((p) => isChildOf(p, collectionPath) && matches(d[p], filters))
      .map((p) => clean(d[p]) as T);
  },
  async batch(ops) {
    const d = await data();
    for (const o of ops) {
      if (o.op === 'set') d[o.path] = clean(o.data);
      else if (o.op === 'update') d[o.path] = clean({ ...(d[o.path] ?? {}), ...o.data });
      else delete d[o.path];
    }
    await persist();
  },
};

/** Forget everything stored on this phone (used by "Reset data"). */
export async function clearLocalStore() {
  cache = {};
  await persist();
}

export function store(): DocStore {
  return isFirebaseConfigured ? firestoreStore : localStore;
}
