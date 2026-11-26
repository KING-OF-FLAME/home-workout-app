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
import { createUserDoc, deleteAccountData, getUserDoc, type Role, type UserDoc } from '@/services/cloud';

interface AuthValue {
  /** False when Firebase is not configured: the app runs fully offline. */
  enabled: boolean;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  // While signUp() is creating the profile, the auth listener must not create a default one.
  const signingUp = useRef(false);

  useEffect(() => {
    const fb = firebase();
    if (!fb) return;
    return onAuthStateChanged(fb.auth, async (u) => {
      setUser(u);
      if (u) {
        if (signingUp.current) return;
        try {
          let doc = await getUserDoc(u.uid);
          if (!doc) {
            doc = await createUserDoc({ uid: u.uid, displayName: u.displayName ?? 'Athlete', email: u.email ?? '', role: 'member' });
          }
          setProfile(doc);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setProfile(await getUserDoc(user.uid));
  }, [user]);

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
      await updateProfile(cred.user, { displayName: name.trim() });
      const doc = await createUserDoc({ uid: cred.user.uid, displayName: name.trim(), email: email.trim(), role });
      setUser(cred.user);
      setProfile(doc);
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
      if (!fb || !fb.auth.currentUser || !profile) return;
      const current = fb.auth.currentUser;
      await reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email ?? '', password));
      await deleteAccountData(profile);
      await deleteUser(current);
    },
    [profile],
  );

  return (
    <Ctx.Provider
      value={{ enabled: isFirebaseConfigured, loading, user, profile, signIn, signUp, resetPassword, signOut, refresh, deleteAccount }}
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
