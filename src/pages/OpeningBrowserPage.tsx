import { useState } from 'react';
import type { FC } from 'react';
import type { Opening } from '../types';
import { OPENINGS } from '../data/openings';
import { OpeningCard } from '../components/OpeningCard';

interface Props {
  color: 'white' | 'black';
  onStudy: (opening: Opening) => void;
  onTrain: (opening: Opening) => void;
}

const DIFFICULTIES = ['All', 'beginner', 'intermediate', 'advanced'];

export const OpeningBrowserPage: FC<Props> = ({ color, onStudy, onTrain }) => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [difficulty, setDifficulty] = useState('All');

  const filtered = OPENINGS.filter(o => {
    if (o.color !== color) return false;
    if (category !== 'All' && o.category !== category) return false;
    if (difficulty !== 'All' && o.difficulty !== difficulty) return false;
    if (search && !o.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const availableCategories = ['All', ...Array.from(new Set(
    OPENINGS.filter(o => o.color === color).map(o => o.category)
  ))];

  return (
    <div className="browser">
      <div className="browser-header">
        <h1 className="browser-title">
          {color === 'white' ? '♔' : '♚'}{' '}
          {color === 'white' ? 'White' : 'Black'} Openings
        </h1>
        <p className="browser-subtitle">
          {filtered.length} opening{filtered.length !== 1 ? 's' : ''} available · Choose one to study or train
        </p>
      </div>

      <div className="browser-filters">
        <input
          className="search-input"
          type="search"
          placeholder="🔍 Search openings…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          id="search-openings"
        />

        {availableCategories.map(cat => (
          <button
            key={cat}
            className={`filter-btn ${category === cat ? 'active' : ''}`}
            onClick={() => setCategory(cat)}
          >
            {cat}
          </button>
        ))}

        {DIFFICULTIES.map(d => (
          <button
            key={d}
            className={`filter-btn ${difficulty === d ? 'active' : ''}`}
            onClick={() => setDifficulty(d)}
            style={{ textTransform: 'capitalize' }}
          >
            {d === 'All' ? 'All levels' : d}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <div className="empty-state-title">No openings found</div>
          <div className="empty-state-text">Try adjusting your filters or search term.</div>
        </div>
      ) : (
        <div className="openings-grid">
          {filtered.map(opening => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              onStudy={onStudy}
              onTrain={onTrain}
            />
          ))}
        </div>
      )}
    </div>
  );
};
