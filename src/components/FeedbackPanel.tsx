import type { FC } from 'react';
import type { TrainerFeedback } from '../types';

interface Props {
  feedback: TrainerFeedback;
}

function getFeedbackClass(status: TrainerFeedback['status']): string {
  switch (status) {
    case 'correct':
    case 'tactic_solved':
      return 'feedback-correct';
    case 'playable':
    case 'tactic_available':
      return 'feedback-off';
    case 'wrong':
    case 'off_repertoire':
      return 'feedback-wrong';
    case 'complete':
      return 'feedback-complete';
    default:
      return 'feedback-idle';
  }
}

export const FeedbackPanel: FC<Props> = ({ feedback }) => {
  return (
    <div className="feedback-panel">
      <div className={`feedback-inner ${getFeedbackClass(feedback.status)}`}>
        <div className="feedback-text">
          <div className="feedback-title idle">{feedback.message}</div>
          {feedback.note && <div className="feedback-detail">{feedback.note}</div>}
        </div>
      </div>
    </div>
  );
};
