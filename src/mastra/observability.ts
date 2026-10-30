import { ConsoleLogger } from '@mastra/core/logger';
import { Observability, MastraStorageExporter } from '@mastra/observability';

export function createClaimLensLogger() {
  return new ConsoleLogger({
    name: 'claimlens',
    level: process.env.LOG_LEVEL === 'debug' ? 'debug' : 'info',
  });
}

export function createClaimLensObservability() {
  return new Observability({
    configs: {
      default: {
        serviceName: 'claimlens',
        exporters: [new MastraStorageExporter()],
      },
    },
  });
}
