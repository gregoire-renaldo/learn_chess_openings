import { useMemo, useState } from 'react';
import openingsData from '../data/openings.json';
import type { FC } from 'react';
import type { OpeningEntry, OpeningSide } from '../types';

const openings = openingsData as OpeningEntry[];

interface Props {
  side: OpeningSide;
  onSelect: (entry: OpeningEntry) => void;
}

export const OpeningSelector: FC<Props> = ({ side, onSelect }) => {
  const [search, setSearch] = useState('');

  const filteredOpenings = useMemo(() => {
    return openings.filter((opening) => {
      if (opening.side !== side) {
        return false;
      }

      const query = search.trim().toLowerCase();
      if (!query) {
        return true;
      }

      return opening.name.toLowerCase().includes(query) || opening.eco.toLowerCase().includes(query);
    });
  }, [search, side]);

  return (
    <div className="trainer-selector">
      <div className="browser-header">
        <h1 className="browser-title">Advanced Trainer</h1>
        <p className="browser-subtitle">
          Choose a {side} repertoire and start training from JSON opening lines.
        </p>
      </div>

      <div className="browser-filters trainer-selector-filters">
        <input
          className="search-input"
          type="search"
          placeholder="Search by opening name or ECO"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className="trainer-selector-grid">
        {filteredOpenings.map((opening) => (
          <button
            key={opening.id}
            className="opening-card trainer-selector-card"
            onClick={() => onSelect(opening)}
            type="button"
          >
            <div className="card-top">
              <span className="card-eco">{opening.eco}</span>
              <span className="trainer-line-count">{opening.lines.length} lines</span>
            </div>
            <div className="card-name">{opening.name}</div>
            <div className="card-desc">{opening.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
