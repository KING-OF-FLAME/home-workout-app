/**
 * Firestore data layer for accounts and the trainer ⇄ student features.
 * Collections (see firestore.rules for who can read/write what):
 *   users/{uid}
 *   invites/{code}
 *   rosters/{trainerId}/students/{studentId}
 *   workoutPlans/{id}   mealPlans/{id}
 *   assignments/{id}    completions/{id}
 */
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
  type Firestore,
} from 'firebase/firestore';
import type { Level, Workout } from '@/data/types';
import { firebase } from '@/lib/firebase';
import { inviteCode, uid as makeId } from '@/lib/id';

export type Role = 'member' | 'trainer';

export interface UserDoc {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  trainerId: string | null;
  trainerName: string | null;
  createdAt: number;
}

export interface Invite {
  code: string;
  trainerId: string;
  trainerName: string;
  used: boolean;
  usedBy?: string;
  usedAt?: number;
  createdAt: number;
}

export interface RosterEntry {
  studentId: string;
  name: string;
  email: string;
  inviteCode: string;
  joinedAt: number;
  note?: string;
}

export interface WorkoutPlan {
  id: string;
  trainerId: string;
  name: string;
  description: string;
  level: Level;
  days: Workout[];
  updatedAt: number;
}

export interface Meal {
  name: string;
  time: string;
  items: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  note?: string;
}

export interface MealDay {
  title: string;
  meals: Meal[];
}

export interface MealPlan {
  id: string;
  trainerId: string;
  name: string;
  description: string;
  targetCalories: number;
  days: MealDay[];
  updatedAt: number;
}

export interface Assignment {
  id: string;
  trainerId: string;
  trainerName: string;
  studentId: string;
  studentName: string;
  type: 'workout' | 'meal';
  planId: string;
  title: string;
  /** A copy of the plan at assignment time, so the student can always read it. */
  workoutPlan?: WorkoutPlan;
  mealPlan?: MealPlan;
  startDate: string;
  note: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Completion {
  id: string;
  studentId: string;
  trainerId: string | null;
  assignmentId: string | null;
  day: number | null;
  title: string;
  durationSec: number;
  calories: number;
  feeling: 'easy' | 'ok' | 'hard' | null;
  completedAt: number;
}

function db(): Firestore {
  const fb = firebase();
  if (!fb) throw new Error('Cloud features are not set up. Add your Firebase keys to config/app-config.json.');
  return fb.db;
}

/** Firestore rejects `undefined`; strip it. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

async function list<T>(q: ReturnType<typeof query>): Promise<T[]> {
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data() as T);
}

// ---------------- Users ----------------

export async function getUserDoc(id: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db(), 'users', id));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function createUserDoc(u: { uid: string; displayName: string; email: string; role: Role }): Promise<UserDoc> {
  const data: UserDoc = { ...u, trainerId: null, trainerName: null, createdAt: Date.now() };
  await setDoc(doc(db(), 'users', u.uid), data);
  return data;
}

export async function updateUserDoc(id: string, patch: Partial<Pick<UserDoc, 'displayName' | 'role' | 'trainerId' | 'trainerName'>>) {
  await updateDoc(doc(db(), 'users', id), clean(patch));
}

// ---------------- Invites & roster ----------------

export async function createInvite(trainer: UserDoc): Promise<Invite> {
  // Retry on the (very unlikely) chance the code exists.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = inviteCode();
    const ref = doc(db(), 'invites', code);
    const existing = await getDoc(ref).catch(() => null);
    if (existing?.exists()) continue;
    const invite: Invite = { code, trainerId: trainer.uid, trainerName: trainer.displayName, used: false, createdAt: Date.now() };
    await setDoc(ref, invite);
    return invite;
  }
  throw new Error('Could not create an invite code. Please try again.');
}

export async function listInvites(trainerId: string): Promise<Invite[]> {
  const items = await list<Invite>(query(collection(db(), 'invites'), where('trainerId', '==', trainerId)));
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteInvite(code: string) {
  await deleteDoc(doc(db(), 'invites', code));
}

/** Student joins a trainer with a code. Returns the trainer's name. */
export async function redeemInvite(rawCode: string, student: UserDoc): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error('Enter the code your trainer gave you.');
  const ref = doc(db(), 'invites', code);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('That code was not found. Check it with your trainer.');
  const invite = snap.data() as Invite;
  if (invite.used) throw new Error('This code has already been used. Ask your trainer for a new one.');
  if (invite.trainerId === student.uid) throw new Error('You cannot join your own team.');

