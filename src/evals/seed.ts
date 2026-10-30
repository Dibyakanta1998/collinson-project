import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Mastra } from '@mastra/core/mastra';

import { claimInputSchema } from '@/domain/types';

import { loadEvalCases } from './cases';
import { evalGroundTruthSchema, MUST_PASS_SCORER_IDS } from './types';

const GOLD_NAME = 'claimlens-e2e-gold';
const SHADOW_NAME = 'claimlens-live-shadow';
const scorerIds = [...MUST_PASS_SCORER_IDS];

export async function seedMastraDatasets(mastra: Mastra) {
  const gold = await getOrCreateDataset(mastra, GOLD_NAME, 'ClaimLens e2e gold — binary trajectory labels');
  const shadow = await getOrCreateDataset(mastra, SHADOW_NAME, 'Unlabeled live-shadow paraphrases');
  return {
    goldId: gold.id,
    shadowId: shadow.id,
    goldAdded: await addGoldItems(gold),
    shadowAdded: await addShadowItems(shadow),
  };
}

async function getOrCreateDataset(mastra: Mastra, name: string, description: string) {
  const listed = await mastra.datasets.list({
    perPage: false,
    filters: { name },
  });
  const existing = listed.datasets.find((dataset) => dataset.name === name);
  if (existing) return mastra.datasets.get({ id: existing.id });

  return mastra.datasets.create({
    id: name,
    name,
    description,
    inputSchema: claimInputSchema,
    ...(name === GOLD_NAME ? { groundTruthSchema: evalGroundTruthSchema } : {}),
    targetType: 'workflow',
    targetIds: ['claim-triage-eval'],
    scorerIds: name === GOLD_NAME ? scorerIds : [],
  });
}

async function addGoldItems(dataset: Awaited<ReturnType<Mastra['datasets']['create']>>) {
  const cases = await loadEvalCases();
  const known = await listedSourceIds(dataset);
  const fresh = cases.filter((evalCase) => !known.has(evalCase.id));
  if (fresh.length === 0) return 0;

  await dataset.addItems({
    items: fresh.map((evalCase) => ({
      externalId: evalCase.id,
      input: evalCase.input,
      groundTruth: evalCase.expected,
      scorerIds,
      metadata: {
        sourceCaseId: evalCase.id,
        sourceFile: `evals/cases/${evalCase.id}.json`,
      },
    })),
  });
  return fresh.length;
}

async function addShadowItems(dataset: Awaited<ReturnType<Mastra['datasets']['create']>>) {
  const items = await loadShadowCases();
  const known = await listedSourceIds(dataset);
  const fresh = items.filter((item) => !known.has(item.id));
  if (fresh.length === 0) return 0;

  await dataset.addItems({
    items: fresh.map((item) => ({
      externalId: item.id,
      input: item.input,
      scorerIds: [],
      metadata: { sourceCaseId: item.id, sourceFile: `evals/shadow/${item.id}.json` },
    })),
  });
  return fresh.length;
}

async function listedSourceIds(dataset: Awaited<ReturnType<Mastra['datasets']['create']>>) {
  const page = await dataset.listItems({ page: 0, perPage: 100 });
  const items = Array.isArray(page) ? page : page.items;
  return new Set(
    items.flatMap((item) => {
      const sourceId = (item.metadata as { sourceCaseId?: string } | undefined)?.sourceCaseId;
      return sourceId ? [sourceId] : [];
    }),
  );
}

async function loadShadowCases() {
  const directory = path.join(process.cwd(), 'evals', 'shadow');
  const files = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(files.map(async (name) => {
    const parsed = JSON.parse(await readFile(path.join(directory, name), 'utf8')) as {
      id: string;
      input: unknown;
    };
    return { id: parsed.id, input: claimInputSchema.parse(parsed.input) };
  }));
}
