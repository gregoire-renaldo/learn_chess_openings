import { Chess } from 'chess.js';
import type { FC } from 'react';
import { uciToSan } from '../lib/fenUtils';

interface Props {
  history: string[];
}

export const MoveHistory: FC<Props> = ({ history }) => {
  const chess = new Chess();
  const moves = history.map((uci) => {
    const san = uciToSan(chess, uci) ?? uci;
    chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.slice(4, 5) || undefined });
    return san;
  });

  const pairs: Array<{ white?: string; black?: string }> = [];
  for (let index = 0; index < moves.length; index += 2) {
    pairs.push({ white: moves[index], black: moves[index + 1] });
  }

  return (
    <div className="move-history">
      <div className="move-list-header">
        <span>♟</span>
        <span>History</span>
      </div>
      <div className="move-list-body">
        {pairs.map((pair, index) => (
          <div key={`${pair.white ?? ''}-${pair.black ?? ''}-${index}`} className="move-pair">
            <span className="move-number">{index + 1}.</span>
            <span className="move-cell played">{pair.white ?? ''}</span>
            <span className="move-cell played">{pair.black ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
