export interface OpeningMove {
  san: string;
  comment?: string;
  isKey?: boolean;
}

export type OpeningSide = 'white' | 'black';
export type OpeningLineType = 'main' | 'sideline' | 'offbeat';

export interface OpeningLine {
  id: string;
  moves: string[];
  type: OpeningLineType;
  weight: number;
  explanation: string;
  notes: string[];
  recommendedResponses: string[];
  acceptedResponses: string[];
}

export interface OpeningEntry {
  id: string;
  name: string;
  eco: string;
  side: OpeningSide;
  startFen: string;
  description: string;
  lines: OpeningLine[];
}

export interface PositionNextMove {
  uci: string;
  type: OpeningLineType;
  weight: number;
  note?: string;
  recommendedResponses?: string[];
  acceptedResponses?: string[];
}

export interface PositionIndexEntry {
  openingIds: string[];
  nextMoves: PositionNextMove[];
}

export type PositionIndex = Record<string, PositionIndexEntry>;

export interface Tactic {
  id: string;
  fen: string;
  sideToMove: 'w' | 'b';
  solution: string[];
  theme: string[];
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  openingTags: string[];
}

export type TrainingMode = 'classical' | 'mixed' | 'deviation';
export type FeedbackStatus =
  | 'idle'
  | 'waiting_user'
  | 'correct'
  | 'playable'
  | 'wrong'
  | 'off_repertoire'
  | 'tactic_available'
  | 'tactic_solved'
  | 'complete';

export interface TrainerFeedback {
  status: FeedbackStatus;
  message: string;
  note?: string;
}

export type TacticStatus = 'hidden' | 'shown' | 'solved' | 'skipped';

export interface Opening {
  id: string;
  name: string;
  eco: string;
  color: OpeningSide;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  moves: OpeningMove[];
}

export type TrainingStatus =
  | 'idle'
  | 'waiting_user'
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

export type AppPage = 'home' | 'browser' | 'detail' | 'training' | 'trainer';
