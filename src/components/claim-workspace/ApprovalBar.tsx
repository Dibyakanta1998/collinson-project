import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { ApprovalDecision } from '@/domain/types';

import styles from './claim-workspace.module.scss';

interface ApprovalBarProps {
  note: string;
  disabled: boolean;
  onNoteChange: (note: string) => void;
  onDecide: (decision: ApprovalDecision['decision']) => void;
}

export function ApprovalBar({ note, disabled, onNoteChange, onDecide }: ApprovalBarProps) {
  return (
    <section className={styles.panel} aria-labelledby="approval-heading">
      <h2 id="approval-heading">{copy.approvalTitle}</h2>
      <label className={styles.field} htmlFor="approval-note">
        <span className={styles.label}>{copy.approvalNote}</span>
        <textarea
          id="approval-note"
          className={styles.textarea}
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          disabled={disabled}
        />
      </label>
      <div className={styles.approvalActions}>
        <button
          type="button"
          className={`${styles.button} ${styles.success}`}
          disabled={disabled}
          onClick={() => onDecide('approve')}
        >
          {copy.approve}
        </button>
        <button
          type="button"
          className={styles.secondary}
          disabled={disabled}
          onClick={() => onDecide('request_changes')}
        >
          {copy.requestChanges}
        </button>
        <button
          type="button"
          className={`${styles.button} ${styles.danger}`}
          disabled={disabled}
          onClick={() => onDecide('decline')}
        >
          {copy.decline}
        </button>
      </div>
    </section>
  );
}
