import { ClaimWorkspace } from '@/components/claim-workspace/ClaimWorkspace';

export const dynamic = 'force-dynamic';

export default function Home() {
  const mode = process.env.CLAIMLENS_AGENT_MODE === 'live' ? 'live' : 'fake';
  return <ClaimWorkspace mode={mode} />;
}
