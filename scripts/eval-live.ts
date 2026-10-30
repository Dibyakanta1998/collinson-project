import { runEvaluations, writeEvalReport } from '../src/evals/run';
import { readOllamaConfig } from '../src/mastra/model';

try {
  const config = readOllamaConfig(process.env);
  if (process.env.CLAIMLENS_AGENT_MODE !== 'live') {
    console.log(`Live evaluation would use ${config.model} at ${config.baseURL}.`);
    console.log('Set CLAIMLENS_AGENT_MODE=live to run the gold experiment on MastraClaimRunner.');
    process.exit(0);
  }

  const results = await runEvaluations({ live: true });
  const report = await writeEvalReport(results, 'live');
  for (const result of results) {
    const mark = result.passed ? 'pass' : 'fail';
    console.log(`${mark} ${result.id}`);
    for (const score of result.scores.filter((item) => !item.passed)) {
      console.log(`  - ${score.name}: ${score.detail}`);
    }
  }
  if (!report.passed) process.exit(1);
  console.log(`Wrote evals/output/report.json (${results.length} live Mastra scored cases).`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
