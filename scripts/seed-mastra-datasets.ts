import { mastra } from '../src/mastra/eval-runtime';
import { seedMastraDatasets } from '../src/evals/seed';

const result = await seedMastraDatasets(mastra);
console.log(
  `Seeded gold=${result.goldId} (+${result.goldAdded}) shadow=${result.shadowId} (+${result.shadowAdded})`,
);
