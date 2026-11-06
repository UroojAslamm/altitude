import { useQuery, useQueryClient } from '@tanstack/react-query';
import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { RewardWheel } from '@/components/RewardWheel';
import { Badge, Button, Card, EmptyState, Field, ProgressRing, Skeleton, Stat, TIER_LABEL, TierShield, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useSettings, useVouchers } from '@/lib/queries';
import { dubaiDate, tierFor, tierProgress } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import { can3d, ThreeBoundary } from '@/three/support';

const TierShield3D = lazy(() => import('@/three/TierShield3D'));

export const PERKS = [
  { tier: 'base_camp', text: 'Earn meters. One spin ticket per 5 completed orders.' },
  { tier: 'ridge', text: 'One free extra shot per order. Early look at Drink of the Month.' },
  { tier: 'summit', text: 'Ridge perks plus 5% off every order.' },
  { tier: 'peak', text: 'Summit perks with 10% off, plus a free drink voucher each month.' },
] as const;

export function MePage() {
  const { profile, session, signOut } = useAuth();
  const uid = session?.user.id;
  const settings = useSettings();
  const vouchers = useVouchers(uid);
  const client = useQueryClient();
  const toast = useToast();
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const ledger = useQuery({
    queryKey: ['ledger', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const { data } = await supabase.from('meter_ledger').select('id,delta,reason,created_at').order('created_at', { ascending: false }).limit(10);
      return (data ?? []) as Array<{ id: string; delta: number; reason: string; created_at: string }>;
    },
  });

  if (!profile) return <Page><Skeleton className="h-52" /></Page>;
  const tier = tierFor(profile.total_meters, settings.data?.tier_thresholds);
  const progress = tierProgress(profile.total_meters, settings.data?.tier_thresholds);
  const ring = <ProgressRing value={progress.fraction} size={120}><TierShield tier={tier} size={52} /></ProgressRing>;

  async function saveBirthday() {
    const m = Number(month);
    const d = Number(day);
    if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) {
      toast('Enter a month from 1 to 12 and a day from 1 to 31', 'error');
      return;
    }
    const { error } = await supabase.from('profiles').update({ birth_month: m, birth_day: d }).eq('id', uid!);
    toast(error ? 'That did not save. Try again.' : 'Birthday saved', error ? 'error' : 'info');
    void client.invalidateQueries({ queryKey: ['profile', uid] });
  }

  return (
    <>
      <PageHeader title={profile.full_name} subtitle={profile.email} />
      <Page>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card variant="feature">
            <div className="flex items-center gap-4">
              {can3d() ? (
                <ThreeBoundary fallback={ring}>
                  <Suspense fallback={ring}><TierShield3D tier={tier} fraction={progress.fraction} /></Suspense>
                </ThreeBoundary>
              ) : ring}
              <div className="space-y-1">
                <Stat label="Lifetime meters" value={<span data-testid="total-meters">{profile.total_meters}</span>} />
                <Badge tone="brass">{TIER_LABEL[tier]}</Badge>
                <p className="tabular text-sm text-cream-300">{progress.next ? `${progress.toGo} m to ${TIER_LABEL[progress.next]}` : 'Top of the range'}</p>
              </div>
            </div>
          </Card>
          <RewardWheel />
        </div>
        <Card>
          <h2 className="mb-2 text-2xl">Tier perks</h2>
          <ul className="space-y-2">
            {PERKS.map((p) => (
              <li key={p.tier} className="flex items-center gap-3">
                <TierShield tier={p.tier} size={28} />
                <span className={p.tier === tier ? 'text-cream-50' : 'text-cream-300'}><strong>{TIER_LABEL[p.tier]}.</strong> {p.text}</span>
              </li>
            ))}
          </ul>
        </Card>
        <section>
          <h2 className="mb-2 text-2xl">Vouchers</h2>
          {vouchers.data?.length === 0 && <EmptyState title="No vouchers yet" body="Spin the wheel or reach Peak to earn them." />}
          <div className="grid gap-3 md:grid-cols-2">
            {vouchers.data?.map((v) => (
              <Card key={v.id}><div className="font-semibold">{v.label}</div><p className="text-sm text-cream-300">Expires {dubaiDate(v.expires_at)}</p></Card>
            ))}
          </div>
        </section>
        <Card>
          <h2 className="mb-2 text-2xl">Meter history</h2>
          {ledger.data?.length === 0 && <p className="text-cream-300">Your first order starts the climb.</p>}
          <ul className="tabular space-y-1">
            {ledger.data?.map((l) => (
              <li key={l.id} className="flex justify-between text-sm">
                <span className="capitalize text-cream-300">{l.reason.replace('_', ' ')}, {dubaiDate(l.created_at)}</span><span>+{l.delta} m</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="text-2xl">Birthday</h2>
          <p className="mb-2 text-sm text-cream-300">Optional. Month and day only. You get a Mystery Cup on the day.</p>
          {profile.birth_month ? <p>Saved: {profile.birth_day}/{profile.birth_month}</p> : (
            <div className="flex items-end gap-2">
              <div className="w-24"><Field label="Month" inputMode="numeric" value={month} onChange={(e) => setMonth(e.target.value)} /></div>
              <div className="w-24"><Field label="Day" inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} /></div>
              <Button variant="secondary" onClick={() => void saveBirthday()}>Save</Button>
            </div>
          )}
        </Card>
        <div className="flex flex-wrap gap-2">
          <Link to="/orders" className="btn btn-secondary glass">Order history</Link>
          <Link to="/offers" className="btn btn-secondary glass">Offers</Link>
          <Button variant="ghost" onClick={() => void signOut()}>Log out</Button>
        </div>
      </Page>
    </>
  );
}
