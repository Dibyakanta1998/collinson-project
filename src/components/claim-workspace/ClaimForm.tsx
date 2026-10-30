import { coveredExample, missingReceiptsExample } from '@/content/examples';
import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { ClaimInput } from '@/domain/types';
import { evidenceTypeSchema } from '@/domain/types';

import styles from './claim-workspace.module.scss';

interface ClaimFormProps {
  value: ClaimInput;
  disabled: boolean;
  errors: string[];
  onChange: (value: ClaimInput) => void;
  onSubmit: () => void;
}

const reasons = ['airline_delay', 'misrouting', 'unknown', 'other'] as const;

export function ClaimForm({ value, disabled, errors, onChange, onSubmit }: ClaimFormProps) {
  const toggleEvidence = (item: ClaimInput['evidence'][number]) => {
    const evidence = value.evidence.includes(item)
      ? value.evidence.filter((entry) => entry !== item)
      : [...value.evidence, item];
    onChange({ ...value, evidence });
  };

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      noValidate
    >
      {errors.length > 0 ? (
        <div className={styles.errorSummary} role="alert" tabIndex={-1} id="claim-error-summary">
          <strong>{copy.errorTitle}</strong>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <fieldset className={styles.form}>
        <legend className={styles.label}>{copy.formLegend}</legend>
        <label className={styles.field} htmlFor="policyNumber">
          <span className={styles.label}>{copy.policyNumber}</span>
          <input
            id="policyNumber"
            className={styles.input}
            value={value.policyNumber}
            onChange={(event) => onChange({ ...value, policyNumber: event.target.value })}
            autoComplete="off"
            required
          />
        </label>
        <label className={styles.field} htmlFor="incidentDate">
          <span className={styles.label}>{copy.incidentDate}</span>
          <input
            id="incidentDate"
            className={styles.input}
            type="date"
            value={value.incidentDate}
            onChange={(event) => onChange({ ...value, incidentDate: event.target.value })}
            required
          />
        </label>
        <label className={styles.field} htmlFor="delayHours">
          <span className={styles.label}>{copy.delayHours}</span>
          <input
            id="delayHours"
            className={styles.input}
            type="number"
            min={0}
            max={720}
            value={value.delayHours}
            onChange={(event) => onChange({
              ...value,
              delayHours: Number(event.target.value),
            })}
            required
          />
        </label>
        <label className={styles.field} htmlFor="reason">
          <span className={styles.label}>{copy.reason}</span>
          <select
            id="reason"
            className={styles.select}
            value={value.reason}
            onChange={(event) => onChange({
              ...value,
              reason: event.target.value as ClaimInput['reason'],
            })}
          >
            {reasons.map((reason) => (
              <option key={reason} value={reason}>{copy.reasons[reason]}</option>
            ))}
          </select>
        </label>
        <fieldset className={styles.field}>
          <legend className={styles.label}>{copy.evidence}</legend>
          <div className={styles.checkboxList}>
            {evidenceTypeSchema.options.map((item) => (
              <label key={item} className={styles.checkbox} htmlFor={item}>
                <input
                  id={item}
                  type="checkbox"
                  checked={value.evidence.includes(item)}
                  onChange={() => toggleEvidence(item)}
                />
                {copy.evidenceLabels[item]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className={styles.field} htmlFor="notes">
          <span className={styles.label}>{copy.notes}</span>
          <textarea
            id="notes"
            className={styles.textarea}
            value={value.notes ?? ''}
            onChange={(event) => onChange({ ...value, notes: event.target.value })}
          />
        </label>
      </fieldset>

      <div className={styles.exampleRow}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onChange(coveredExample)}
        >
          {copy.loadCovered}
        </button>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => onChange(missingReceiptsExample)}
        >
          {copy.loadMissing}
        </button>
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={disabled}>
          {disabled ? copy.submitting : copy.submit}
        </button>
      </div>
    </form>
  );
}
