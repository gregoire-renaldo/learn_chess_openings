import { Chess } from 'chess.js';

function toMoveObject(uci: string): { from: string; to: string; promotion?: string } | null {
  if (uci.length < 4) {
    return null;
  }

  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const promotion = uci.length > 4 ? uci.slice(4, 5) : undefined;
  return { from, to, promotion };
}

export function normaliseFen(fen: string): string {
  const parts = fen.split(' ');
  return parts.slice(0, 4).join(' ');
}

export function uciToSan(chess: Chess, uci: string): string | null {
  const move = toMoveObject(uci);
  if (!move) {
    return null;
  }

  const clone = new Chess(chess.fen());
  const result = clone.move(move);
  return result?.san ?? null;
}

export function sanToUci(chess: Chess, san: string): string | null {
  const clone = new Chess(chess.fen());
  const result = clone.move(san);
  if (!result) {
    return null;
  }

  return `${result.from}${result.to}${result.promotion ?? ''}`;
}

export function fenFromHistory(moves: string[]): string {
  const chess = new Chess();

  for (const uci of moves) {
    const move = toMoveObject(uci);
    if (!move || !chess.move(move)) {
      throw new Error(`Invalid UCI move in history: ${uci}`);
    }
  }

  return chess.fen();
}

export function applyUciMove(chess: Chess, uci: string) {
  const move = toMoveObject(uci);
  if (!move) {
    return null;
  }

  return chess.move(move);
}
