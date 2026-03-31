import type { FC } from 'react';
import type { OpeningLine } from '../types';

interface Props {
  line: OpeningLine | null;
}

export const OpeningNotesPanel: FC<Props> = ({ line }) => {
  if (!line) {
    return null;
  }

  return (
    <div className="opening-notes">
      <div className="move-list-header">
        <span>📘</span>
        <span>Opening Notes</span>
      </div>
      <p className="opening-notes-text">{line.explanation}</p>
      <ul className="opening-notes-list">
        {line.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </div>
  );
};
