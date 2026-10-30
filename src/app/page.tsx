import { APP_CONTENT } from '@/content/app';

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">{APP_CONTENT.name}</p>
      <h1>{APP_CONTENT.description}</h1>
      <p>{APP_CONTENT.preparing}</p>
    </main>
  );
}
