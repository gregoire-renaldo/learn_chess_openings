import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Chess } from 'chess.js';
import openingsData from '../data/openings.json';
import positionIndexData from '../data/positionIndex.json';
import tacticsData from '../data/tactics.json';
import { applyUciMove, normaliseFen } from '../lib/fenUtils';
import { filterByMode, selectWeightedRandom } from '../lib/moveSelector';
import { evaluateUserMove, findCurrentLine, getCandidateMoves } from '../lib/openingLookup';
import { findTactic, validateTacticMove } from '../lib/tacticLookup';
import type {
  FeedbackStatus,
  OpeningEntry,
  OpeningLine,
  OpeningSide,
  PositionIndex,
  PositionNextMove,
  Tactic,
  TacticStatus,
  TrainerFeedback,
  TrainingMode,
} from '../types';

const openings = openingsData as OpeningEntry[];
const positionIndex = positionIndexData as PositionIndex;
const tactics = tacticsData as Tactic[];

const idleFeedback: TrainerFeedback = {
  status: 'idle',
  message: 'Select an opening and a training mode to begin.',
};

function isUserTurn(historyLength: number, side: OpeningSide): boolean {
  return side === 'white' ? historyLength % 2 === 0 : historyLength % 2 === 1;
}

function getMinHistoryLength(side: OpeningSide): number {
  return side === 'white' ? 0 : 1;
}

function buildFeedback(status: FeedbackStatus, message: string, note?: string): TrainerFeedback {
  return { status, message, note };
}

function fallbackLineCandidates(entry: OpeningEntry, history: string[]): PositionNextMove[] {
  return entry.lines
    .filter((line) => history.every((move, index) => line.moves[index] === move) && history.length < line.moves.length)
    .map((line) => ({
      uci: line.moves[history.length],
      type: line.type,
      weight: line.weight,
      note: line.explanation,
      recommendedResponses: line.recommendedResponses,
      acceptedResponses: line.acceptedResponses,
    }));
}

function chooseOpponentMove(entry: OpeningEntry, fen: string, history: string[], mode: TrainingMode): PositionNextMove | null {
  const indexedMoves = getCandidateMoves(positionIndex, fen, mode, entry.id);
  const candidates = indexedMoves.length > 0 ? indexedMoves : fallbackLineCandidates(entry, history);
  const filtered = filterByMode(candidates, mode);

  if (filtered.length === 0) {
    return null;
  }

  const selectedUci = selectWeightedRandom(filtered);
  return filtered.find((move) => move.uci === selectedUci) ?? filtered[0] ?? null;
}

