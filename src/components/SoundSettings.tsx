import { useState } from 'react';
import { getSound, playAlert, setSound, type SoundChoice } from '@/lib/chime';
import { Segmented } from './ui';

const OPTIONS: Array<{ value: SoundChoice; label: string }> = [
  { value: 'chime', label: 'Chime' }, { value: 'bell', label: 'Bell' }, { value: 'pop', label: 'Pop' }, { value: 'off', label: 'Off' },
];

export function SoundSettings() {
  const [choice, setChoice] = useState(getSound);
  return (
    <div className="space-y-2">
      <Segmented
        label="Alert sound" value={choice} options={OPTIONS}
        onChange={(next) => { setSound(next); setChoice(next); playAlert('ready', next); }}
      />
      <p className="text-sm text-cream-300">Plays when an order is placed and when it is ready. Saved on this device.</p>
    </div>
  );
}
