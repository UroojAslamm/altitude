import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Page, PageHeader } from '@/components/AppShell';
import { Button, Card, cx, EmptyState, ErrorState, Field, Sheet, Skeleton, TextArea, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { dubaiDate, dubaiTime, friendlyError } from '@/lib/rules';
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

interface EventRow { id: string; title: string; description: string; place: string; starts_at: string; rsvp_count: number; status: string; clubs: { name: string } | null }

export function EventsPage() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;
  const client = useQueryClient();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', place: '', starts: '' });
  const events = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*, clubs(name)').gte('starts_at', new Date().toISOString()).order('starts_at');
      if (error) throw new Error(error.message);
      return data as EventRow[];
    },
  });
  const rsvps = useQuery({
    queryKey: ['rsvps', uid],
    queryFn: async () => {
      const { data } = await supabase.from('event_rsvps').select('event_id').eq('user_id', uid!);
      return new Set(((data ?? []) as Array<{ event_id: string }>).map((r) => r.event_id));
    },
  });

  async function rsvp(id: string) {
    const { error } = await supabase.rpc('rsvp_event', { p_event_id: id });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['events'] });
    void client.invalidateQueries({ queryKey: ['rsvps'] });
  }

  async function create() {
    const { error } = await supabase.rpc('create_event', {
      p_title: form.title, p_description: form.description, p_place: form.place, p_starts_at: new Date(`${form.starts}+04:00`).toISOString(),
    });
    toast(error ? friendlyError(error.message) : 'Sent for approval', error ? 'error' : 'info');
    if (!error) setOpen(false);
    void client.invalidateQueries({ queryKey: ['events'] });
  }

  return (
    <>
      <PageHeader title="Events" />
      <Page className="lg:max-w-2xl">
        {profile?.club_lead_of && <Button onClick={() => setOpen(true)}>Create event</Button>}
        {events.isLoading && <Skeleton className="h-40" />}
        {events.isError && <ErrorState onRetry={() => void events.refetch()} />}
        {events.data?.length === 0 && <EmptyState title="Nothing scheduled" body="Check back soon." />}
        {events.data?.map((e) => {
          const going = rsvps.data?.has(e.id) ?? false;
          return (
            <Card key={e.id}>
              <p className="text-sm text-glow-300">{e.clubs?.name}{e.status === 'pending' ? ' · Pending approval' : ''}</p>
              <h2 className="text-2xl">{e.title}</h2>
              <p className="tabular text-sm text-cream-300">{dubaiDate(e.starts_at)}, {dubaiTime(e.starts_at)} · {e.place}</p>
              {e.description && <p className="mt-1 break-words text-cream-100">{e.description}</p>}
              {e.status === 'approved' && (
                <div className="mt-2 flex items-center justify-between">
                  <span className="tabular text-sm text-cream-300">{e.rsvp_count} going</span>
                  <Button variant={going ? 'secondary' : 'primary'} onClick={() => void rsvp(e.id)}>{going ? 'Going' : 'RSVP'}</Button>
                </div>
              )}
            </Card>
          );
        })}
      </Page>
      <Sheet open={open} onClose={() => setOpen(false)} title="Create event">
        <div className="space-y-3">
          <Field label="Title" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextArea label="Description" maxLength={400} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Field label="Place" value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} />
          <Field label="Date and time (Dubai)" type="datetime-local" value={form.starts} onChange={(e) => setForm({ ...form, starts: e.target.value })} />
          <Button className="w-full" disabled={!form.title.trim() || !form.starts} onClick={() => void create()}>Submit for approval</Button>
        </div>
      </Sheet>
    </>
  );
}
