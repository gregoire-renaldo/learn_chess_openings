import type { PositionNextMove, TrainingMode } from '../types';

export function filterByMode(moves: PositionNextMove[], mode: TrainingMode): PositionNextMove[] {
  switch (mode) {
    case 'classical':
      return moves.filter((move) => move.type === 'main');
    case 'mixed':
      return moves.filter((move) => move.type === 'main' || move.type === 'sideline');
    case 'deviation':
      return moves;
    default:
      return moves;
  }
}

export function selectWeightedRandom(moves: PositionNextMove[]): string {
  if (moves.length === 0) {
    return '';
  }

  const totalWeight = moves.reduce((sum, move) => sum + Math.max(move.weight, 1), 0);
  let threshold = Math.random() * totalWeight;

  for (const move of moves) {
    threshold -= Math.max(move.weight, 1);
    if (threshold <= 0) {
      return move.uci;
    }
  }

  return moves[moves.length - 1].uci;
}
