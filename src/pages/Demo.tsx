import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Page, PageHeader } from '@/components/AppShell';
import { Button, Card, useToast } from '@/components/ui';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';

/** Pitch controls. Admin only. */
export default function DemoPage() {
  const toast = useToast();
  const client = useQueryClient();
  const open = useQuery({
    queryKey: ['demo-open'],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data } = await supabase.from('orders').select('id,order_no,customer_name,status').in('status', ['placed', 'preparing']).order('placed_at').limit(10);
      return (data ?? []) as Array<{ id: string; order_no: number; customer_name: string; status: string }>;
    },
  });

  async function run(fn: string, args: object, done: string) {
    const { error } = await supabase.rpc(fn, args);
    toast(error ? friendlyError(error.message) : done, error ? 'error' : 'info');
    void client.invalidateQueries();
  }

  return (
    <>
      <PageHeader title="Demo controls" subtitle="For the pitch only." />
      <Page className="lg:max-w-2xl">
        <Card>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void run('demo_create_sample_order', {}, 'Sample order created')}>Create sample order</Button>
            <Button variant="secondary" onClick={() => { if (window.confirm('Delete all non-seed orders?')) void run('demo_reset', {}, 'Demo data reset'); }}>Reset demo data</Button>
          </div>
        </Card>
        <Card>
          <h2 className="mb-2 text-2xl">Jump order to Ready</h2>
          {open.data?.length === 0 && <p className="text-cream-300">No open orders.</p>}
          <ul className="space-y-1">
            {open.data?.map((o) => (
              <li key={o.id} className="flex items-center justify-between">
                <span className="tabular">#{o.order_no} {o.customer_name}</span>
                <Button variant="secondary" onClick={() => void run('demo_jump_ready', { p_order_id: o.id }, 'Order is ready')}>Ready</Button>
              </li>
            ))}
          </ul>
        </Card>
        <div className="flex gap-2">
          <Link to="/admin" className="btn btn-secondary glass">Admin</Link>
          <Link to="/barista" className="btn btn-secondary glass">Barista</Link>
        </div>
      </Page>
    </>
  );
}
