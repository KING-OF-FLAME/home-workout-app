import { AppConfig } from '@/config';

export type ThemeMode = 'dark' | 'light';

export interface Palette {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  textMuted: string;
  primary: string;
  primaryText: string;
  accent: string;
  danger: string;
  warning: string;
  success: string;
}

const dark: Palette = {
  mode: 'dark',
  bg: '#0E0F13',
  surface: '#181A20',
  surfaceAlt: '#22252D',
  border: '#2C3039',
  text: '#F4F5F7',
  textDim: '#B4B8C2',
  textMuted: '#7D8290',
  primary: AppConfig.brand.primaryColor,
  primaryText: '#FFFFFF',
  accent: AppConfig.brand.accentColor,
  danger: '#FF4D5E',
  warning: '#FFB020',
  success: '#3DDC97',
};

const light: Palette = {
  mode: 'light',
  bg: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0F3',
  border: '#E1E4E9',
  text: '#14161B',
  textDim: '#4A505C',
  textMuted: '#868C98',
  primary: AppConfig.brand.primaryColor,
  primaryText: '#FFFFFF',
  accent: AppConfig.brand.accentColor,
  danger: '#E5354A',
  warning: '#D98E00',
  success: '#1FA971',
};

export const palettes = { dark, light };

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 18, xl: 24, pill: 999 };

/** Colour used for a muscle group across the app. */
export const muscleColors: Record<string, string> = {
  chest: '#FF7A59',
  back: '#5B8DEF',
  shoulders: '#B07CFF',
  arms: '#FFB020',
  core: '#3DDC97',
  legs: '#22C3E6',
  glutes: '#FF5FA2',
  fullbody: '#FF5A36',
  cardio: '#FF4D5E',
  mobility: '#8BD17C',
};
