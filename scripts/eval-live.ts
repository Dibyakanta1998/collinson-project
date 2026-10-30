import { readOllamaConfig } from '../src/mastra/model';

try {
  const config = readOllamaConfig(process.env);
  console.log(`Live evaluation would use ${config.model} at ${config.baseURL}.`);
  console.log('Set CLAIMLENS_AGENT_MODE=live and re-run the app to exercise Ollama Cloud.');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
