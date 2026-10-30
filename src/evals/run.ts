import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { ClaimFailure } from '@/domain/failures';
import type { ClaimEvent } from '@/domain/events';
import type { TriageResult } from '@/domain/types';
import { DeterministicClaimRunner } from '@/server/claims/deterministic-runner';

import { scoreTrajectory } from './scorers';
import { evalCaseSchema, type EvalCase, type EvalResult } from './types';

export async function loadEvalCases(directory = path.join(process.cwd(), 'evals', 'cases')) {
  const files = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(files.map(async (name) => (
    evalCaseSchema.parse(JSON.parse(await readFile(path.join(directory, name), 'utf8')))
  )));
}

export async function runEvaluations(cases?: EvalCase[]): Promise<EvalResult[]> {
  const evalCases = cases ?? await loadEvalCases();
  const results: EvalResult[] = [];

  for (const evalCase of evalCases) {
    const events: ClaimEvent[] = [];
    let result: TriageResult | undefined;
    let failureCode: string | undefined;
    try {
      const outcome = await new DeterministicClaimRunner().run({
        claimId: evalCase.id,
        input: evalCase.input,
        abortSignal: new AbortController().signal,
        emit: async (event) => {
          events.push(event);
        },
      });
      result = outcome.result;
    } catch (error) {
      failureCode = error instanceof ClaimFailure ? error.code : 'internal_failure';
    }

    const scores = scoreTrajectory(evalCase, events, result, failureCode);
    results.push({
      id: evalCase.id,
      passed: scores.every((item) => item.passed),
      scores,
    });
  }

  return results;
}

export async function writeEvalReport(results: EvalResult[]) {
  const outputDir = path.join(process.cwd(), 'evals', 'output');
  await mkdir(outputDir, { recursive: true });
  const report = {
    passed: results.every((result) => result.passed),
    results,
  };
  await writeFile(
    path.join(outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}
