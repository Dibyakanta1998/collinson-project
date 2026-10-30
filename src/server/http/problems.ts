import { NextResponse } from 'next/server';

export interface ProblemInput {
  type: string;
  title: string;
  status: number;
  detail: string;
  requestId: string;
}

export function problemResponse({ type, title, status, detail, requestId }: ProblemInput) {
  return NextResponse.json(
    { type, title, status, detail, requestId },
    {
      status,
      headers: {
        'content-type': 'application/problem+json',
        'x-request-id': requestId,
      },
    },
  );
}
