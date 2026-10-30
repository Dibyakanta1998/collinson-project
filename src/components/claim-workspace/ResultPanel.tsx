import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { StoredClaim } from '@/server/db/claims-repository';

import styles from './claim-workspace.module.scss';

export function ResultPanel({ claim }: { claim: StoredClaim | null }) {
  const result = claim?.result;
  const classification = result?.classification;
  const badgeClass =
    classification === 'likely_covered' ? styles.covered
      : classification === 'needs_review' ? styles.review
        : claim?.status === 'failed' ? styles.failed
          : styles.running;

  return (
    <section className={styles.panel} aria-labelledby="result-heading">
      <div>
        <h2 id="result-heading">{copy.resultTitle}</h2>
        {claim ? (
          <>
            <span className={`${styles.badge} ${badgeClass}`}>
              {result
                ? copy.classifications[result.classification]
                : copy.statuses[claim.status]}
            </span>
            <p>{copy.statuses[claim.status]}</p>
          </>
        ) : null}
      </div>
      {claim?.lastError ? <p role="alert">{claim.lastError.message}</p> : null}
      {result ? (
        <>
          <p>{result.summary}</p>
          <section aria-labelledby="evidence-heading">
            <h3 id="evidence-heading">{copy.evidenceTitle}</h3>
            <ul>
              {result.nextActions.map((action) => (
                <li key={action}>{action}</li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="citations-heading">
            <h3 id="citations-heading">{copy.citationsTitle}</h3>
            {result.citations.length === 0 ? (
              <p className={styles.muted}>No clause cited.</p>
            ) : (
              <ul>
                {result.citations.map((citation) => (
                  <li key={`${citation.clause}-${citation.excerpt}`}>
                    <strong>{citation.clause}</strong>: {citation.excerpt}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <p className={styles.muted}>{copy.emptyResult}</p>
      )}
    </section>
  );
}
