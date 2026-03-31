import type { TrainingProgress } from '../types';

const STORAGE_KEY = 'chess_opening_progress';

export function getProgress(): Record<string, TrainingProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSession(openingId: string): TrainingProgress {
  const all = getProgress();
  const existing = all[openingId];
  const updated: TrainingProgress = {
    openingId,
    sessions: (existing?.sessions ?? 0) + 1,
    bestStreak: existing?.bestStreak ?? 0,
    lastPlayed: new Date().toISOString(),
  };
  all[openingId] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updated;
}

export function updateStreak(openingId: string, streak: number): void {
  const all = getProgress();
  const existing = all[openingId];
  if (existing && streak > existing.bestStreak) {
    all[openingId] = { ...existing, bestStreak: streak };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  }
}
