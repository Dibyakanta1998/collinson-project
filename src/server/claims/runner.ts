import type { ClaimEvent } from '@/domain/events';
import type { ClaimInput, TriageResult } from '@/domain/types';

export interface ClaimRunContext {
  claimId: string;
  input: ClaimInput;
  abortSignal: AbortSignal;
  emit: (event: ClaimEvent) => Promise<void>;
}

export interface ClaimRunOutcome {
  runId: string;
  result?: TriageResult;
}

export interface ClaimRunner {
  run(context: ClaimRunContext): Promise<ClaimRunOutcome>;
  resume?(runId: string, note: string): Promise<void>;
}
