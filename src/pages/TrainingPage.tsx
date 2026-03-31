import { useState, useCallback, useEffect, useRef } from 'react';
import type { CSSProperties, FC } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Opening, TrainingStatus } from '../types';
import { MoveList } from '../components/MoveList';
import { saveSession } from '../utils/progress';
import { getProgress } from '../utils/progress';

interface Props {
  opening: Opening;
  onBack: () => void;
}

interface FeedbackInfo {
  status: TrainingStatus;
  title: string;
  detail: string;
  icon: string;
}

function buildFeedback(status: TrainingStatus, san?: string): FeedbackInfo {
  switch (status) {
    case 'idle':
      return { status, title: 'Make your move', detail: 'Drag a piece on the board to start training.', icon: '♟', };
    case 'waiting_user':
      return { status, title: 'Your turn!', detail: 'Find the next move in the opening.', icon: '🎯' };
    case 'waiting_opponent':
      return { status, title: 'Opponent is thinking…', detail: 'Wait for the response.', icon: '⏳' };
    case 'correct':
      return { status, title: 'Correct! ✓', detail: san ? `${san} — great move! Keep going.` : 'Great move!', icon: '✅' };
    case 'wrong':
      return { status, title: 'Illegal move', detail: 'That move is not allowed. Try again.', icon: '❌' };
    case 'off_opening':
      return {
        status, title: 'Off the opening!',
        detail: `${san ?? 'That move'} is valid chess, but it's not part of this opening. Reset or continue.`,
        icon: '⚠️',
      };
    case 'complete':
      return { status, title: '🎉 Opening complete!', detail: 'You played through the entire opening correctly. Well done!', icon: '🏆' };
    default:
      return { status, title: '', detail: '', icon: '' };
  }
}

