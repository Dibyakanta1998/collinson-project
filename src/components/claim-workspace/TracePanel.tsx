import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { ClaimEvent } from '@/domain/events';

import styles from './claim-workspace.module.scss';

export function TracePanel({ events }: { events: ClaimEvent[] }) {
  const activity = events.filter((event) => event.type !== 'usage');
  const usageEvents = events.filter((event) => event.type === 'usage');

  return (
    <section className={styles.panel} aria-labelledby="trace-heading">
      <h2 id="trace-heading" className={styles.heading}>{copy.traceTitle}</h2>
      {activity.length === 0 ? (
        <p className={styles.muted}>{copy.emptyTrace}</p>
      ) : (
        <ol className={styles.timeline}>
          {activity.map((event, index) => (
            <li
              key={`${event.type}-${event.occurredAt}-${index}`}
              className={`${styles.event} ${eventToneClass(event)}`}
            >
              {describeEvent(event)}
            </li>
          ))}
        </ol>
      )}
      {usageEvents.length > 0 ? (
        <p className={styles.usage} aria-label={copy.usageTitle}>
          {usageEvents
            .map((event) => `${event.usage.agentId}: ${event.usage.totalTokens} tokens, ${event.usage.latencyMs} ms`)
            .join(' · ')}
        </p>
      ) : null}
    </section>
  );
}

function eventToneClass(event: ClaimEvent) {
  if (event.type === 'error' || (event.type === 'completed' && event.status === 'failed')) {
    return styles.eventBad;
  }
  if (event.type === 'approval_required' || event.type === 'approval_recorded') {
    return styles.eventWarn;
  }
  if (event.type === 'result' || event.type === 'completed') return styles.eventOk;
  return '';
}

function describeEvent(event: ClaimEvent) {
  switch (event.type) {
    case 'run_started':
      return `Run started (${event.runId.slice(0, 8)})`;
    case 'agent_status':
      return `${event.agentId} ${event.status}`;
    case 'tool_call':
      return (
        <>
          {event.agentId} {event.status}{' '}
          <span className={styles.toolId}>{event.toolId}</span>
        </>
      );
    case 'usage':
      return `${event.usage.agentId} used ${event.usage.totalTokens} tokens`;
    case 'result':
      return `Provisional result: ${event.result.classification}`;
    case 'approval_required':
      return event.reason;
    case 'approval_recorded':
      return `Decision recorded: ${event.decision}`;
    case 'error':
      return event.message;
    case 'completed':
      return `Run ${event.status}`;
  }
}
