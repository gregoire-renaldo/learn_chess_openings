import { normaliseFen } from './fenUtils';
import type { Tactic } from '../types';

export function findTactic(tactics: Tactic[], fen: string): Tactic | null {
  const normFen = normaliseFen(fen);
  return tactics.find((tactic) => normaliseFen(tactic.fen) === normFen) ?? null;
}

export function validateTacticMove(tactic: Tactic, uci: string): boolean {
  return tactic.solution[0] === uci;
}
