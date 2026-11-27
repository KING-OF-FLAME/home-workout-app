/**
 * Data layer for accounts and the trainer ⇄ student features. Runs on
 * Firestore when Firebase is configured, otherwise on this phone (see docstore.ts).
 * Collections (see firestore.rules for who can read/write what):
 *   users/{uid}
 *   invites/{code}
 *   rosters/{trainerId}/students/{studentId}
 *   workoutPlans/{id}   mealPlans/{id}
 *   assignments/{id}    completions/{id}
 */
import type { Level, Workout } from '@/data/types';
import { inviteCode, uid as makeId } from '@/lib/id';
import { store, type BatchOp } from './docstore';

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

// ---------------- Users ----------------

const sortBy = <T>(items: T[], key: (x: T) => number, desc = true) => items.sort((a, b) => (desc ? key(b) - key(a) : key(a) - key(b)));

export async function getUserDoc(id: string): Promise<UserDoc | null> {
  return store().get<UserDoc>(`users/${id}`);
}

export async function createUserDoc(u: { uid: string; displayName: string; email: string; role: Role }): Promise<UserDoc> {
  const data: UserDoc = { ...u, trainerId: null, trainerName: null, createdAt: Date.now() };
  await store().set(`users/${u.uid}`, data);
  return data;
}

export async function updateUserDoc(id: string, patch: Partial<Pick<UserDoc, 'displayName' | 'role' | 'trainerId' | 'trainerName'>>) {
  await store().update(`users/${id}`, patch);
}

// ---------------- Invites & roster ----------------

export async function createInvite(trainer: UserDoc): Promise<Invite> {
  // Retry on the (very unlikely) chance the code exists.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = inviteCode();
    const existing = await store().get<Invite>(`invites/${code}`).catch(() => null);
    if (existing) continue;
    const invite: Invite = { code, trainerId: trainer.uid, trainerName: trainer.displayName, used: false, createdAt: Date.now() };
    await store().set(`invites/${code}`, invite);
    return invite;
  }
  throw new Error('Could not create an invite code. Please try again.');
}

export async function listInvites(trainerId: string): Promise<Invite[]> {
  return sortBy(await store().query<Invite>('invites', [['trainerId', trainerId]]), (i) => i.createdAt);
}

export async function deleteInvite(code: string) {
  await store().remove(`invites/${code}`);
}

/** Student joins a trainer with a code (cloud mode). Returns the trainer's name. */
export async function redeemInvite(rawCode: string, student: UserDoc): Promise<string> {
  const code = rawCode.trim().toUpperCase();
  if (!code) throw new Error('Enter the code your trainer gave you.');
  const invite = await store().get<Invite>(`invites/${code}`);
  if (!invite) throw new Error('That code was not found. Check it with your trainer.');
  if (invite.used) throw new Error('This code has already been used. Ask your trainer for a new one.');
  if (invite.trainerId === student.uid) throw new Error('You cannot join your own team.');
  const entry: RosterEntry = { studentId: student.uid, name: student.displayName, email: student.email, inviteCode: code, joinedAt: Date.now() };
  await store().batch([
    { op: 'update', path: `invites/${code}`, data: { used: true, usedBy: student.uid, usedAt: Date.now() } },
    { op: 'set', path: `rosters/${invite.trainerId}/students/${student.uid}`, data: entry },
    { op: 'update', path: `users/${student.uid}`, data: { trainerId: invite.trainerId, trainerName: invite.trainerName } },
  ]);
  return invite.trainerName;
}

