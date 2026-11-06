import { ProgressRing, TierShield, type Tier } from '@/components/ui';

/** Temporary until M6: renders the 2D ring. */
export default function TierShield3D({ tier, fraction }: { tier: Tier; fraction: number }) {
  return <ProgressRing value={fraction} size={120}><TierShield tier={tier} size={52} /></ProgressRing>;
}
