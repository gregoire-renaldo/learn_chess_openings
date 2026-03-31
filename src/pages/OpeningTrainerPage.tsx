import { useState } from 'react';
import type { FC } from 'react';
import { ChessTrainerBoard } from '../components/ChessTrainerBoard';
import { FeedbackPanel } from '../components/FeedbackPanel';
import { MoveHistory } from '../components/MoveHistory';
import { OpeningNotesPanel } from '../components/OpeningNotesPanel';
import { OpeningSelector } from '../components/OpeningSelector';
import { TacticPanel } from '../components/TacticPanel';
import { TrainingModeSelector } from '../components/TrainingModeSelector';
import { useOpeningTrainer } from '../hooks/useOpeningTrainer';
import type { OpeningSide } from '../types';

interface Props {
  side: OpeningSide;
  onBack: () => void;
}

type TrainerPhase = 'select-opening' | 'select-mode' | 'training';

export const OpeningTrainerPage: FC<Props> = ({ side, onBack }) => {
  const [phase, setPhase] = useState<TrainerPhase>('select-opening');
  const {
    currentLine,
    feedback,
    fen,
    handleUserMove,
    hintSquares,
    matchedTactic,
    moveHistory,
    reset,
    selectMode,
    selectOpening,
    selectedOpening,
    skipTactic,
    showMoveHint,
    startTraining,
    tacticStatus,
    trainingMode,
    undoLastUserMove,
  } = useOpeningTrainer();

  if (phase === 'select-opening') {
    return (
      <div className="trainer-shell">
        <div className="trainer-toolbar">
          <button className="btn-secondary" onClick={onBack} type="button">
            ← Home
          </button>
        </div>
        <OpeningSelector
          side={side}
          onSelect={(opening) => {
            selectOpening(opening);
            setPhase('select-mode');
          }}
        />
      </div>
    );
  }

  if (phase === 'select-mode') {
    return (
      <div className="trainer-shell">
        <div className="trainer-toolbar">
          <button className="btn-secondary" onClick={() => setPhase('select-opening')} type="button">
            ← Openings
          </button>
        </div>
        <TrainingModeSelector
          selected={trainingMode}
          onChange={selectMode}
          onStart={() => {
            startTraining();
            setPhase('training');
          }}
        />
      </div>
    );
  }

  return (
    <div className="trainer-shell">
      <div className="trainer-toolbar">
        <button className="btn-secondary" onClick={() => setPhase('select-mode')} type="button">
          ← Modes
        </button>
        <button className="btn-hint" onClick={showMoveHint} type="button">
          💡 Hint
        </button>
        <button className="btn-secondary" onClick={undoLastUserMove} type="button">
          ◀ Undo
        </button>
        <button className="btn-secondary" onClick={reset} type="button">
          ↺ Reset
        </button>
      </div>

      <div className="trainer-layout">
        <div className="trainer-board-col">
          <div className="detail-header trainer-header-card">
            <div className="detail-eco-badge">{selectedOpening?.eco}</div>
            <h1 className="detail-title trainer-title">{selectedOpening?.name}</h1>
            <p className="detail-desc">{selectedOpening?.description}</p>
          </div>
          <ChessTrainerBoard
            fen={fen}
            orientation={selectedOpening?.side ?? side}
            highlighted={hintSquares}
            onMove={handleUserMove}
          />
          <MoveHistory history={moveHistory} />
        </div>

        <div className="trainer-side-col">
          <FeedbackPanel feedback={feedback} />
          <TacticPanel tactic={matchedTactic} status={tacticStatus} onSkip={skipTactic} />
          <OpeningNotesPanel line={currentLine} />
        </div>
      </div>
    </div>
  );
};
