import { describe, expect, it } from 'vitest';

import { readOllamaConfig } from './model';

describe('readOllamaConfig', () => {
  it('requires both an API key and model', () => {
    expect(() => readOllamaConfig({})).toThrow('OLLAMA_API_KEY');
    expect(() => readOllamaConfig({ OLLAMA_API_KEY: 'key' })).toThrow('OLLAMA_MODEL');
  });

  it('uses the documented Ollama Cloud endpoint by default', () => {
    expect(
      readOllamaConfig({ OLLAMA_API_KEY: 'key', OLLAMA_MODEL: 'model' }),
    ).toEqual({
      apiKey: 'key',
      baseURL: 'https://ollama.com/v1',
      model: 'model',
    });
  });
});
