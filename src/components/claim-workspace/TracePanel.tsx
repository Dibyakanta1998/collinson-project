import { WORKSPACE_CONTENT as copy } from '@/content/workspace';
import type { ClaimEvent } from '@/domain/events';

import styles from './claim-workspace.module.scss';

export function TracePanel({ events }: { events: ClaimEvent[] }) {
  const usageEvents = events.filter((event) => event.type === 'usage');

  return (
    <section className={styles.panel} aria-labelledby="trace-heading">
      <h2 id="trace-heading">{copy.traceTitle}</h2>
      {events.length === 0 ? (
        <p className={styles.muted}>{copy.emptyTrace}</p>
      ) : (
        <ol className={styles.timeline}>
          {events.map((event, index) => (
            <li key={`${event.type}-${event.occurredAt}-${index}`} className={styles.event}>
              {describeEvent(event)}
            </li>
          ))}
        </ol>
      )}
      {usageEvents.length > 0 ? (
        <section aria-labelledby="usage-heading">
          <h3 id="usage-heading">{copy.usageTitle}</h3>
          <ul>
            {usageEvents.map((event) => (
              <li key={`${event.usage.agentId}-${event.occurredAt}`}>
                {event.usage.agentId}: {event.usage.totalTokens} tokens, {event.usage.latencyMs} ms
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function describeEvent(event: ClaimEvent) {
  switch (event.type) {
    case 'run_started':
      return `Run started (${event.runId.slice(0, 8)})`;
    case 'agent_status':
      return `${event.agentId} ${event.status}`;
    case 'tool_call':
      return `${event.agentId} ${event.status} ${event.toolId}`;
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
