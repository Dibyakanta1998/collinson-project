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
    let unsubscribe = () => {};
    try {
      const created = await createClaim(parsed.data);
      unsubscribe = subscribeToClaimEvents(created.id, (event) => {
        setEvents((current) => [...current, event]);
        if (event.type === 'approval_required' || event.type === 'completed' || event.type === 'error') {
          void getClaim(created.id).then(setClaim);
        }
      });
      setClaim(await waitForClaim(created.id));
    } catch (error) {
      unsubscribe();
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
        <div className={styles.stack}>
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

const TERMINAL_STATUSES = ['suspended', 'failed', 'approved', 'declined', 'changes_requested'];

async function waitForClaim(id: string) {
  const deadline = Date.now() + 70_000;
  while (Date.now() < deadline) {
    const claim = await getClaim(id);
    if (TERMINAL_STATUSES.includes(claim.status)) return claim;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return getClaim(id);
}
