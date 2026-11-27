import raw from '../../config/app-config.json';

export type AdPlacement = keyof typeof raw.ads.placements;

/** Typed access to config/app-config.json. Edit the JSON, not this file. */
export const AppConfig = raw;

export const isFirebaseConfigured = Boolean(raw.firebase.apiKey && raw.firebase.projectId);

/** Trainer tools work offline too (phone-to-phone sync); Firebase only adds cloud accounts. */
export const trainerFeaturesAvailable = raw.features.trainerMode;
