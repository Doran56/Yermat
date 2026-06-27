// Gamification utility functions

export const XP_REWARDS = {
  PERFORMANCE: 10,
  VIDEO: 5,
  NEW_BAR: 20,
  TOP_3: 30,
} as const;

export function computeLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function computeXpForNextLevel(level: number): number {
  return level * 100;
}

export function computeXpProgress(xp: number): { current: number; max: number; percentage: number } {
  const level = computeLevel(xp);
  const currentLevelXp = (level - 1) * 100;
  const nextLevelXp = level * 100;
  const current = xp - currentLevelXp;
  const max = nextLevelXp - currentLevelXp;
  const percentage = (current / max) * 100;
  
  return { current, max, percentage };
}

export type LevelTitle = 'Goutte' | 'Gorgée' | 'Torrent' | 'Océan';

export function computeTitle(level: number): LevelTitle {
  if (level <= 2) return 'Goutte';
  if (level <= 4) return 'Gorgée';
  if (level <= 7) return 'Torrent';
  return 'Océan';
}

export function getTitleEmoji(title: LevelTitle): string {
  switch (title) {
    case 'Goutte': return '💧';
    case 'Gorgée': return '🥤';
    case 'Torrent': return '🌊';
    case 'Océan': return '👑';
  }
}

export function getTitleColor(title: LevelTitle): string {
  switch (title) {
    case 'Goutte': return 'text-muted-foreground';
    case 'Gorgée': return 'text-sky-400';
    case 'Torrent': return 'text-cyan-500';
    case 'Océan': return 'text-sky-600';
  }
}

export function formatTime(ms: number): string {
  const seconds = ms / 1000;
  return seconds.toFixed(2) + 's';
}

export function formatTimeShort(ms: number): string {
  const seconds = ms / 1000;
  return seconds.toFixed(1) + 's';
}

// ─── Hydratation : volume & vitesse ─────────────────────────────────────────

/** Formate un volume en millilitres → "0,5 L" ou "250 mL". */
export function formatVolume(ml: number | null | undefined): string {
  if (!ml) return '0 L';
  if (ml < 1000) return `${ml} mL`;
  return `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 1).replace('.', ',')} L`;
}

/** Vitesse d'hydratation en litres par seconde (volume ÷ temps). */
export function computeSpeed(volumeMl: number | null | undefined, timeMs: number | null | undefined): number {
  if (!volumeMl || !timeMs || timeMs <= 0) return 0;
  return (volumeMl / 1000) / (timeMs / 1000);
}

/** Formate une vitesse en L/s → "1,2 L/s". */
export function formatSpeed(litersPerSecond: number): string {
  return `${litersPerSecond.toFixed(2).replace('.', ',')} L/s`;
}

export type MedalRank = 1 | 2 | 3;

export interface Medal {
  barId: string;
  barName: string;
  barCity: string;
  rank: MedalRank;
  bestTime: number;
  month?: string;
  category?: string;
  categoryLabel?: string;
}

export function getMedalEmoji(rank: MedalRank): string {
  switch (rank) {
    case 1: return '🥇';
    case 2: return '🥈';
    case 3: return '🥉';
  }
}

export function getMedalColor(rank: MedalRank): string {
  switch (rank) {
    case 1: return 'from-amber-400 to-yellow-500';
    case 2: return 'from-slate-300 to-slate-400';
    case 3: return 'from-amber-600 to-amber-700';
  }
}

export function getMedalBorder(rank: MedalRank): string {
  switch (rank) {
    case 1: return 'border-amber-400';
    case 2: return 'border-slate-400';
    case 3: return 'border-amber-600';
  }
}
