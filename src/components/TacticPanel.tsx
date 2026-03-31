import { useState } from 'react';
import type { FC } from 'react';
import type { Tactic, TacticStatus } from '../types';

interface Props {
  tactic: Tactic | null;
  status: TacticStatus;
  onSkip: () => void;
}

export const TacticPanel: FC<Props> = ({ tactic, status, onSkip }) => {
  const [showHint, setShowHint] = useState(false);

  if (!tactic || status === 'hidden') {
    return null;
  }

  return (
    <div className="tactic-panel">
      <div className="tactic-header">
        <span className="detail-eco-badge">Tactic available</span>
        <span className="trainer-line-count">{tactic.difficulty}</span>
      </div>
      <div className="tactic-themes">
        {tactic.theme.map((theme) => (
          <span key={theme} className="tactic-theme">{theme}</span>
        ))}
      </div>
      {showHint && <div className="tactic-hint">{tactic.hint}</div>}
      {status === 'solved' && <div className="tactic-solved">Solved. Good tactical awareness.</div>}
      <div className="trainer-toolbar">
        <button className="btn-secondary" onClick={() => setShowHint((value) => !value)} type="button">
          {showHint ? 'Hide hint' : 'Show hint'}
        </button>
        <button className="btn-secondary" onClick={onSkip} type="button">
          Skip tactic
        </button>
      </div>
    </div>
  );
};
