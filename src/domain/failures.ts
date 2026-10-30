import { z } from 'zod';

export const claimFailureCodeSchema = z.enum([
  'invalid_input',
  'model_timeout',
  'malformed_model_output',
  'mcp_unavailable',
  'missing_clause',
  'internal_failure',
]);

export type ClaimFailureCode = z.infer<typeof claimFailureCodeSchema>;

export class ClaimFailure extends Error {
  constructor(
    readonly code: ClaimFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ClaimFailure';
  }
}

export class ClaimConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClaimConflictError';
  }
}
