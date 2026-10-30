import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { mastra } from '@/mastra/eval-runtime';
import { MUST_PASS_SCORER_IDS } from '@/evals/types';

import { seedMastraDatasets } from './seed';
import type { EvalResult } from './types';

const LIVE_SKIP = new Set(['malformed', 'mcp-failure']);

export { loadEvalCases } from './cases';

export async function runEvaluations(options?: { live?: boolean }): Promise<EvalResult[]> {
  const seeded = await seedMastraDatasets(mastra);
  const dataset = await mastra.datasets.get({ id: seeded.goldId });
  const summary = await dataset.startExperiment({
    name: options?.live ? 'claimlens-gold-live' : 'claimlens-gold-fake',
    targetType: 'workflow',
    targetId: 'claim-triage-eval',
    scorers: [...MUST_PASS_SCORER_IDS],
    maxConcurrency: 1,
    itemTimeout: options?.live ? 60_000 : 15_000,
  });

  return summary.results.flatMap((item) => {
    const sourceId = sourceCaseId(item);
    if (options?.live && LIVE_SKIP.has(sourceId)) return [];
    const scores = item.scores.map((score) => ({
      name: score.scorerId,
      passed: score.score === 1,
      detail: score.reason ?? score.error ?? `score=${score.score}`,
    }));
    return [{
      id: sourceId,
      passed: item.error === null && scores.length > 0 && scores.every((score) => score.passed),
      scores,
    }];
  });
}

export async function writeEvalReport(results: EvalResult[], runner: 'fake' | 'live' = 'fake') {
  const outputDir = path.join(process.cwd(), 'evals', 'output');
  await mkdir(outputDir, { recursive: true });
  const report = {
    runner,
    passed: results.every((result) => result.passed),
    results: results.map((result) => ({
      id: result.id,
      passed: result.passed,
      mustPass: result.scores,
      diagnostic: [],
    })),
  };
  await writeFile(
    path.join(outputDir, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

function sourceCaseId(item: { metadata?: Record<string, unknown>; itemId: string }) {
  const source = item.metadata?.sourceCaseId;
  return typeof source === 'string' ? source : item.itemId;
}
