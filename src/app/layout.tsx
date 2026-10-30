import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { APP_CONTENT } from '@/content/app';

import './globals.scss';

export const metadata: Metadata = {
  title: APP_CONTENT.name,
  description: APP_CONTENT.description,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
