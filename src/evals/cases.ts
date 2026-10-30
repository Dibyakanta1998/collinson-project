import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { evalCaseSchema, type EvalCase } from './types';

export async function loadEvalCases(directory = path.join(process.cwd(), 'evals', 'cases')): Promise<EvalCase[]> {
  const files = (await readdir(directory)).filter((name) => name.endsWith('.json')).sort();
  return Promise.all(files.map(async (name) => (
    evalCaseSchema.parse(JSON.parse(await readFile(path.join(directory, name), 'utf8')))
  )));
}
