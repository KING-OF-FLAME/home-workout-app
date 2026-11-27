import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { AppConfig } from '@/config';
import type { Goal, Level, Workout } from '@/data/types';
import { dayKey, streaks } from '@/lib/dates';
import type { MyPlan } from '@/lib/planGenerator';
import { clearAll, load, loadList, save } from '@/lib/storage';
import { clearLocalStore } from '@/services/docstore';
import { palettes, type Palette } from '@/theme';

export interface Profile {
  name: string;
  goal: Goal;
  level: Level;
  weightKg: number;
  heightCm: number;
  daysPerWeek: number;
  onboarded: boolean;
  /** Which body the exercise demos show. */
  sex?: 'male' | 'female';
}

export interface Settings {
  theme: 'dark' | 'light' | 'system';
  units: 'metric' | 'imperial';
  restSeconds: number;
  getReadySeconds: number;
  voice: boolean;
  haptics: boolean;
  reminderEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  /** How exercise demos are drawn: 3D body, drawn body, simple figure or photos. */
  demoStyle: DemoStyle;
}

export type DemoStyle = '3d' | 'drawn' | 'simple' | 'photo';

export type WorkoutSourceKind = 'program' | 'quick' | 'custom' | 'assignment' | 'plan';

export interface Session {
  id: string;
  title: string;
  kind: WorkoutSourceKind;
  refId: string;
  day?: number;
  startedAt: number;
  durationSec: number;
  calories: number;
  exercisesDone: number;
  feeling?: 'easy' | 'ok' | 'hard';
  /** Exercise id of every set that was finished, used for the muscle map. */
  exercises?: string[];
}

export interface WeightEntry {
  ts: number;
  kg: number;
}

export interface ProgramProgress {
  completedDays: number[];
  startedAt: number;
  /** 1 = as written. Adjusted by the "how did it feel?" answer after each session. */
  intensity: number;
}

const defaultProfile: Profile = {
  name: '',
  goal: 'get_fit',
  level: 1,
  weightKg: 70,
  heightCm: 170,
  daysPerWeek: 3,
  onboarded: false,
  sex: 'male',
};

const defaultSettings: Settings = {
  theme: AppConfig.brand.defaultTheme === 'light' ? 'light' : 'dark',
  units: AppConfig.defaults.units === 'imperial' ? 'imperial' : 'metric',
  restSeconds: AppConfig.defaults.restSeconds,
  getReadySeconds: AppConfig.defaults.getReadySeconds,
  voice: AppConfig.features.voiceCoach,
  haptics: true,
  reminderEnabled: false,
  reminderHour: AppConfig.defaults.reminderHour,
  reminderMinute: AppConfig.defaults.reminderMinute,
  demoStyle: '3d',
};

interface AppStoreValue {
  ready: boolean;
  colors: Palette;
  profile: Profile;
  settings: Settings;
  history: Session[];
  customWorkouts: Workout[];
  weights: WeightEntry[];
  programProgress: Record<string, ProgramProgress>;
  mealChecks: Record<string, number[]>;
  /** The personal plan built from onboarding answers. */
  myPlan: MyPlan | null;
  stats: {
    totalWorkouts: number;
    totalMinutes: number;
    totalCalories: number;
    currentStreak: number;
    bestStreak: number;
    thisWeek: number;
    activeDays: Set<string>;
  };
  updateProfile: (p: Partial<Profile>) => void;
  updateSettings: (s: Partial<Settings>) => void;
  addSession: (s: Session) => void;
  setSessionFeeling: (id: string, feeling: Session['feeling']) => void;
  deleteSession: (id: string) => void;
  saveCustomWorkout: (w: Workout) => void;
  deleteCustomWorkout: (id: string) => void;
  addWeight: (kg: number) => void;
  deleteWeight: (ts: number) => void;
  completeProgramDay: (programId: string, day: number) => void;
  adjustProgramIntensity: (programId: string, feeling: Session['feeling']) => void;
  resetProgram: (programId: string) => void;
  toggleMeal: (key: string, mealIndex: number) => void;
  setMyPlan: (plan: MyPlan | null) => void;
  completePlanSession: (session: number) => void;
  adjustPlanIntensity: (feeling: Session['feeling']) => void;
  resetAllData: () => Promise<void>;
}