export async function listStudents(trainerId: string): Promise<RosterEntry[]> {
  const items = await store().query<RosterEntry>(`rosters/${trainerId}/students`);
  return items.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getRosterEntry(trainerId: string, studentId: string): Promise<RosterEntry | null> {
  return store().get<RosterEntry>(`rosters/${trainerId}/students/${studentId}`);
}

export async function addRosterEntry(trainerId: string, entry: RosterEntry) {
  await store().set(`rosters/${trainerId}/students/${entry.studentId}`, entry);
}

export async function updateStudentNote(trainerId: string, studentId: string, note: string) {
  await store().update(`rosters/${trainerId}/students/${studentId}`, { note });
}

export async function removeStudent(trainerId: string, studentId: string) {
  const assignments = await listAssignmentsForStudent(trainerId, studentId);
  const ops: BatchOp[] = assignments
    .filter((a) => a.active)
    .map((a) => ({ op: 'update', path: `assignments/${a.id}`, data: { active: false, updatedAt: Date.now() } }));
  ops.push({ op: 'delete', path: `rosters/${trainerId}/students/${studentId}` });
  await store().batch(ops);
}

/** Student leaves their trainer. */
export async function leaveTrainer(student: UserDoc) {
  if (!student.trainerId) return;
  await store().batch([
    { op: 'delete', path: `rosters/${student.trainerId}/students/${student.uid}` },
    { op: 'update', path: `users/${student.uid}`, data: { trainerId: null, trainerName: null } },
  ]);
}

// ---------------- Workout & meal plans ----------------

export async function listWorkoutPlans(trainerId: string): Promise<WorkoutPlan[]> {
  return sortBy(await store().query<WorkoutPlan>('workoutPlans', [['trainerId', trainerId]]), (p) => p.updatedAt);
}

export async function getWorkoutPlan(id: string): Promise<WorkoutPlan | null> {
  return store().get<WorkoutPlan>(`workoutPlans/${id}`);
}

export async function saveWorkoutPlan(plan: Omit<WorkoutPlan, 'id' | 'updatedAt'> & { id?: string }): Promise<WorkoutPlan> {
  const full: WorkoutPlan = { ...plan, id: plan.id ?? makeId('wp_'), updatedAt: Date.now() };
  await store().set(`workoutPlans/${full.id}`, full);
  return full;
}

export async function deleteWorkoutPlan(id: string) {
  await store().remove(`workoutPlans/${id}`);
}

export async function listMealPlans(trainerId: string): Promise<MealPlan[]> {
  return sortBy(await store().query<MealPlan>('mealPlans', [['trainerId', trainerId]]), (p) => p.updatedAt);
}

export async function getMealPlan(id: string): Promise<MealPlan | null> {
  return store().get<MealPlan>(`mealPlans/${id}`);
}

export async function saveMealPlan(plan: Omit<MealPlan, 'id' | 'updatedAt'> & { id?: string }): Promise<MealPlan> {
  const full: MealPlan = { ...plan, id: plan.id ?? makeId('mp_'), updatedAt: Date.now() };
  await store().set(`mealPlans/${full.id}`, full);
  return full;
}

export async function deleteMealPlan(id: string) {
  await store().remove(`mealPlans/${id}`);
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
  await store().set(`assignments/${a.id}`, a);
  return a;
}

/** Push the latest version of the plan to an existing assignment. */
export async function refreshAssignment(a: Assignment) {
  const latest = a.type === 'workout' ? await getWorkoutPlan(a.planId) : await getMealPlan(a.planId);
  if (!latest) throw new Error('The original plan was deleted.');
  await store().update(`assignments/${a.id}`, { title: latest.name, [a.type === 'workout' ? 'workoutPlan' : 'mealPlan']: latest, updatedAt: Date.now() });
}

export async function setAssignmentActive(id: string, active: boolean) {
  await store().update(`assignments/${id}`, { active, updatedAt: Date.now() });
}

export async function deleteAssignment(id: string) {
  await store().remove(`assignments/${id}`);
}

export async function listAssignmentsForStudent(trainerId: string, studentId: string): Promise<Assignment[]> {
  return sortBy(await store().query<Assignment>('assignments', [['trainerId', trainerId], ['studentId', studentId]]), (a) => a.createdAt);
}

export async function listMyAssignments(studentId: string): Promise<Assignment[]> {
  const items = await store().query<Assignment>('assignments', [['studentId', studentId]]);
  return sortBy(items.filter((a) => a.active), (a) => a.createdAt);
}

export async function getAssignment(id: string): Promise<Assignment | null> {
  return store().get<Assignment>(`assignments/${id}`);
}

// ---------------- Completions (progress the trainer can see) ----------------

export async function logCompletion(c: Omit<Completion, 'id'>): Promise<void> {
  const id = makeId('c_');
  await store().set(`completions/${id}`, { ...c, id });
}

export async function listCompletionsForStudent(trainerId: string, studentId: string): Promise<Completion[]> {
  return sortBy(await store().query<Completion>('completions', [['trainerId', trainerId], ['studentId', studentId]]), (c) => c.completedAt);
}

export async function listMyCompletions(studentId: string): Promise<Completion[]> {
  return sortBy(await store().query<Completion>('completions', [['studentId', studentId]]), (c) => c.completedAt);
}

// ---------------- Account deletion (required by Google Play) ----------------

export async function deleteAccountData(user: UserDoc) {
  const s = store();
  const paths: string[] = [];
  const add = (col: string, items: { id?: string; code?: string; studentId?: string }[], key: 'id' | 'code' | 'studentId') =>
    items.forEach((x) => paths.push(`${col}/${x[key]}`));
  add('completions', await s.query<Completion>('completions', [['studentId', user.uid]]), 'id');
  if (user.trainerId) paths.push(`rosters/${user.trainerId}/students/${user.uid}`);
  if (user.role === 'trainer') {
    add('workoutPlans', await s.query<WorkoutPlan>('workoutPlans', [['trainerId', user.uid]]), 'id');
    add('mealPlans', await s.query<MealPlan>('mealPlans', [['trainerId', user.uid]]), 'id');
    add('assignments', await s.query<Assignment>('assignments', [['trainerId', user.uid]]), 'id');
    add('invites', await s.query<Invite>('invites', [['trainerId', user.uid]]), 'code');
    add(`rosters/${user.uid}/students`, await s.query<RosterEntry>(`rosters/${user.uid}/students`), 'studentId');
  }
  paths.push(`users/${user.uid}`);
  await s.batch(paths.map((path) => ({ op: 'delete' as const, path })));
}
