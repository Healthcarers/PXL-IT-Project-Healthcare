import { ensureAudio } from './heartbeatAudio';

const CHARGE_START_HZ = 340;
const CHARGE_END_HZ = 1850;
const CHARGE_PEAK_GAIN = 0.22;

let activeCharge: { osc: OscillatorNode; gain: GainNode } | null = null;

/** Plays a smoothly rising tone over the defibrillator charging duration. */
export function startChargeSound(durationMs = 2200): void {
  stopChargeSound();

  let ctx: AudioContext;
  try {
    ctx = ensureAudio();
  } catch {
    return;
  }

  const now = ctx.currentTime;
  const durationSec = Math.max(0.1, durationMs / 1000);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(CHARGE_START_HZ, now);
  osc.frequency.exponentialRampToValueAtTime(CHARGE_END_HZ, now + durationSec);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(CHARGE_PEAK_GAIN, now + 0.03);
  gain.gain.setValueAtTime(CHARGE_PEAK_GAIN, Math.max(now + 0.03, now + durationSec - 0.04));
  gain.gain.linearRampToValueAtTime(0.0001, now + durationSec);

  osc.onended = () => {
    if (activeCharge?.osc === osc) {
      activeCharge = null;
    }
  };

  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec + 0.01);

  activeCharge = { osc, gain };
}

/** Stops any active defibrillator charge tone cleanly. */
export function stopChargeSound(): void {
  if (!activeCharge) return;
  const { osc, gain } = activeCharge;
  activeCharge = null;

  try {
    const ctx = ensureAudio();
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues?.(now);
    gain.gain.setValueAtTime(gain.gain.value || CHARGE_PEAK_GAIN, now);
    gain.gain.linearRampToValueAtTime(0.0001, now + 0.03);
    osc.stop(now + 0.04);
  } catch {
    // Context unavailable or oscillator already stopped.
  }
}
