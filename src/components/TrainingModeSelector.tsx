import type { FC } from 'react';
import type { TrainingMode } from '../types';

interface Props {
  selected: TrainingMode;
  onChange: (mode: TrainingMode) => void;
  onStart: () => void;
}

const MODE_META: Array<{ mode: TrainingMode; title: string; description: string }> = [
  {
    mode: 'classical',
    title: 'Classical',
    description: 'Opponent only chooses main-line moves from the repertoire.',
  },
  {
    mode: 'mixed',
    title: 'Mixed',
    description: 'Opponent can choose both main lines and common sidelines.',
  },
  {
    mode: 'deviation',
    title: 'Deviation',
    description: 'Opponent can also throw in offbeat moves and provoke you early.',
  },
];

export const TrainingModeSelector: FC<Props> = ({ selected, onChange, onStart }) => {
  return (
    <div className="trainer-modes">
      <div className="browser-header">
        <h1 className="browser-title">Choose Training Mode</h1>
        <p className="browser-subtitle">
          Pick how much theory chaos you want from the opponent.
        </p>
      </div>

      <div className="trainer-mode-grid">
        {MODE_META.map((item) => (
          <button
            key={item.mode}
            className={`mode-card ${selected === item.mode ? 'selected' : ''}`}
            onClick={() => onChange(item.mode)}
            type="button"
          >
            <div className="mode-card-title">{item.title}</div>
            <div className="mode-card-desc">{item.description}</div>
          </button>
        ))}
      </div>

      <div className="trainer-toolbar">
        <button className="btn-primary" onClick={onStart} type="button">
          Start Training →
        </button>
      </div>
    </div>
  );
};