  const batch = writeBatch(db());
  batch.update(ref, { used: true, usedBy: student.uid, usedAt: Date.now() });
  const entry: RosterEntry = {
    studentId: student.uid,
    name: student.displayName,
    email: student.email,
    inviteCode: code,
    joinedAt: Date.now(),
  };
  batch.set(doc(db(), 'rosters', invite.trainerId, 'students', student.uid), entry);
  batch.update(doc(db(), 'users', student.uid), { trainerId: invite.trainerId, trainerName: invite.trainerName });
  await batch.commit();
  return invite.trainerName;
}

export async function listStudents(trainerId: string): Promise<RosterEntry[]> {
  const items = await list<RosterEntry>(query(collection(db(), 'rosters', trainerId, 'students')));
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRosterEntry(trainerId: string, studentId: string): Promise<RosterEntry | null> {
  const snap = await getDoc(doc(db(), 'rosters', trainerId, 'students', studentId));
  return snap.exists() ? (snap.data() as RosterEntry) : null;
}

export async function updateStudentNote(trainerId: string, studentId: string, note: string) {
  await updateDoc(doc(db(), 'rosters', trainerId, 'students', studentId), { note });
}

export async function removeStudent(trainerId: string, studentId: string) {
  const assignments = await listAssignmentsForStudent(trainerId, studentId);
  const batch = writeBatch(db());
  assignments.filter((a) => a.active).forEach((a) => batch.update(doc(db(), 'assignments', a.id), { active: false, updatedAt: Date.now() }));
  batch.delete(doc(db(), 'rosters', trainerId, 'students', studentId));
  await batch.commit();
}

/** Student leaves their trainer. */
export async function leaveTrainer(student: UserDoc) {
  if (!student.trainerId) return;
  const batch = writeBatch(db());
  batch.delete(doc(db(), 'rosters', student.trainerId, 'students', student.uid));
  batch.update(doc(db(), 'users', student.uid), { trainerId: null, trainerName: null });
  await batch.commit();
}

// ---------------- Workout & meal plans ----------------

export async function listWorkoutPlans(trainerId: string): Promise<WorkoutPlan[]> {
  const items = await list<WorkoutPlan>(query(collection(db(), 'workoutPlans'), where('trainerId', '==', trainerId)));
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getWorkoutPlan(id: string): Promise<WorkoutPlan | null> {
  const snap = await getDoc(doc(db(), 'workoutPlans', id));
  return snap.exists() ? (snap.data() as WorkoutPlan) : null;
}

export async function saveWorkoutPlan(plan: Omit<WorkoutPlan, 'id' | 'updatedAt'> & { id?: string }): Promise<WorkoutPlan> {
  const full: WorkoutPlan = { ...plan, id: plan.id ?? makeId('wp_'), updatedAt: Date.now() };
  await setDoc(doc(db(), 'workoutPlans', full.id), clean(full));
  return full;
}

export async function deleteWorkoutPlan(id: string) {
  await deleteDoc(doc(db(), 'workoutPlans', id));
}

export async function listMealPlans(trainerId: string): Promise<MealPlan[]> {
  const items = await list<MealPlan>(query(collection(db(), 'mealPlans'), where('trainerId', '==', trainerId)));
  return items.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getMealPlan(id: string): Promise<MealPlan | null> {
  const snap = await getDoc(doc(db(), 'mealPlans', id));
  return snap.exists() ? (snap.data() as MealPlan) : null;
}

export async function saveMealPlan(plan: Omit<MealPlan, 'id' | 'updatedAt'> & { id?: string }): Promise<MealPlan> {
  const full: MealPlan = { ...plan, id: plan.id ?? makeId('mp_'), updatedAt: Date.now() };
  await setDoc(doc(db(), 'mealPlans', full.id), clean(full));
  return full;
}

export async function deleteMealPlan(id: string) {
  await deleteDoc(doc(db(), 'mealPlans', id));
}

export function mealDayTotals(day: MealDay) {
  return day.meals.reduce(
    (t, m) => ({ calories: t.calories + (m.calories || 0), protein: t.protein + (m.protein || 0), carbs: t.carbs + (m.carbs || 0), fat: t.fat + (m.fat || 0) }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

// ---------------- Assignments ----------------

export async function assignPlan(input: {
  trainer: UserDoc;
  student: RosterEntry;
  type: 'workout' | 'meal';
  plan: WorkoutPlan | MealPlan;
  startDate: string;
  note: string;
}): Promise<Assignment> {
  const now = Date.now();
  const a: Assignment = {
    id: makeId('as_'),
    trainerId: input.trainer.uid,
    trainerName: input.trainer.displayName,
    studentId: input.student.studentId,
    studentName: input.student.name,
    type: input.type,
    planId: input.plan.id,
    title: input.plan.name,
    workoutPlan: input.type === 'workout' ? (input.plan as WorkoutPlan) : undefined,
    mealPlan: input.type === 'meal' ? (input.plan as MealPlan) : undefined,
    startDate: input.startDate,
    note: input.note,
    active: true,
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db(), 'assignments', a.id), clean(a));
  return a;
}

/** Push the latest version of the plan to an existing assignment. */
export async function refreshAssignment(a: Assignment) {
  const latest = a.type === 'workout' ? await getWorkoutPlan(a.planId) : await getMealPlan(a.planId);
  if (!latest) throw new Error('The original plan was deleted.');
  await updateDoc(
    doc(db(), 'assignments', a.id),
    clean({ title: latest.name, [a.type === 'workout' ? 'workoutPlan' : 'mealPlan']: latest, updatedAt: Date.now() }),
  );
}

export async function setAssignmentActive(id: string, active: boolean) {
  await updateDoc(doc(db(), 'assignments', id), { active, updatedAt: Date.now() });
}

export async function deleteAssignment(id: string) {
  await deleteDoc(doc(db(), 'assignments', id));
}

export async function listAssignmentsForStudent(trainerId: string, studentId: string): Promise<Assignment[]> {
  const items = await list<Assignment>(
    query(collection(db(), 'assignments'), where('trainerId', '==', trainerId), where('studentId', '==', studentId)),
  );
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function listMyAssignments(studentId: string): Promise<Assignment[]> {
  const items = await list<Assignment>(query(collection(db(), 'assignments'), where('studentId', '==', studentId)));
  return items.filter((a) => a.active).sort((a, b) => b.createdAt - a.createdAt);
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  const snap = await getDoc(doc(db(), 'assignments', id));
  return snap.exists() ? (snap.data() as Assignment) : null;
}

// ---------------- Completions (progress the trainer can see) ----------------

export async function logCompletion(c: Omit<Completion, 'id'>): Promise<void> {
  const id = makeId('c_');
  await setDoc(doc(db(), 'completions', id), clean({ ...c, id }));
}

export async function listCompletionsForStudent(trainerId: string, studentId: string): Promise<Completion[]> {
  const items = await list<Completion>(
    query(collection(db(), 'completions'), where('trainerId', '==', trainerId), where('studentId', '==', studentId)),
  );
  return items.sort((a, b) => b.completedAt - a.completedAt);
}

export async function listMyCompletions(studentId: string): Promise<Completion[]> {
  const items = await list<Completion>(query(collection(db(), 'completions'), where('studentId', '==', studentId)));
  return items.sort((a, b) => b.completedAt - a.completedAt);
}

// ---------------- Account deletion (required by Google Play) ----------------

export async function deleteAccountData(user: UserDoc) {
  const d = db();
  const batchDelete = async (refs: { path: string }[]) => {
    for (let i = 0; i < refs.length; i += 400) {
      const batch = writeBatch(d);
      refs.slice(i, i + 400).forEach((r) => batch.delete(doc(d, r.path)));
      await batch.commit();
    }
  };
  const paths = async (q: ReturnType<typeof query>) => (await getDocs(q)).docs.map((x) => ({ path: x.ref.path }));

  const refs: { path: string }[] = [];
  refs.push(...(await paths(query(collection(d, 'completions'), where('studentId', '==', user.uid)))));
  if (user.trainerId) refs.push({ path: `rosters/${user.trainerId}/students/${user.uid}` });
  if (user.role === 'trainer') {
    refs.push(...(await paths(query(collection(d, 'workoutPlans'), where('trainerId', '==', user.uid)))));
    refs.push(...(await paths(query(collection(d, 'mealPlans'), where('trainerId', '==', user.uid)))));
    refs.push(...(await paths(query(collection(d, 'assignments'), where('trainerId', '==', user.uid)))));
    refs.push(...(await paths(query(collection(d, 'invites'), where('trainerId', '==', user.uid)))));
    refs.push(...(await paths(query(collection(d, 'rosters', user.uid, 'students')))));
  }
  refs.push({ path: `users/${user.uid}` });
  await batchDelete(refs);
}
