type LogFields = Record<string, string | number | boolean | undefined>;

export function log(level: 'info' | 'warn' | 'error', message: string, fields: LogFields = {}) {
  const payload = {
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else console.log(line);
}
