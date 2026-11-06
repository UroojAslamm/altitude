import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ThumbsUp } from 'lucide-react';
import { useState } from 'react';
import { Page, PageHeader } from '@/components/AppShell';
import { Badge, Button, Card, EmptyState, ErrorState, Field, Sheet, Skeleton, TextArea, useToast } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useMenu } from '@/lib/queries';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';

interface Submission {
  id: string; user_id: string; author_name: string; name: string; description: string; ingredients: string;
  vote_count: number; promoted_item_id: string | null;
}

export default function LabPage() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const client = useQueryClient();
  const toast = useToast();
  const menu = useMenu();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', base: '', ingredients: '' });
  const list = useQuery({
    queryKey: ['lab'],
    queryFn: async () => {
      const dubai = new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 7);
      const { data, error } = await supabase.from('drink_submissions').select('*').eq('month', `${dubai}-01`).order('vote_count', { ascending: false });
      if (error) throw new Error(error.message);
      return data as Submission[];
    },
  });
  const votes = useQuery({
    queryKey: ['lab-votes', uid],
    queryFn: async () => {
      const { data } = await supabase.from('drink_votes').select('submission_id').eq('user_id', uid!);
      return new Set(((data ?? []) as Array<{ submission_id: string }>).map((v) => v.submission_id));
    },
  });

  async function vote(id: string) {
    const { error } = await supabase.rpc('vote_drink', { p_submission_id: id });
    if (error) toast(friendlyError(error.message), 'error');
    void client.invalidateQueries({ queryKey: ['lab'] });
    void client.invalidateQueries({ queryKey: ['lab-votes'] });
  }

  async function submit() {
    const { error } = await supabase.rpc('submit_drink', {
      p_name: form.name, p_description: form.description, p_base_item: form.base || null, p_ingredients: form.ingredients,
    });
    toast(error ? friendlyError(error.message) : 'Your drink is in the lab', error ? 'error' : 'info');
    if (!error) setOpen(false);
    void client.invalidateQueries({ queryKey: ['lab'] });
  }

  return (
    <>
      <PageHeader title="Drink Lab" subtitle="Invent it. Vote it. Top drinks can join the menu." />
      <Page className="lg:max-w-2xl">
        <Button className="w-full" onClick={() => setOpen(true)}>Submit a drink</Button>
        {list.isLoading && <Skeleton className="h-40" />}
        {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
        {list.data?.length === 0 && <EmptyState title="The lab is empty" body="Be the first to submit this month." />}
        {list.data?.map((d) => {
          const voted = votes.data?.has(d.id) ?? false;
          return (
            <Card key={d.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-2xl">{d.name}</h2>
                  <p className="text-sm text-glow-300">by {d.author_name}</p>
                  <p className="mt-1 break-words text-cream-100">{d.description}</p>
                  {d.ingredients && <p className="break-words text-sm text-cream-300">{d.ingredients}</p>}
                  {d.promoted_item_id && <div className="mt-1"><Badge tone="brass">On the menu</Badge></div>}
                </div>
                <Button variant={voted ? 'primary' : 'secondary'} disabled={d.user_id === uid} aria-label={`Vote for ${d.name}`} onClick={() => void vote(d.id)}>
                  <ThumbsUp size={20} strokeWidth={1.75} /><span className="tabular">{d.vote_count}</span>
                </Button>
              </div>
            </Card>
          );
        })}
      </Page>
      <Sheet open={open} onClose={() => setOpen(false)} title="Submit a drink">
        <div className="space-y-3">
          <Field label="Name" maxLength={40} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <TextArea label="Description" maxLength={200} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <label className="block">
            <span className="mb-1 block text-sm text-cream-300">Base drink</span>
            <select value={form.base} onChange={(e) => setForm({ ...form, base: e.target.value })} className="min-h-[44px] w-full rounded-xl border border-ink-700 bg-ink-950 px-3 text-cream-50">
              <option value="">Choose one</option>
              {menu.data?.items.filter((i) => i.kind !== 'bakery').map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
          </label>
          <Field label="Ingredients" value={form.ingredients} onChange={(e) => setForm({ ...form, ingredients: e.target.value })} />
          <Button className="w-full" disabled={!form.name.trim()} onClick={() => void submit()}>Submit</Button>
        </div>
      </Sheet>
    </>
  );
}
