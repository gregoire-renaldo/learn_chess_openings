import { normaliseFen } from './fenUtils';
import type {
  OpeningEntry,
  OpeningLine,
  PositionIndex,
  PositionNextMove,
  TrainingMode,
} from '../types';

function linePriority(line: OpeningLine): number {
  switch (line.type) {
    case 'main':
      return 3;
    case 'sideline':
      return 2;
    case 'offbeat':
      return 1;
    default:
      return 0;
  }
}

function matchesHistory(line: OpeningLine, history: string[]): boolean {
  return history.every((move, index) => line.moves[index] === move);
}

function pickBestLine(lines: OpeningLine[]): OpeningLine | null {
  const sorted = [...lines].sort((left, right) => {
    if (right.weight !== left.weight) {
      return right.weight - left.weight;
    }

    return linePriority(right) - linePriority(left);
  });

  return sorted[0] ?? null;
}

export function findCurrentLine(entry: OpeningEntry, history: string[]): { line: OpeningLine; index: number } | null {
  const matchingLines = entry.lines.filter((line) => matchesHistory(line, history) && history.length <= line.moves.length);
  const line = pickBestLine(matchingLines);

  if (!line) {
    return null;
  }

  return { line, index: history.length };
}

export function evaluateUserMove(
  entry: OpeningEntry,
  history: string[],
  uci: string,
): 'correct' | 'playable' | 'wrong' | 'off_repertoire' {
  const matchingLines = entry.lines.filter((line) => matchesHistory(line, history) && history.length < line.moves.length);

  if (matchingLines.some((line) => line.moves[history.length] === uci)) {
    return 'correct';
  }

  const playable = matchingLines.some((line) => {
    return line.recommendedResponses.includes(uci) || line.acceptedResponses.includes(uci);
  });

  return playable ? 'playable' : 'off_repertoire';
}

export function getCandidateMoves(
  index: PositionIndex,
  fen: string,
  mode: TrainingMode,
  openingId?: string,
): PositionNextMove[] {
  const entry = index[normaliseFen(fen)];
  if (!entry) {
    return [];
  }

  if (openingId && !entry.openingIds.includes(openingId)) {
    return [];
  }

  switch (mode) {
    case 'classical':
      return entry.nextMoves.filter((move) => move.type === 'main');
    case 'mixed':
      return entry.nextMoves.filter((move) => move.type === 'main' || move.type === 'sideline');
    case 'deviation':
      return entry.nextMoves;
    default:
      return entry.nextMoves;
  }
}
