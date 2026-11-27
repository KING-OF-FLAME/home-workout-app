import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  deleteUser,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { isFirebaseConfigured } from '@/config';
import { firebase } from '@/lib/firebase';
import { uid as makeId } from '@/lib/id';
import { createUserDoc, deleteAccountData, getUserDoc, updateUserDoc, type Role, type UserDoc } from '@/services/cloud';
import { localStore } from '@/services/docstore';
import { useApp } from './AppStore';

interface AuthValue {
  /** False when Firebase is not configured: the app runs fully offline. */
  enabled: boolean;
  /**
   * True when running without Firebase. `profile` is then a local identity on
   * this phone (no account needed) and trainers sync with students phone to phone.
   */
  offline: boolean;
  loading: boolean;
  user: User | null;
  profile: UserDoc | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string, role: Role) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
}

const Ctx = createContext<AuthValue | null>(null);

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Wrong password. Try again or reset it.',
    'auth/invalid-credential': 'Email or password is incorrect.',
    'auth/email-already-in-use': 'An account already exists with this email. Try signing in.',
    'auth/weak-password': 'Use at least 6 characters for your password.',
    'auth/network-request-failed': 'No internet connection. Check your network and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
    'auth/requires-recent-login': 'Please sign in again to continue.',
    'permission-denied': 'You do not have permission to do that.',
  };
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong. Please try again.');
}

const LOCAL_ID = 'localIdentity/me';

/** The offline identity: created once per phone, named after the user's profile. */
async function loadLocalProfile(name: string): Promise<UserDoc> {
  const id = await localStore.get<{ uid: string }>(LOCAL_ID);
  if (id) {
    const existing = await getUserDoc(id.uid);
    if (existing) return existing;
  }
  const uid = id?.uid ?? makeId('u_');
  await localStore.set(LOCAL_ID, { uid });
  return createUserDoc({ uid, displayName: name || 'Athlete', email: '', role: 'member' });
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const app = useApp();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  // While signUp() is creating the profile, the auth listener must not create a default one.
  const signingUp = useRef(false);

  /** Load the profile document, creating a member profile if none exists. */
  const loadProfile = useCallback(async (u: User): Promise<UserDoc> => {
    const existing = await getUserDoc(u.uid);
    if (existing) return existing;
    return createUserDoc({ uid: u.uid, displayName: u.displayName ?? 'Athlete', email: u.email ?? '', role: 'member' });
  }, []);

  // Offline: load the local identity and keep its name in step with the profile.
  useEffect(() => {
    if (isFirebaseConfigured || !app.ready) return;
    loadLocalProfile(app.profile.name.trim())
      .then(async (p) => {
        const name = app.profile.name.trim();
        if (name && p.displayName !== name) {
          await updateUserDoc(p.uid, { displayName: name });
          p = { ...p, displayName: name };
        }
        setProfile(p);
      })
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [app.ready, app.profile.name]);

  useEffect(() => {
    const fb = firebase();
    if (!fb) return;
    return onAuthStateChanged(fb.auth, async (u) => {
      setUser(u);
      if (u) {
        if (signingUp.current) return;
        try {
          setProfile(await loadProfile(u));
        } catch {
          setProfile(null); // e.g. offline; screens offer a retry via refresh()
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, [loadProfile]);

  /** Reload the profile (also retries after a failed load). Throws on network errors. */
  const refresh = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setProfile(await loadLocalProfile(app.profile.name.trim()));
      return;
    }
    const current = firebase()?.auth.currentUser;
    if (!current) return;
    setProfile(await loadProfile(current));
  }, [loadProfile, app.profile.name]);

  const signIn = useCallback(async (email: string, password: string) => {
    const fb = firebase();
    if (!fb) throw new Error('Accounts are not set up yet.');
    await signInWithEmailAndPassword(fb.auth, email.trim(), password);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string, role: Role) => {
    const fb = firebase();
    if (!fb) throw new Error('Accounts are not set up yet.');
    signingUp.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(fb.auth, email.trim(), password);
      try {
        await updateProfile(cred.user, { displayName: name.trim() });
        const doc = await createUserDoc({ uid: cred.user.uid, displayName: name.trim(), email: email.trim(), role });
        setUser(cred.user);
        setProfile(doc);
      } catch (e) {
        // Do not leave a half-created account behind: remove it so the user can simply try again.
        await deleteUser(cred.user).catch(() => fbSignOut(fb.auth));
        throw e;
      }
    } finally {
      signingUp.current = false;
      setLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const fb = firebase();
    if (!fb) throw new Error('Accounts are not set up yet.');
    await sendPasswordResetEmail(fb.auth, email.trim());
  }, []);

  const signOut = useCallback(async () => {
    const fb = firebase();
    if (fb) await fbSignOut(fb.auth);
  }, []);

  const deleteAccount = useCallback(
    async (password: string) => {
      const fb = firebase();
      const current = fb?.auth.currentUser;
      if (!fb || !current) throw new Error('You are not signed in.');
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? '', password));
      // Use the stored profile, or read it now (it may have failed to load earlier).
      const doc =
        profile ??
        (await getUserDoc(current.uid)) ?? { uid: current.uid, displayName: '', email: current.email ?? '', role: 'member' as const, trainerId: null, trainerName: null, createdAt: 0 };
      await deleteAccountData(doc);
      await deleteUser(current);
    },
    [profile],
  );

  return (
    <Ctx.Provider
      value={{ enabled: isFirebaseConfigured, offline: !isFirebaseConfigured, loading, user, profile, signIn, signUp, resetPassword, signOut, refresh, deleteAccount }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth(): AuthValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}
