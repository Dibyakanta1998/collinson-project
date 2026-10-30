import type { CoverageFinding, EvidenceFinding, TriageResult } from './types';

export function decideTriage(
  coverage: CoverageFinding,
  evidence: EvidenceFinding,
): TriageResult {
  if (coverage.status === 'unavailable' || coverage.status === 'unclear') {
    return {
      classification: 'insufficient_information',
      confidence: coverage.confidence,
      summary: 'Policy coverage could not be verified.',
      nextActions: ['Route the claim to a human reviewer for policy verification.'],
      citations: coverage.citations,
      requiresApproval: true,
    };
  }

  if (coverage.status === 'excluded' || evidence.status === 'incomplete') {
    return {
      classification: 'needs_review',
      confidence: coverage.confidence,
      summary:
        coverage.status === 'excluded'
          ? 'A policy exclusion may apply.'
          : 'Required evidence is missing.',
      nextActions:
        evidence.missing.length > 0
          ? evidence.missing.map((item) => `Provide ${item.replaceAll('_', ' ')}.`)
          : ['Ask a claims handler to review the cited exclusion.'],
      citations: coverage.citations,
      requiresApproval: true,
    };
  }

  return {
    classification: 'likely_covered',
    confidence: coverage.confidence,
    summary: 'The claim appears to meet the policy and evidence requirements.',
    nextActions: ['Submit the provisional result for claims-handler approval.'],
    citations: coverage.citations,
    requiresApproval: true,
  };
}
