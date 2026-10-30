import type { z } from 'zod';

const parseJson = (value: string): unknown => {
  const withoutFence = value
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '');
  return JSON.parse(withoutFence);
};

export async function parseWithSingleRepair<T>(
  raw: string,
  schema: z.ZodType<T>,
  repair: (invalidOutput: string) => Promise<string>,
): Promise<T> {
  const initial = schema.safeParse(safeParse(raw));
  if (initial.success) return initial.data;

  const repaired = schema.safeParse(safeParse(await repair(raw)));
  if (repaired.success) return repaired.data;

  throw new Error('Model output remained invalid after one repair attempt.');
}

function safeParse(raw: string): unknown {
  try {
    return parseJson(raw);
  } catch {
    return undefined;
  }
}
