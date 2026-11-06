import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { Page, PageHeader } from '@/components/AppShell';
import { Button, Card, EmptyState, ErrorState, Field, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';

interface Squad {
  id: string; name: string; code: string; created_by: string; squad_meters: number; level: number;
  levels: { l2: number; l3: number };
  members: Array<{ id: string; name: string; meters: number }>;
}

export default function SquadPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const client = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const squad = useQuery({
    queryKey: ['squad', uid],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('squad_overview');
      if (error) throw new Error(error.message);
      return data as Squad | null;
    },
  });

  async function run(fn: string, args: object) {
    const { error } = await supabase.rpc(fn, args);
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['squad'] });
    void client.invalidateQueries({ queryKey: ['profile', uid] });
  }

  const s = squad.data;
  const max = s ? Math.max(s.levels.l3, s.squad_meters) : 1;

  return (
    <>
      <PageHeader title={s?.name ?? 'Squad'} subtitle={s ? `Level ${s.level}` : 'Climb together.'} />
      <Page className="lg:max-w-2xl">
        {squad.isLoading && <Skeleton className="h-40" />}
        {squad.isError && <ErrorState onRetry={() => void squad.refetch()} />}
        {squad.data === null && (
          <>
            <EmptyState title="Better with friends" body="When a squad mate's order completes, you earn 10% of their meters. Up to 6 people." />
            <Card>
              <h2 className="mb-2 text-2xl">Create a squad</h2>
              <Field label="Squad name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
              <Button className="mt-3 w-full" disabled={name.trim().length < 2} onClick={() => void run('create_squad', { p_name: name })}>Create</Button>
            </Card>
            <Card>
              <h2 className="mb-2 text-2xl">Join with a code</h2>
              <Field label="6-character code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
              <Button variant="secondary" className="mt-3 w-full" disabled={code.length !== 6} onClick={() => void run('join_squad', { p_code: code })}>Join</Button>
            </Card>
          </>
        )}
        {s && (
          <>
            <Card variant="feature">
              <div className="flex justify-between"><span className="text-cream-300">Squad meters</span><span className="tabular font-semibold" data-testid="squad-meters">{s.squad_meters} m</span></div>
              <div className="relative mt-3 h-3 rounded-full bg-ink-700">
                <div className="brass h-3 rounded-full" style={{ width: `${(s.squad_meters / max) * 100}%` }} />
                {[s.levels.l2, s.levels.l3].map((m, i) => (
                  <span key={m} className="absolute top-4 -translate-x-1/2 text-xs text-cream-300" style={{ left: `${Math.min(97, (m / max) * 100)}%` }}>L{i + 2}</span>
                ))}
              </div>
              <ul className="mt-7 space-y-1 text-sm">
                <li className={s.level >= 2 ? 'text-glow-300' : 'text-cream-300'}>L2: free extra shot on Fridays</li>
                <li className={s.level >= 3 ? 'text-glow-300' : 'text-cream-300'}>L3: 5% off for members</li>
              </ul>
            </Card>
            <Card>
              <div className="flex items-center justify-between gap-2">
                <div><p className="text-sm text-cream-300">Invite code</p><p className="tabular font-display text-3xl font-bold tracking-widest" data-testid="squad-code">{s.code}</p></div>
                <Button variant="secondary" onClick={() => { void navigator.clipboard?.writeText(s.code); toast('Code copied'); }}><Copy size={20} strokeWidth={1.75} />Copy</Button>
              </div>
            </Card>
            <Card>
              <h2 className="mb-2 text-2xl">Members</h2>
              <ul className="space-y-1">
                {s.members.map((m) => (
                  <li key={m.id} className="flex min-h-[44px] items-center justify-between gap-2">
                    <span>{m.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular text-cream-300">{m.meters} m</span>
                      {s.created_by === uid && m.id !== uid && <Button variant="ghost" onClick={() => void run('remove_squad_member', { p_user_id: m.id })}>Remove</Button>}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
            <Button variant="secondary" className="w-full" onClick={() => void run('leave_squad', {})}>Leave squad</Button>
          </>
        )}
      </Page>
    </>
  );
}
