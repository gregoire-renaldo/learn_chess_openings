import { useState, useCallback } from 'react';
import type { FC } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import type { Opening } from '../types';
import { MoveList } from '../components/MoveList';

interface Props {
  opening: Opening;
  onTrain: () => void;
  onBack: () => void;
}

export const OpeningDetailPage: FC<Props> = ({ opening, onTrain, onBack }) => {
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(chess.fen());
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [highlightIndex, setHighlightIndex] = useState<number | undefined>(undefined);

  const boardOrientation = opening.color === 'black' ? 'black' : 'white';

  const applyMove = useCallback((index: number) => {
    const c = new Chess();
    for (let i = 0; i < index; i++) {
      c.move(opening.moves[i].san);
    }
    setFen(c.fen());
    setCurrentMoveIndex(index);
    setHighlightIndex(index > 0 ? index - 1 : undefined);
  }, [opening]);

  const goForward = () => {
    if (currentMoveIndex < opening.moves.length) {
      applyMove(currentMoveIndex + 1);
    }
  };

  const goBack = () => {
    if (currentMoveIndex > 0) {
      applyMove(currentMoveIndex - 1);
    }
  };

  const goToStart = () => applyMove(0);
  const goToEnd   = () => applyMove(opening.moves.length);

  const currentComment = highlightIndex !== undefined
    ? opening.moves[highlightIndex]?.comment
    : undefined;

  const progressPct = opening.moves.length > 0
    ? Math.round((currentMoveIndex / opening.moves.length) * 100)
    : 0;

  return (
    <div className="detail">
      {/* ── Left: Board ── */}
      <div className="detail-board-col">
        <Chessboard
          options={{
            id: 'study-board',
            position: fen,
            boardOrientation,
            allowDragging: false,
            boardStyle: {
              width: '420px',
              borderRadius: '12px',
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            },
            darkSquareStyle: { backgroundColor: '#4a7c59' },
            lightSquareStyle: { backgroundColor: '#d4e7c5' },
          }}
        />

        {/* Navigation */}
        <div className="board-nav">
          <button className="board-nav-btn" onClick={goToStart} disabled={currentMoveIndex === 0} title="Start">⏮</button>
          <button className="board-nav-btn" onClick={goBack}    disabled={currentMoveIndex === 0} title="Back">◀</button>
          <span style={{ padding: '0 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {currentMoveIndex} / {opening.moves.length}
          </span>
          <button className="board-nav-btn" onClick={goForward} disabled={currentMoveIndex === opening.moves.length} title="Forward">▶</button>
          <button className="board-nav-btn" onClick={goToEnd}   disabled={currentMoveIndex === opening.moves.length} title="End">⏭</button>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%' }}>
          <div className="progress-bar-track">
            <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Right: Info ── */}
      <div className="detail-info-col">
        <div className="detail-header">
          <div className="detail-eco-badge">{opening.eco}</div>
          <h1 className="detail-title">{opening.name}</h1>
          <p className="detail-desc">{opening.description}</p>
        </div>

        {currentComment && (
          <div className="move-comment">
            💡 {currentComment}
          </div>
        )}

        <div className="detail-controls">
          <button className="btn-secondary" onClick={onBack}>← Back</button>
          <button className="btn-primary" onClick={onTrain} id="btn-start-training">
            🎯 Train this opening
          </button>
          <span className="step-counter">
            Move {currentMoveIndex} of {opening.moves.length}
          </span>
        </div>

        <MoveList
          opening={opening}
          currentMoveIndex={currentMoveIndex}
          highlightIndex={highlightIndex}
        />

        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
        }}>
          <span style={{ color: 'var(--accent-gold)', marginRight: '0.4rem' }}>★</span>
          Key moves are marked with a star
        </div>
      </div>
    </div>
  );
};
