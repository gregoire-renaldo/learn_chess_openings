import type { CSSProperties, FC } from 'react';
import { Chessboard } from 'react-chessboard';
import type { OpeningSide } from '../types';

interface Props {
  fen: string;
  orientation: OpeningSide;
  onMove: (uci: string) => boolean;
  highlighted?: Record<string, CSSProperties>;
  disabled?: boolean;
}

export const ChessTrainerBoard: FC<Props> = ({ fen, orientation, onMove, highlighted = {}, disabled = false }) => {
  return (
    <Chessboard
      options={{
        id: 'advanced-trainer-board',
        position: fen,
        boardOrientation: orientation,
        allowDragging: !disabled,
        onPieceDrop: ({ sourceSquare, targetSquare }) => {
          if (!targetSquare) {
            return false;
          }

          return onMove(`${sourceSquare}${targetSquare}`);
        },
        boardStyle: {
          width: '100%',
          maxWidth: '520px',
          borderRadius: '12px',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        },
        darkSquareStyle: { backgroundColor: '#4a7c59' },
        lightSquareStyle: { backgroundColor: '#d4e7c5' },
        squareStyles: highlighted,
      }}
    />
  );
};
