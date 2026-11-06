import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/rules';
import { supabase } from '@/lib/supabase';
import { Button, Card, useToast } from './ui';

const SLICES = ['meters', 'free_shot', 'percent', 'free_croissant', 'none', 'free_drink'];
const LABELS = ['+25 m', 'Shot', '10% off', 'Croissant', 'Again', 'Free drink'];

/** Metallic wheel. Spins only after a tap and settles in 1.8 s. The database picks the prize. */
export function RewardWheel() {
  const { session } = useAuth();
  const uid = session?.user.id;
  const client = useQueryClient();
  const toast = useToast();
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const tickets = useQuery({
    queryKey: ['tickets', uid],
    enabled: Boolean(uid),
    queryFn: async () => (await supabase.rpc('spin_tickets')).data as number,
  });

  async function spin() {
    setSpinning(true);
    setResult(null);
    const { data, error } = await supabase.rpc('spin_wheel');
    if (error) {
      toast(friendlyError(error.message), 'error');
      setSpinning(false);
      return;
    }
    const prize = data as { prize: string; label: string };
    const index = SLICES.indexOf(prize.prize);
    const target = 360 - (index * 60 + 30);
    setAngle((a) => a - (a % 360) + 360 * 4 + target);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(prize.label);
      void client.invalidateQueries({ queryKey: ['tickets'] });
      void client.invalidateQueries({ queryKey: ['vouchers'] });
      void client.invalidateQueries({ queryKey: ['profile', uid] });
    }, 1850);
  }

  return (
    <Card>
      <div className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <div className="absolute left-1/2 top-[-4px] z-10 h-0 w-0 -translate-x-1/2 border-x-[7px] border-t-[12px] border-x-transparent border-t-glow-300" />
          <svg viewBox="0 0 100 100" className="h-full w-full" role="img" aria-label="Reward wheel"
            style={{ transform: `rotate(${angle}deg)`, transition: spinning ? 'transform 1800ms cubic-bezier(.15,.8,.2,1)' : 'none' }}>
            <defs>
              <linearGradient id="wheel-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#E9C46A" /><stop offset="1" stopColor="#8A6A2F" /></linearGradient>
              <linearGradient id="wheel-b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2A2420" /><stop offset="1" stopColor="#0B0908" /></linearGradient>
            </defs>
            {SLICES.map((s, i) => {
              const a0 = ((i * 60 - 90) * Math.PI) / 180;
              const a1 = (((i + 1) * 60 - 90) * Math.PI) / 180;
              const mid = i * 60 + 30;
              return (
                <g key={s}>
                  <path d={`M50 50 L${50 + 48 * Math.cos(a0)} ${50 + 48 * Math.sin(a0)} A48 48 0 0 1 ${50 + 48 * Math.cos(a1)} ${50 + 48 * Math.sin(a1)} Z`}
                    fill={`url(#wheel-${i % 2 ? 'b' : 'a'})`} stroke="#FFE6B4" strokeOpacity=".4" strokeWidth=".5" />
                  <text x="50" y="17" textAnchor="middle" fontSize="6.5" fontWeight="600" fill={i % 2 ? '#FBF7EF' : '#14110F'} transform={`rotate(${mid} 50 50)`}>{LABELS[i]}</text>
                </g>
              );
            })}
            <circle cx="50" cy="50" r="7" fill="url(#wheel-a)" stroke="#FFF1C9" strokeWidth=".6" />
          </svg>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl">Reward wheel</h2>
          <p className="tabular text-sm text-cream-300">{tickets.data ?? 0} spin tickets</p>
          <Button disabled={spinning || !tickets.data} onClick={() => void spin()}>Spin</Button>
          {result && <p aria-live="polite" className="font-semibold text-glow-300">{result}</p>}
        </div>
      </div>
    </Card>
  );
}
