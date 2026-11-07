import { useQuery } from '@tanstack/react-query';
import { Page, PageHeader } from '@/components/AppShell';
import { Card, EmptyState, ErrorState, Skeleton, TIER_LABEL, TierShield } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useSettings, useVouchers } from '@/lib/queries';
import { commonHourLabel, dubaiDate } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import { PERKS } from './Me';

interface Promo { id: string; title: string; description: string; ends_at: string }

export default function OffersPage() {
  const { session } = useAuth();
  const settings = useSettings();
  const vouchers = useVouchers(session?.user.id);
  const promos = useQuery({
    queryKey: ['promos'],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase.from('promos').select('id,title,description,ends_at').eq('is_active', true).lte('starts_at', now).gte('ends_at', now);
      if (error) throw new Error(error.message);
      return data as Promo[];
    },
  });
  const s = settings.data;
  return (
    <>
      <PageHeader title="Offers" subtitle="One best discount applies to each order." />
      <Page className="lg:max-w-2xl">
        {promos.isLoading && <Skeleton className="h-24" />}
        {promos.isError && <ErrorState onRetry={() => void promos.refetch()} />}
        {promos.data?.length === 0 && <EmptyState title="No promos right now" />}
        {promos.data?.map((p) => (
          <Card key={p.id} variant="feature">
            <h2 className="text-2xl">{p.title}</h2>
            <p className="text-cream-100">{p.description}</p>
            <p className="text-sm text-cream-300">Ends {dubaiDate(p.ends_at)}</p>
          </Card>
        ))}
        {s && (
          <Card>
            <h2 className="text-2xl">Common Hour</h2>
            <p className="text-cream-100">{s.common_hour_multiplier}x meters, {commonHourLabel(s.common_hour_start, s.common_hour_end)}, Monday to Friday.</p>
          </Card>
        )}
        <Card>
          <h2 className="mb-2 text-2xl">Tier perks</h2>
          <ul className="space-y-2">
            {PERKS.map((p) => (
              <li key={p.tier} className="flex items-center gap-3"><TierShield tier={p.tier} size={28} /><span><strong>{TIER_LABEL[p.tier]}.</strong> <span className="text-cream-300">{p.text}</span></span></li>
            ))}
          </ul>
        </Card>
        <section>
          <h2 className="mb-2 text-2xl">My vouchers</h2>
          {vouchers.data?.length === 0 && <EmptyState title="No vouchers yet" />}
          {vouchers.data?.map((v) => <Card key={v.id}><div className="font-semibold">{v.label}</div><p className="text-sm text-cream-300">Expires {dubaiDate(v.expires_at)}</p></Card>)}
        </section>
      </Page>
    </>
  );
}