export function useOpeningTrainer() {
  const chessRef = useRef(new Chess());
  const [selectedOpening, setSelectedOpening] = useState<OpeningEntry | null>(null);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('classical');
  const [fen, setFen] = useState(chessRef.current.fen());
  const [hintSquares, setHintSquares] = useState<Record<string, CSSProperties>>({});
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<TrainerFeedback>(idleFeedback);
  const [currentLine, setCurrentLine] = useState<OpeningLine | null>(null);
  const [matchedTactic, setMatchedTactic] = useState<Tactic | null>(null);
  const [tacticStatus, setTacticStatus] = useState<TacticStatus>('hidden');
  const [status, setStatus] = useState<FeedbackStatus>('idle');

  const availableOpenings = useMemo(() => openings, []);
  const isUserTurnNow = selectedOpening ? isUserTurn(moveHistory.length, selectedOpening.side) : false;

  const syncState = useCallback((
    opening: OpeningEntry | null,
    history: string[],
    nextFeedback: TrainerFeedback,
    nextTactic: Tactic | null,
    nextTacticStatus: TacticStatus,
  ) => {
    setMoveHistory(history);
    setFen(chessRef.current.fen());
    setHintSquares({});
    setFeedback(nextFeedback);
    setStatus(nextFeedback.status);
    setMatchedTactic(nextTactic);
    setTacticStatus(nextTacticStatus);
    setCurrentLine(opening ? findCurrentLine(opening, history)?.line ?? null : null);
  }, []);

  const selectOpening = useCallback((entry: OpeningEntry) => {
    setSelectedOpening(entry);
    setFeedback(buildFeedback('idle', `${entry.name} selected. Choose a training mode.`));
    setStatus('idle');
  }, []);

  const selectMode = useCallback((mode: TrainingMode) => {
    setTrainingMode(mode);
  }, []);

  const startTraining = useCallback(() => {
    if (!selectedOpening) {
      return;
    }

    chessRef.current = new Chess();
    const history: string[] = [];
    let nextFeedback = buildFeedback('waiting_user', 'Play the next repertoire move.', selectedOpening.description);
    let nextTactic: Tactic | null = null;
    let nextTacticStatus: TacticStatus = 'hidden';

    if (selectedOpening.side === 'black') {
      const opponentMove = chooseOpponentMove(selectedOpening, chessRef.current.fen(), history, trainingMode);
      if (opponentMove) {
        applyUciMove(chessRef.current, opponentMove.uci);
        history.push(opponentMove.uci);
        nextTactic = findTactic(tactics, normaliseFen(chessRef.current.fen()));
        nextTacticStatus = nextTactic ? 'shown' : 'hidden';
        nextFeedback = nextTactic
          ? buildFeedback('tactic_available', 'Tactic available.', nextTactic.hint)
          : buildFeedback('waiting_user', 'Respond to the opening move.', opponentMove.note ?? selectedOpening.description);
      }
    }

    syncState(selectedOpening, history, nextFeedback, nextTactic, nextTacticStatus);
  }, [selectedOpening, syncState, trainingMode]);

  const reset = useCallback(() => {
    startTraining();
  }, [startTraining]);

  const handleTacticMove = useCallback((uci: string) => {
    if (!matchedTactic || tacticStatus !== 'shown') {
      return;
    }

    if (validateTacticMove(matchedTactic, uci)) {
      setTacticStatus('solved');
      setFeedback(buildFeedback('tactic_solved', 'Tactic solved.', matchedTactic.hint));
      setStatus('tactic_solved');
    }
  }, [matchedTactic, tacticStatus]);

  const showMoveHint = useCallback(() => {
    if (!selectedOpening || !isUserTurnNow) {
      return;
    }

    const currentMatch = findCurrentLine(selectedOpening, moveHistory);
    const nextMove = currentMatch?.line.moves[moveHistory.length];
    if (!nextMove) {
      return;
    }

    const fromSquare = nextMove.slice(0, 2);
    const toSquare = nextMove.slice(2, 4);

    setHintSquares({
      [fromSquare]: {
        background: 'rgba(88, 166, 255, 0.28)',
        boxShadow: 'inset 0 0 0 2px rgba(88, 166, 255, 0.8)',
      },
      [toSquare]: {
        background: 'rgba(240, 192, 64, 0.34)',
        boxShadow: 'inset 0 0 0 2px rgba(240, 192, 64, 0.85)',
      },
    });

    setFeedback(buildFeedback('waiting_user', 'Hint shown.', currentMatch?.line.notes[0] ?? currentMatch?.line.explanation));
    setStatus('waiting_user');
  }, [isUserTurnNow, moveHistory, selectedOpening]);

  const handleUserMove = useCallback((uci: string): boolean => {
    if (!selectedOpening) {
      return false;
    }

    const moveResult = applyUciMove(chessRef.current, uci);
    if (!moveResult) {
      const nextFeedback = buildFeedback('wrong', 'Illegal move.', 'That move is not legal in the current position.');
      syncState(selectedOpening, moveHistory, nextFeedback, matchedTactic, tacticStatus);
      return false;
    }

    const userSolvedTactic = matchedTactic && tacticStatus === 'shown' && validateTacticMove(matchedTactic, uci);
    const evaluation = evaluateUserMove(selectedOpening, moveHistory, uci);
    const historyAfterUserMove = [...moveHistory, uci];

    if (evaluation === 'off_repertoire') {
      const nextFeedback = buildFeedback('off_repertoire', 'Out of repertoire.', 'This move is legal, but it leaves your prepared line.');
      syncState(selectedOpening, historyAfterUserMove, nextFeedback, null, 'hidden');
      return true;
    }

    const matchedAfterUserMove = findCurrentLine(selectedOpening, historyAfterUserMove);
    const userNote = matchedAfterUserMove?.line.notes[0] ?? matchedAfterUserMove?.line.explanation;
    let nextFeedback = userSolvedTactic
      ? buildFeedback('tactic_solved', 'Tactic solved.', matchedTactic?.hint)
      : buildFeedback(
          evaluation === 'correct' ? 'correct' : 'playable',
          evaluation === 'correct' ? 'Correct.' : 'Playable alternative.',
          userNote,
        );

    let nextTactic: Tactic | null = userSolvedTactic ? matchedTactic : null;
    let nextTacticStatus: TacticStatus = userSolvedTactic ? 'solved' : 'hidden';
    let finalHistory = historyAfterUserMove;

    if (!isUserTurn(historyAfterUserMove.length, selectedOpening.side)) {
      const opponentMove = chooseOpponentMove(selectedOpening, chessRef.current.fen(), historyAfterUserMove, trainingMode);
      if (opponentMove) {
        applyUciMove(chessRef.current, opponentMove.uci);
        finalHistory = [...historyAfterUserMove, opponentMove.uci];
        const tactic = findTactic(tactics, normaliseFen(chessRef.current.fen()));
        nextTactic = tactic;
        nextTacticStatus = tactic ? 'shown' : nextTacticStatus;
        nextFeedback = tactic
          ? buildFeedback('tactic_available', 'Tactic available.', `${tactic.theme.join(', ')} — ${tactic.hint}`)
          : nextFeedback;
        if (!tactic && evaluation === 'correct') {
          nextFeedback = buildFeedback('correct', 'Correct.', opponentMove.note ?? userNote);
        }
        if (!tactic && evaluation === 'playable') {
          nextFeedback = buildFeedback('playable', 'Playable alternative.', opponentMove.note ?? userNote);
        }
      }
    }

    const matchedFinalLine = findCurrentLine(selectedOpening, finalHistory);
    const isComplete = matchedFinalLine ? matchedFinalLine.index >= matchedFinalLine.line.moves.length : false;

    if (isComplete) {
      nextFeedback = buildFeedback('complete', 'Opening line complete.', matchedFinalLine?.line.explanation);
      nextTactic = null;
      nextTacticStatus = 'hidden';
    }

    syncState(selectedOpening, finalHistory, nextFeedback, nextTactic, nextTacticStatus);
    return true;
  }, [matchedTactic, moveHistory, selectedOpening, syncState, tacticStatus, trainingMode]);

  const skipTactic = useCallback(() => {
    setMatchedTactic(null);
    setTacticStatus('skipped');
    setFeedback(buildFeedback('waiting_user', 'Continue the opening line.', currentLine?.notes[0] ?? currentLine?.explanation));
    setStatus('waiting_user');
  }, [currentLine]);

  const undoLastUserMove = useCallback(() => {
    if (!selectedOpening) {
      return;
    }

    const minLength = getMinHistoryLength(selectedOpening.side);
    if (moveHistory.length <= minLength) {
      return;
    }

    let targetLength = moveHistory.length - 1;
    while (targetLength > minLength && !isUserTurn(targetLength, selectedOpening.side)) {
      targetLength -= 1;
    }

    const nextHistory = moveHistory.slice(0, targetLength);
    const rebuilt = new Chess();
    for (const move of nextHistory) {
      applyUciMove(rebuilt, move);
    }
    chessRef.current = rebuilt;

    const tactic = findTactic(tactics, normaliseFen(rebuilt.fen()));
    const nextFeedback = tactic
      ? buildFeedback('tactic_available', 'Tactic available.', tactic.hint)
      : buildFeedback('waiting_user', 'Play the next repertoire move.', findCurrentLine(selectedOpening, nextHistory)?.line.explanation);

    syncState(selectedOpening, nextHistory, nextFeedback, tactic, tactic ? 'shown' : 'hidden');
  }, [moveHistory, selectedOpening, syncState]);

  return {
    availableOpenings,
    chess: chessRef.current,
    currentLine,
    feedback,
    fen,
    handleTacticMove,
    handleUserMove,
    hintSquares,
    isUserTurn: isUserTurnNow,
    matchedTactic,
    moveHistory,
    reset,
    selectMode,
    selectOpening,
    selectedOpening,
    skipTactic,
    showMoveHint,
    startTraining,
    status,
    tacticStatus,
    trainingMode,
    undoLastUserMove,
  };
}
