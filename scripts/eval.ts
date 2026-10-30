import { runEvaluations, writeEvalReport } from '../src/evals/run';

const results = await runEvaluations();
const report = await writeEvalReport(results);

for (const result of results) {
  const mark = result.passed ? 'pass' : 'fail';
  console.log(`${mark} ${result.id}`);
  for (const score of result.scores.filter((item) => !item.passed)) {
    console.log(`  - ${score.name}: ${score.detail}`);
  }
}

if (!report.passed) process.exit(1);
console.log(`Wrote evals/output/report.json (${results.length} cases).`);
