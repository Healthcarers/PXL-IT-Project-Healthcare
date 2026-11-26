import { beforeEach, describe, expect, it, vi } from 'vitest';
import { setAudioContextFactory } from './heartbeatAudio';
import { startChargeSound, stopChargeSound } from './defibAudio';

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
  cancelScheduledValues = vi.fn();
}

class FakeGain {
  gain = new FakeParam();
  connect = vi.fn((target: unknown) => target);
}

class FakeOscillator {
  type = 'custom';
  frequency = new FakeParam();
  onended: (() => void) | null = null;
  connect = vi.fn((target: unknown) => target);
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 1;
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator() {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

function currentCtx(): FakeAudioContext {
  const ctx = FakeAudioContext.instances[FakeAudioContext.instances.length - 1];
  if (!ctx) throw new Error('No AudioContext created');
  return ctx;
}

describe('defibAudio', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    setAudioContextFactory(() => new FakeAudioContext() as unknown as AudioContext);
    stopChargeSound();
  });

  it('plays an ascending frequency sweep over the charging duration', () => {
    startChargeSound(2200);

    const ctx = currentCtx();
    expect(ctx.oscillators).toHaveLength(1);
    const osc = ctx.oscillators[0]!;
    const gain = ctx.gains[0]!;

    expect(osc.type).toBe('sine');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalledWith(340, 1);
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(1850, 3.2);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    expect(osc.start).toHaveBeenCalledWith(1);
    expect(osc.stop).toHaveBeenCalledWith(3.21);
  });

  it('stops an active charge tone smoothly when stopChargeSound is called', () => {
    startChargeSound(2200);
    const ctx = currentCtx();
    const osc = ctx.oscillators[0]!;
    const gain = ctx.gains[0]!;

    ctx.currentTime = 2;
    stopChargeSound();

    expect(gain.gain.cancelScheduledValues).toHaveBeenCalledWith(2);
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0.0001, 2.03);
    expect(osc.stop).toHaveBeenLastCalledWith(2.04);

    // Calling stop again is a safe no-op
    expect(() => stopChargeSound()).not.toThrow();
    expect(osc.stop).toHaveBeenCalledTimes(2);
  });

  it('replaces an existing charge tone when started again', () => {
    startChargeSound(2000);
    startChargeSound(2000);

    const ctx = currentCtx();
    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.oscillators[0]!.stop).toHaveBeenCalledTimes(2);
    expect(ctx.oscillators[1]!.start).toHaveBeenCalledOnce();
  });

  it('fails gracefully when AudioContext is unavailable', () => {
    setAudioContextFactory(() => {
      throw new Error('No audio');
    });

    expect(() => startChargeSound(2000)).not.toThrow();
    expect(() => stopChargeSound()).not.toThrow();
  });
});
