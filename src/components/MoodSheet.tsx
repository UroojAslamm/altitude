import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MenuItem } from '@/lib/types';
import { DrinkArt } from './DrinkArt';
import { Chip, Sheet, Slider } from './ui';

type Mood = 'focus' | 'chill' | 'gym' | 'sweet';
const MOODS: Array<{ value: Mood; label: string }> = [
  { value: 'focus', label: 'Exam week' }, { value: 'chill', label: 'Chill' },
  { value: 'gym', label: 'Post-gym' }, { value: 'sweet', label: 'Sweet tooth' },
];

export function scoreItem(item: MenuItem, mood: Mood, energy: number, tempC: number | null) {
  let score = 0;
  const reasons: string[] = [];
  const cold = ['iced', 'smoothie', 'shake'].includes(item.kind);
  if (mood === 'focus') {
    if (item.caffeine_level >= 2) { score += 4; reasons.push('Strong enough for a long study block'); }
    if (item.tags.includes('low-sugar')) score += 2;
  } else if (mood === 'chill') {
    if (item.caffeine_level <= 1) { score += 4; reasons.push('Easy on the caffeine'); }
    if (item.kind === 'smoothie' || item.kind === 'shake') score += 1;
  } else if (mood === 'gym') {
    if (item.kind === 'smoothie') { score += 3; reasons.push('Real fruit after a workout'); }
    if (item.tags.includes('banana') || item.tags.includes('protein')) score += 3;
  } else {
    if (item.tags.includes('sweet')) { score += 4; reasons.push('A proper treat'); }
  }
  score -= Math.abs(item.caffeine_level - energy) * 0.7;
  if (tempC !== null && tempC > 30 && cold) { score += 2; reasons.push(`Cold and it's ${Math.round(tempC)} C outside`); }
  if (tempC !== null && tempC < 22 && item.kind === 'hot') { score += 2; reasons.push(`Warm for a ${Math.round(tempC)} C day`); }
  return { score, reason: reasons[0] ?? 'A good match for right now' };
}

function useDubaiTemp(enabled: boolean) {
  const [temp, setTemp] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    fetch('https://api.open-meteo.com/v1/forecast?latitude=25.2048&longitude=55.2708&current=temperature_2m')
      .then((r) => r.json() as Promise<{ current?: { temperature_2m?: number } }>)
      .then((d) => setTemp(d.current?.temperature_2m ?? null))
      .catch(() => setTemp(null));
  }, [enabled]);
  return temp;
}

/** Recommendation engine: deterministic rules plus current Dubai weather when available. */
export function MoodSheet({ open, onClose, items }: { open: boolean; onClose: () => void; items: MenuItem[] }) {
  const [mood, setMood] = useState<Mood>('focus');
  const [energy, setEnergy] = useState(2);
  const temp = useDubaiTemp(open);

  const picks = useMemo(
    () => items.filter((i) => i.is_available && i.kind !== 'bakery')
      .map((item) => ({ item, ...scoreItem(item, mood, energy, temp) }))
      .sort((a, b) => b.score - a.score).slice(0, 3),
    [items, mood, energy, temp],
  );

  return (
    <Sheet open={open} onClose={onClose} title="What's the mood?">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => <Chip key={m.value} active={mood === m.value} onClick={() => setMood(m.value)}>{m.label}</Chip>)}
        </div>
        <Slider label="Energy you need" min={1} max={3} value={energy} onChange={setEnergy} format={(v) => ['Low', 'Medium', 'High'][v - 1] ?? ''} />
        <div className="space-y-2">
          {picks.map(({ item, reason }) => (
            <Link key={item.id} to={`/menu/${item.id}`} onClick={onClose} className="glass flex items-center gap-3 rounded-xl p-2">
              <DrinkArt kind={item.kind} accent={item.accent_color} name={item.name} size={64} />
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-sm text-cream-300">{reason}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Sheet>
  );
}
