export type SoundChoice = 'chime' | 'bell' | 'pop' | 'off';
export type Alert = 'placed' | 'ready' | 'new_order';

const KEY = 'ascend-sound';
const CHOICES: SoundChoice[] = ['chime', 'bell', 'pop', 'off'];

let ctx: AudioContext | null = null;

/** Sound is on by default. The choice is kept on this device. */
export function getSound(): SoundChoice {
  const saved = localStorage.getItem(KEY) as SoundChoice | null;
  return saved && CHOICES.includes(saved) ? saved : 'chime';
}

export function setSound(choice: SoundChoice) {
  localStorage.setItem(KEY, choice);
}

/** Browsers block audio until a tap. The first tap anywhere opens it for later alerts. */
export function installAudioUnlock() {
  const unlock = () => {
    try {
      ctx ??= new AudioContext();
      void ctx.resume();
    } catch {
      return;
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

function tone(audio: AudioContext, at: number, freq: number, type: OscillatorType, peak: number, length: number, sweepTo?: number) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, at);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, at + length);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
  osc.connect(gain).connect(audio.destination);
  osc.start(at);
  osc.stop(at + length + 0.05);
}

const NOTES: Record<Alert, number[]> = {
  placed: [659.3, 880],
  new_order: [880, 1318.5],
  ready: [880, 1108.7, 1318.5, 1760],
};

export function playAlert(alert: Alert, choice: SoundChoice = getSound()) {
  if (choice === 'off') return;
  try {
    ctx ??= new AudioContext();
    void ctx.resume();
    const audio = ctx;
    const start = audio.currentTime;
    NOTES[alert].forEach((freq, i) => {
      if (choice === 'chime') tone(audio, start + i * 0.15, freq, 'sine', 0.22, 0.5);
      if (choice === 'bell') {
        tone(audio, start + i * 0.17, freq * 0.75, 'triangle', 0.2, 0.9);
        tone(audio, start + i * 0.17, freq * 1.5, 'sine', 0.05, 0.6);
      }
      if (choice === 'pop') tone(audio, start + i * 0.11, freq * 0.4, 'sine', 0.3, 0.09, freq);
    });
  } catch {
    // Sound is optional. The visual alert still shows.
  }
}
