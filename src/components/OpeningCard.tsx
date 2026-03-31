import type { FC } from 'react';
import type { Opening } from '../types';
import { getProgress } from '../utils/progress';

interface Props {
  opening: Opening;
  onStudy: (opening: Opening) => void;
  onTrain: (opening: Opening) => void;
}

const difficultyLabel: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const OpeningCard: FC<Props> = ({ opening, onStudy, onTrain }) => {
  const progress = getProgress()[opening.id];
  const userMoveCount = opening.moves.filter((_, i) =>
    opening.color === 'white' ? i % 2 === 0 : i % 2 === 1
  ).length;

  return (
    <div className="opening-card" onClick={() => onStudy(opening)}>
      <div className="card-top">
        <span className="card-eco">{opening.eco}</span>
        <span className={`card-difficulty difficulty-${opening.difficulty}`}>
          {difficultyLabel[opening.difficulty]}
        </span>
      </div>

      <div className="card-name">{opening.name}</div>
      <div className="card-category">{opening.category}</div>
      <div className="card-desc">{opening.description}</div>

      {progress && (
        <div className="card-progress">
          <span>✓</span>
          <span>{progress.sessions} session{progress.sessions !== 1 ? 's' : ''} practiced</span>
        </div>
      )}

      <div className="card-footer">
        <span className="card-moves-count">
          {userMoveCount} move{userMoveCount !== 1 ? 's' : ''} to learn
        </span>
        <div className="card-actions" onClick={e => e.stopPropagation()}>
          <button className="card-btn" onClick={() => onStudy(opening)}>
            📖 Study
          </button>
          <button className="card-btn primary" onClick={() => onTrain(opening)}>
            🎯 Train
          </button>
        </div>
      </div>
    </div>
  );
};
