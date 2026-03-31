import type { FC } from 'react';
import type { Opening } from '../types';

interface Props {
  opening: Opening;
  currentMoveIndex: number; // index into opening.moves array
  highlightIndex?: number;  // optional highlight (for study mode)
}

export const MoveList: FC<Props> = ({ opening, currentMoveIndex, highlightIndex }) => {
  // Group moves into pairs: [white, black]
  const pairs: Array<{ white?: { san: string; index: number; isKey?: boolean }; black?: { san: string; index: number; isKey?: boolean } }> = [];

  for (let i = 0; i < opening.moves.length; i += 2) {
    pairs.push({
      white: { san: opening.moves[i].san, index: i, isKey: opening.moves[i].isKey },
      black: opening.moves[i + 1]
        ? { san: opening.moves[i + 1].san, index: i + 1, isKey: opening.moves[i + 1].isKey }
        : undefined,
    });
  }

  const activeComment = highlightIndex !== undefined
    ? opening.moves[highlightIndex]?.comment
    : currentMoveIndex > 0
      ? opening.moves[currentMoveIndex - 1]?.comment
      : undefined;

  const displayActive = highlightIndex ?? (currentMoveIndex - 1);

  return (
    <div className="move-list">
      <div className="move-list-header">
        <span>♟</span>
        <span>Move List</span>
      </div>

      <div className="move-list-body">
        {pairs.map((pair, pairIdx) => (
          <div key={pairIdx} className="move-pair">
            <span className="move-number">{pairIdx + 1}.</span>

            {/* White move */}
            {pair.white && (
              <span
                className={[
                  'move-cell',
                  pair.white.index === displayActive ? 'active' : '',
                  pair.white.index < currentMoveIndex ? 'played' : '',
                  pair.white.isKey ? 'key-move' : '',
                ].join(' ').trim()}
              >
                {pair.white.san}
              </span>
            )}

            {/* Black move */}
            {pair.black ? (
              <span
                className={[
                  'move-cell',
                  pair.black.index === displayActive ? 'active' : '',
                  pair.black.index < currentMoveIndex ? 'played' : '',
                  pair.black.isKey ? 'key-move' : '',
                ].join(' ').trim()}
              >
                {pair.black.san}
              </span>
            ) : <span />}
          </div>
        ))}
      </div>

      {activeComment && (
        <div style={{ padding: '0.75rem' }}>
          <div className="move-comment">{activeComment}</div>
        </div>
      )}
    </div>
  );
};
