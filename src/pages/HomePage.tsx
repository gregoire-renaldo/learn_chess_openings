import { useState } from 'react';
import type { FC } from 'react';

interface Props {
  onSelectColor: (color: 'white' | 'black') => void;
  onOpenAdvancedTrainer: (color: 'white' | 'black') => void;
}

export const HomePage: FC<Props> = ({ onSelectColor, onOpenAdvancedTrainer }) => {
  const [selected, setSelected] = useState<'white' | 'black' | null>(null);

  const handleSelect = (color: 'white' | 'black') => {
    setSelected(color);
  };

  const handleGo = () => {
    if (selected) onSelectColor(selected);
  };

  const handleAdvancedGo = () => {
    if (selected) onOpenAdvancedTrainer(selected);
  };

  return (
    <div className="home">
      <div className="home-badge">♟ Chess Openings Trainer</div>

      <h1 className="home-title">
        Master Chess<br />Openings
      </h1>

      <p className="home-subtitle">
        Study and train the most important chess openings. Learn move by move,
        get instant feedback, and build your opening repertoire.
      </p>

      <div className="home-color-picker">
        <div
          className={`color-card white-card ${selected === 'white' ? 'selected' : ''}`}
          onClick={() => handleSelect('white')}
          id="pick-white"
        >
          <div className="color-card-piece">♔</div>
          <div className="color-card-label">Play as White</div>
          <div className="color-card-sub">
            Italian, Scotch, Ruy López,<br />Queen's Gambit, London…
          </div>
        </div>

        <div
          className={`color-card black-card ${selected === 'black' ? 'selected' : ''}`}
          onClick={() => handleSelect('black')}
          id="pick-black"
        >
          <div className="color-card-piece">♚</div>
          <div className="color-card-label">Play as Black</div>
          <div className="color-card-sub">
            Sicilian, French, Caro-Kann,<br />King's Indian, Nimzo-Indian…
          </div>
        </div>
      </div>

      <div className="home-cta-row">
        <button
          className="btn-primary"
          onClick={handleGo}
          disabled={!selected}
          id="btn-browse-openings"
        >
          Browse Openings →
        </button>
        <button
          className="btn-secondary"
          onClick={handleAdvancedGo}
          disabled={!selected}
          id="btn-advanced-trainer"
        >
          Advanced Trainer →
        </button>
      </div>

      <div className="home-stats">
        <div className="stat-item">
          <div className="stat-value">12</div>
          <div className="stat-label">Openings</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">2</div>
          <div className="stat-label">Modes</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">∞</div>
          <div className="stat-label">Practice</div>
        </div>
      </div>
    </div>
  );
};