const Ctx = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState(defaultProfile);
  const [settings, setSettings] = useState(defaultSettings);
  const [history, setHistory] = useState<Session[]>([]);
  const [customWorkouts, setCustomWorkouts] = useState<Workout[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [programProgress, setProgramProgress] = useState<Record<string, ProgramProgress>>({});
  const [mealChecks, setMealChecks] = useState<Record<string, number[]>>({});
  const [myPlan, setMyPlanState] = useState<MyPlan | null>(null);

  useEffect(() => {
    (async () => {
      const [p, s, h, c, w, pp, mc, mp] = await Promise.all([
        load('profile', defaultProfile),
        load('settings', defaultSettings),
        loadList<Session>('history'),
        loadList<Workout>('custom'),
        loadList<WeightEntry>('weights'),
        load<Record<string, ProgramProgress>>('programs', {}),
        load<Record<string, number[]>>('meals', {}),
        load<MyPlan | null>('myPlan', null),
      ]);
      setProfile({ ...defaultProfile, ...p });
      setSettings({ ...defaultSettings, ...s });
      setHistory(h);
      setCustomWorkouts(c);
      setWeights(w);
      setProgramProgress(pp);
      setMealChecks(mc);
      setMyPlanState(mp);
      setReady(true);
    })();
  }, []);

  // Persist each slice when it changes (after the first load).
  useEffect(() => { if (ready) save('profile', profile); }, [profile, ready]);
  useEffect(() => { if (ready) save('settings', settings); }, [settings, ready]);
  useEffect(() => { if (ready) save('history', history); }, [history, ready]);
  useEffect(() => { if (ready) save('custom', customWorkouts); }, [customWorkouts, ready]);
  useEffect(() => { if (ready) save('weights', weights); }, [weights, ready]);
  useEffect(() => { if (ready) save('programs', programProgress); }, [programProgress, ready]);
  useEffect(() => { if (ready) save('meals', mealChecks); }, [mealChecks, ready]);
  useEffect(() => { if (ready) save('myPlan', myPlan); }, [myPlan, ready]);

  const colors = useMemo(() => {
    const mode = settings.theme === 'system' ? (scheme === 'light' ? 'light' : 'dark') : settings.theme;
    return palettes[mode];
  }, [settings.theme, scheme]);

  const stats = useMemo(() => {
    const activeDays = new Set(history.map((h) => dayKey(h.startedAt)));
    const { current, best } = streaks(activeDays);
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      totalWorkouts: history.length,
      totalMinutes: Math.round(history.reduce((s, h) => s + h.durationSec, 0) / 60),
      totalCalories: Math.round(history.reduce((s, h) => s + h.calories, 0)),
      currentStreak: current,
      bestStreak: best,
      thisWeek: new Set(history.filter((h) => h.startedAt >= weekAgo).map((h) => dayKey(h.startedAt))).size,
      activeDays,
    };
  }, [history]);

  const updateProfile = useCallback((p: Partial<Profile>) => setProfile((prev) => ({ ...prev, ...p })), []);
  const updateSettings = useCallback((s: Partial<Settings>) => setSettings((prev) => ({ ...prev, ...s })), []);
  const addSession = useCallback((s: Session) => setHistory((prev) => [s, ...prev]), []);
  const setSessionFeeling = useCallback(
    (id: string, feeling: Session['feeling']) => setHistory((prev) => prev.map((h) => (h.id === id ? { ...h, feeling } : h))),
    [],
  );
  const deleteSession = useCallback((id: string) => setHistory((prev) => prev.filter((h) => h.id !== id)), []);
  const saveCustomWorkout = useCallback(
    (w: Workout) =>
      setCustomWorkouts((prev) => (prev.some((x) => x.id === w.id) ? prev.map((x) => (x.id === w.id ? w : x)) : [w, ...prev])),
    [],
  );
  const deleteCustomWorkout = useCallback((id: string) => setCustomWorkouts((prev) => prev.filter((x) => x.id !== id)), []);
  const addWeight = useCallback((kg: number) => {
    setWeights((prev) => [...prev, { ts: Date.now(), kg }].sort((a, b) => a.ts - b.ts));
    setProfile((prev) => ({ ...prev, weightKg: kg }));
  }, []);
  const deleteWeight = useCallback((ts: number) => setWeights((prev) => prev.filter((w) => w.ts !== ts)), []);

  const completeProgramDay = useCallback((programId: string, day: number) => {
    setProgramProgress((prev) => {
      const cur = prev[programId] ?? { completedDays: [], startedAt: Date.now(), intensity: 1 };
      if (cur.completedDays.includes(day)) return prev;
      return { ...prev, [programId]: { ...cur, completedDays: [...cur.completedDays, day] } };
    });
  }, []);

  const adjustProgramIntensity = useCallback((programId: string, feeling: Session['feeling']) => {
    if (!feeling || feeling === 'ok') return;
    setProgramProgress((prev) => {
      const cur = prev[programId] ?? { completedDays: [], startedAt: Date.now(), intensity: 1 };
      const next = feeling === 'easy' ? cur.intensity + 0.1 : cur.intensity - 0.1;
      return { ...prev, [programId]: { ...cur, intensity: Math.min(1.6, Math.max(0.6, Math.round(next * 10) / 10)) } };
    });
  }, []);

  const resetProgram = useCallback((programId: string) => {
    setProgramProgress((prev) => {
      const copy = { ...prev };
      delete copy[programId];
      return copy;
    });
  }, []);

  const toggleMeal = useCallback((key: string, mealIndex: number) => {
    setMealChecks((prev) => {
      const cur = prev[key] ?? [];
      const next = cur.includes(mealIndex) ? cur.filter((i) => i !== mealIndex) : [...cur, mealIndex];
      return { ...prev, [key]: next };
    });
  }, []);

  const setMyPlan = useCallback((plan: MyPlan | null) => setMyPlanState(plan), []);
  const completePlanSession = useCallback((session: number) => {
    setMyPlanState((prev) => (prev && !prev.completed.includes(session) ? { ...prev, completed: [...prev.completed, session] } : prev));
  }, []);
  const adjustPlanIntensity = useCallback((feeling: Session['feeling']) => {
    if (!feeling || feeling === 'ok') return;
    setMyPlanState((prev) => {
      if (!prev) return prev;
      const next = feeling === 'easy' ? prev.intensity + 0.1 : prev.intensity - 0.1;
      return { ...prev, intensity: Math.min(1.6, Math.max(0.6, Math.round(next * 10) / 10)) };
    });
  }, []);

  const resetAllData = useCallback(async () => {
    await clearAll();
    await clearLocalStore();
    setProfile(defaultProfile);
    setSettings(defaultSettings);
    setHistory([]);
    setCustomWorkouts([]);
    setWeights([]);
    setProgramProgress({});
    setMealChecks({});
    setMyPlanState(null);
  }, []);

  const value: AppStoreValue = {
    ready, colors, profile, settings, history, customWorkouts, weights, programProgress, mealChecks, myPlan, stats,
    updateProfile, updateSettings, addSession, setSessionFeeling, deleteSession, saveCustomWorkout,
    deleteCustomWorkout, addWeight, deleteWeight, completeProgramDay, adjustProgramIntensity, resetProgram,
    toggleMeal, setMyPlan, completePlanSession, adjustPlanIntensity, resetAllData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppStoreValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used inside AppStoreProvider');
  return v;
}

export function useColors(): Palette {
  return useApp().colors;
}
