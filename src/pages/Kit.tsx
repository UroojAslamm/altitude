import { useState } from 'react';
import { Logo, PhotoBackdrop } from '@/components/brand';
import {
  Badge, Button, Card, Chip, ConnectionDot, EmptyState, Field, Modal, ProgressRing, Rating, Segmented, Sheet,
  Skeleton, Slider, Stat, Stepper, Tabs, TextArea, TierShield, useToast,
} from '@/components/ui';

/** Hidden component review page (admin only). */
export default function KitPage() {
  const [seg, setSeg] = useState<'dine' | 'away'>('dine');
  const [tab, setTab] = useState<'one' | 'two'>('one');
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(30);
  const [note, setNote] = useState('');
  const [rating, setRating] = useState(4);
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const toast = useToast();

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 p-4">
      <h1 className="h1-gradient text-5xl">Component kit</h1>
      <PhotoBackdrop name="counter" position="70% 45%" className="h-56 rounded-2xl">
        <div className="flex h-full items-end p-4"><Logo size={84} /></div>
      </PhotoBackdrop>
      <div className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="secondary" onClick={() => setSheet(true)}>Sheet</Button>
        <Button variant="secondary" onClick={() => setModal(true)}>Modal</Button>
        <Button variant="secondary" onClick={() => toast('Added to cart')}>Toast</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card><Stat label="Lifetime meters" value="1,240" /></Card>
        <Card variant="feature"><h3 className="text-2xl">Feature card</h3><p className="text-cream-300">Hairline border</p></Card>
        <Card>
          <div className="flex items-center gap-4">
            <ProgressRing value={0.64}><span className="tabular text-sm">64%</span></ProgressRing>
            <ConnectionDot online />
          </div>
        </Card>
      </div>
      <div className="flex items-end gap-4">
        <TierShield tier="base_camp" /><TierShield tier="ridge" /><TierShield tier="summit" /><TierShield tier="peak" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Chip active>Active</Chip><Chip>Chip</Chip>
        <Badge>Neutral</Badge><Badge tone="success">Paid</Badge><Badge tone="warning">Unpaid</Badge>
        <Badge tone="error">Sold out</Badge><Badge tone="brass">Summit</Badge>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Segmented label="Fulfillment" value={seg} onChange={setSeg}
          options={[{ value: 'dine', label: 'Dine in' }, { value: 'away', label: 'Take away' }]} />
        <Tabs value={tab} onChange={setTab} tabs={[{ value: 'one', label: 'Menu' }, { value: 'two', label: 'Promos' }]} />
        <Slider label="Max price" min={5} max={50} value={price} onChange={setPrice} format={(v) => `AED ${v}`} />
        <div className="flex items-center gap-4"><Stepper label="Quantity" value={qty} onChange={setQty} /><Rating value={rating} onChange={setRating} /></div>
        <Field label="Email" placeholder="you@rit.edu" />
        <TextArea label="Preferences" maxLength={140} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. extra hot, room temperature" />
      </div>
      <Skeleton className="h-16" />
      <EmptyState title="No orders yet" body="Your first climb starts with one coffee." action={<Button>Browse menu</Button>} />
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters"><p className="text-cream-300">Sheet content</p></Sheet>
      <Modal open={modal} onClose={() => setModal(false)} title="Confirm"><p className="text-cream-300">Modal content</p></Modal>
    </div>
  );
}
