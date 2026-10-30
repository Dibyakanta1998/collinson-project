'use client';

import { useMemo, useState } from 'react';

import { coveredExample } from '@/content/examples';
import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { ClaimEvent } from '@/domain/events';
import { claimInputSchema, type ApprovalDecision, type ClaimInput } from '@/domain/types';
import {
  createClaim,
  getClaim,
  submitApproval,
  subscribeToClaimEvents,
} from '@/lib/claims-api';
import type { StoredClaim } from '@/server/db/claims-repository';

import { ApprovalBar } from './ApprovalBar';
import { ClaimForm } from './ClaimForm';
import { ResultPanel } from './ResultPanel';
import { TracePanel } from './TracePanel';
import styles from './claim-workspace.module.scss';

export function ClaimWorkspace() {
  const [input, setInput] = useState<ClaimInput>(coveredExample);
  const [errors, setErrors] = useState<string[]>([]);
  const [claim, setClaim] = useState<StoredClaim | null>(null);
  const [events, setEvents] = useState<ClaimEvent[]>([]);
  const [note, setNote] = useState('Coverage and evidence reviewed.');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const awaitingApproval = claim?.status === 'suspended';
  const running = busy || claim?.status === 'running' || claim?.status === 'received';

  const uniqueEvents = useMemo(
    () => events.filter((event, index) => (
      events.findIndex((candidate) => (
        candidate.type === event.type && candidate.occurredAt === event.occurredAt
      )) === index
    )),
    [events],
  );

  const runTriage = async () => {
    const parsed = claimInputSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((issue) => issue.message));
      document.getElementById('claim-error-summary')?.focus();
      return;
    }

    setErrors([]);
    setBusy(true);
    setMessage(null);
    setEvents([]);
    try {
      const created = await createClaim(parsed.data);
      const unsubscribe = subscribeToClaimEvents(created.id, (event) => {
        setEvents((current) => [...current, event]);
      });
      const latest = await waitForClaim(created.id);
      unsubscribe();
      setClaim(latest);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Triage failed.');
    } finally {
      setBusy(false);
    }
  };

  const decide = async (decision: ApprovalDecision['decision']) => {
    if (!claim) return;
    setBusy(true);
    setMessage(null);
    try {
      setClaim(await submitApproval(claim.id, { decision, note }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Approval failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1 className={styles.title}>{copy.title}</h1>
        <p className={styles.subtitle}>{copy.subtitle}</p>
        <p className={styles.disclaimer}>{copy.disclaimer}</p>
        {message ? <p role="alert">{message}</p> : null}
      </header>
      <div className={styles.grid}>
        <div className={styles.grid}>
          <section className={styles.panel}>
            <ClaimForm
              value={input}
              disabled={running}
              errors={errors}
              onChange={setInput}
              onSubmit={() => void runTriage()}
            />
          </section>
          <ResultPanel claim={claim} />
          {awaitingApproval ? (
            <ApprovalBar
              note={note}
              disabled={busy}
              onNoteChange={setNote}
              onDecide={(decision) => void decide(decision)}
            />
          ) : null}
        </div>
        <TracePanel events={uniqueEvents} />
      </div>
    </div>
  );
}

async function waitForClaim(id: string) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const claim = await getClaim(id);
    if (['suspended', 'failed', 'approved', 'declined', 'changes_requested'].includes(claim.status)) {
      return claim;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return getClaim(id);
}
