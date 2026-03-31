export interface OpeningMove {
  san: string;
  comment?: string;
  isKey?: boolean;
}

export interface Opening {
  id: string;
  name: string;
  eco: string;
  color: 'white' | 'black';
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  moves: OpeningMove[];
}

export type TrainingStatus =
  | 'idle'
  | 'waiting_user'
  | 'waiting_opponent'
  | 'correct'
  | 'wrong'
  | 'off_opening'
  | 'complete';

export interface TrainingProgress {
  openingId: string;
  sessions: number;
  bestStreak: number;
  lastPlayed: string;
}

export type AppPage = 'home' | 'browser' | 'detail' | 'training';