export const TrainingPage: FC<Props> = ({ opening, onBack }) => {
  const [chess]           = useState(() => new Chess());
  const [fen, setFen]     = useState(() => new Chess().fen());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [status, setStatus]   = useState<TrainingStatus>('waiting_user');
  const [feedback, setFeedback] = useState<FeedbackInfo>(buildFeedback('waiting_user'));
  const [correctCount, setCorrectCount]   = useState(0);
  const [wrongCount, setWrongCount]       = useState(0);
  const [showHint, setShowHint]           = useState(false);
  const [hintSquares, setHintSquares]     = useState<Record<string, CSSProperties>>({});
  const [sessions, setSessions]           = useState(() => getProgress()[opening.id]?.sessions ?? 0);
  const savedRef = useRef(false);

  const boardOrientation = opening.color === 'black' ? 'black' : 'white';

  // Determine which move indices belong to the user vs opponent
  // White openings: user plays even indices (0,2,4…), opponent plays odd
  // Black openings: user plays odd indices (1,3,5…), opponent plays even
  const isUserMove = useCallback((index: number) => {
    return opening.color === 'white' ? index % 2 === 0 : index % 2 === 1;
  }, [opening.color]);

  // Reset everything
  const reset = useCallback(() => {
    chess.reset();
    setFen(chess.fen());
    setCurrentMoveIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setShowHint(false);
    setHintSquares({});
    savedRef.current = false;
    // If black opening: auto-play first White move
    if (!isUserMove(0)) {
      const firstSan = opening.moves[0].san;
      chess.move(firstSan);
      setFen(chess.fen());
      setCurrentMoveIndex(1);
      setStatus('waiting_user');
      setFeedback(buildFeedback('waiting_user'));
    } else {
      setStatus('waiting_user');
      setFeedback(buildFeedback('waiting_user'));
    }
  }, [chess, opening, isUserMove]);

  // Run reset on mount and opening change
  useEffect(() => { reset(); }, [opening.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show hint: highlight the target square of the expected move
  const handleHint = () => {
    if (currentMoveIndex >= opening.moves.length) return;
    const expectedSan = opening.moves[currentMoveIndex].san;
    // Make the move on a temp board to get the target square
    const tmp = new Chess(chess.fen());
    const moveResult = tmp.move(expectedSan);
    if (moveResult) {
      setHintSquares({
        [moveResult.to]: {
          background: 'rgba(88, 166, 255, 0.5)',
          borderRadius: '50%',
        },
      });
    }
    setShowHint(true);
  };

  // Handle user drop
  const onPieceDrop = useCallback(({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
    if (status === 'complete' || status === 'waiting_opponent') return false;
    if (currentMoveIndex >= opening.moves.length) return false;
    if (!isUserMove(currentMoveIndex)) return false;
    if (!targetSquare) return false;

    const expectedSan = opening.moves[currentMoveIndex].san;

    // Try the move
    let moveResult;
    try {
      moveResult = chess.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
    } catch {
      setStatus('wrong');
      setFeedback(buildFeedback('wrong'));
      setWrongCount(w => w + 1);
      return false;
    }

    if (!moveResult) {
      setStatus('wrong');
      setFeedback(buildFeedback('wrong'));
      setWrongCount(w => w + 1);
      return false;
    }

    // Check if move matches expected opening move
    // Compare SAN (normalize promotion suffix)
    const playedSan = moveResult.san;
    const matchesOpening =
      playedSan === expectedSan ||
      playedSan.replace(/[+#]/, '') === expectedSan.replace(/[+#]/, '');

    setFen(chess.fen());
    setHintSquares({});
    setShowHint(false);

    if (!matchesOpening) {
      // Valid chess move but off-opening
      setStatus('off_opening');
      setFeedback(buildFeedback('off_opening', playedSan));
      setCorrectCount(c => c + 1); // still count as progress attempt
      return true;
    }

    // Correct!
    setCorrectCount(c => c + 1);
    const nextIdx = currentMoveIndex + 1;
    setCurrentMoveIndex(nextIdx);
    setStatus('correct');
    setFeedback(buildFeedback('correct', playedSan));

    // Check if opening is complete
    if (nextIdx >= opening.moves.length) {
      setStatus('complete');
      setFeedback(buildFeedback('complete'));
      if (!savedRef.current) {
        savedRef.current = true;
        const prog = saveSession(opening.id);
        setSessions(prog.sessions);
      }
      return true;
    }

    // Next move is opponent's — auto-play after short delay
    if (!isUserMove(nextIdx)) {
      setStatus('waiting_opponent');
      setFeedback(buildFeedback('waiting_opponent'));
      setTimeout(() => {
        const opponentSan = opening.moves[nextIdx].san;
        chess.move(opponentSan);
        setFen(chess.fen());
        const afterOpponent = nextIdx + 1;
        setCurrentMoveIndex(afterOpponent);

        if (afterOpponent >= opening.moves.length) {
          setStatus('complete');
          setFeedback(buildFeedback('complete'));
          if (!savedRef.current) {
            savedRef.current = true;
            const prog = saveSession(opening.id);
            setSessions(prog.sessions);
          }
        } else {
          setStatus('waiting_user');
          setFeedback(buildFeedback('waiting_user'));
        }
      }, 600);
    } else {
      setStatus('waiting_user');
      setFeedback(buildFeedback('waiting_user'));
    }

    return true;
  }, [chess, currentMoveIndex, opening, isUserMove, status]);

  // Calculate total user moves for progress
  const totalUserMoves = opening.moves.filter((_, i) => isUserMove(i)).length;
  const userMovesPlayed = Array.from({ length: currentMoveIndex }, (_, i) => i)
    .filter(i => isUserMove(i)).length;
  const progressPct = totalUserMoves > 0 ? Math.round((userMovesPlayed / totalUserMoves) * 100) : 0;

  const feedbackClass =
    status === 'correct' ? 'feedback-correct' :
    status === 'off_opening' ? 'feedback-off' :
    status === 'wrong' ? 'feedback-wrong' :
    status === 'complete' ? 'feedback-complete' :
    'feedback-idle';

  const feedbackTitleClass =
    status === 'correct' ? 'correct' :
    status === 'off_opening' ? 'off' :
    status === 'wrong' ? 'wrong' :
    status === 'complete' ? 'complete' :
    'idle';

  return (
    <div className="training">
      {/* ── Left: Board ── */}
      <div className="training-board-col">
        <Chessboard
          options={{
            id: 'training-board',
            position: fen,
            onPieceDrop,
            boardOrientation,
            allowDragging: status !== 'complete' && status !== 'waiting_opponent',
            boardStyle: {
              width: '440px',
              borderRadius: '12px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            },
            darkSquareStyle: { backgroundColor: '#4a7c59' },
            lightSquareStyle: { backgroundColor: '#d4e7c5' },
            squareStyles: hintSquares,
          }}
        />

        {/* Training controls */}
        <div className="training-controls">
          <button
            className="btn-hint"
            onClick={handleHint}
            disabled={status === 'complete' || status === 'waiting_opponent' || showHint}
            id="btn-hint"
          >
            💡 Hint
          </button>
          <button className="btn-reset" onClick={reset} id="btn-reset">
            ↺ Reset
          </button>
          <button className="btn-secondary" onClick={onBack}>
            ← Study
          </button>
        </div>
      </div>

      {/* ── Right: Info ── */}
      <div className="training-info-col">
        {/* Opening info */}
        <div className="training-opening-info">
          <div className="training-opening-name">{opening.name}</div>
          <div className="training-opening-sub">
            <span>{opening.eco}</span>
            <span>·</span>
            <span className="training-playing-as">
              {opening.color === 'white' ? '♔ Playing as White' : '♚ Playing as Black'}
            </span>
          </div>
        </div>

        {/* Feedback panel */}
        <div className={`feedback-panel`}>
          <div className={`feedback-inner ${feedbackClass}`}>
            <span className="feedback-icon">{feedback.icon}</span>
            <div className="feedback-text">
              <div className={`feedback-title ${feedbackTitleClass}`}>{feedback.title}</div>
              <div className="feedback-detail">
                {status === 'waiting_opponent' ? (
                  <span>
                    Opponent is playing{' '}
                    <span className="thinking-dots">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </span>
                  </span>
                ) : feedback.detail}
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">Opening Progress</span>
            <span className="progress-count">{userMovesPlayed} / {totalUserMoves} moves</span>
          </div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="progress-moves" style={{ marginTop: '0.75rem' }}>
            {opening.moves.map((_, i) => {
              if (!isUserMove(i)) return null;
              const isDone = i < currentMoveIndex;
              const isCurrent = i === currentMoveIndex;
              return (
                <div
                  key={i}
                  className={`progress-move-dot ${isDone ? 'done' : ''} ${isCurrent && status !== 'complete' ? 'current' : ''}`}
                  title={opening.moves[i].san}
                />
              );
            })}
          </div>
        </div>

        {/* Session stats */}
        <div className="session-stats">
          <div className="session-stats-title">Session Stats</div>
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-box-value green">{correctCount}</div>
              <div className="stat-box-label">Correct</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value" style={{ color: 'var(--accent-red)' }}>{wrongCount}</div>
              <div className="stat-box-label">Mistakes</div>
            </div>
            <div className="stat-box">
              <div className="stat-box-value gold">{sessions}</div>
              <div className="stat-box-label">Sessions</div>
            </div>
          </div>
        </div>

        {/* Move list */}
        <MoveList
          opening={opening}
          currentMoveIndex={currentMoveIndex}
        />

        {/* Complete action */}
        {status === 'complete' && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" onClick={reset} id="btn-train-again">
              🔄 Train Again
            </button>
            <button className="btn-secondary" onClick={onBack}>
              📖 Back to Study
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
