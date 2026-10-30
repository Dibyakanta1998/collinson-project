import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

interface Environment {
  [key: string]: string | undefined;
  OLLAMA_API_KEY?: string;
  OLLAMA_BASE_URL?: string;
  OLLAMA_MODEL?: string;
}

export function readOllamaConfig(environment: Environment) {
  if (!environment.OLLAMA_API_KEY) {
    throw new Error('OLLAMA_API_KEY is required for live agent runs.');
  }
  if (!environment.OLLAMA_MODEL) {
    throw new Error('OLLAMA_MODEL is required for live agent runs.');
  }

  return {
    apiKey: environment.OLLAMA_API_KEY,
    baseURL: environment.OLLAMA_BASE_URL ?? 'https://ollama.com/v1',
    model: environment.OLLAMA_MODEL,
  };
}

export function createOllamaModel(environment: Environment = process.env) {
  const config = readOllamaConfig(environment);
  const ollama = createOpenAICompatible({
    name: 'ollama-cloud',
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    includeUsage: true,
    supportsStructuredOutputs: false,
  });

  return ollama.chatModel(config.model);
}
