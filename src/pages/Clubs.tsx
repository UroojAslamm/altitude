import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader } from '@/components/AppShell';
import { Button, cx, EmptyState, ErrorState, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';

interface Row { club_id: string; name: string; meters: number; members: number }
const PLATE = ['metal-summit text-ink-900', 'metal-ridge text-ink-900', 'metal-base-camp text-ink-900'];

export function ClubsPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const client = useQueryClient();
  const toast = useToast();
  const board = useQuery({
    queryKey: ['clubs-board'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('club_leaderboard');
      if (error) throw new Error(error.message);
      return data as Row[];
    },
  });
  const mine = useQuery({
    queryKey: ['my-clubs', uid],
    queryFn: async () => {
      const { data } = await supabase.from('club_members').select('club_id').eq('user_id', uid!);
      return new Set(((data ?? []) as Array<{ club_id: string }>).map((c) => c.club_id));
    },
  });

  async function toggle(id: string, join: boolean) {
    const { error } = await supabase.rpc('join_club', { p_club_id: id, p_join: join });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['my-clubs'] });
    void client.invalidateQueries({ queryKey: ['clubs-board'] });
  }

  return (
    <>
      <PageHeader title="Club Summit" subtitle="Meters earned by club members this month." />
      <Page className="lg:max-w-2xl">
        {board.isLoading && <Skeleton className="h-60" />}
        {board.isError && <ErrorState onRetry={() => void board.refetch()} />}
        {board.data?.length === 0 && <EmptyState title="No clubs yet" />}
        {board.data?.map((c, i) => {
          const joined = mine.data?.has(c.club_id) ?? false;
          return (
            <div key={c.club_id} className={cx('gloss flex items-center gap-3 rounded-2xl p-4 shadow-e2', PLATE[i] ?? 'glass')}>
              <span className="tabular relative font-display text-3xl font-bold">{i + 1}</span>
              <div className="relative min-w-0 flex-1">
                <div className="truncate font-semibold">{c.name}</div>
                <div className="tabular text-sm">{c.meters} m · {c.members} members</div>
              </div>
              <Button variant="secondary" className="relative !text-cream-50" onClick={() => void toggle(c.club_id, !joined)}>{joined ? 'Leave' : 'Join'}</Button>
            </div>
          );
        })}
      </Page>
    </>
  );
}

