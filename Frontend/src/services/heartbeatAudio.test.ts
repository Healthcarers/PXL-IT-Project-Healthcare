import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as audio from './heartbeatAudio';

class FakeParam {
    value = 0;
    setValueAtTime = vi.fn();
    linearRampToValueAtTime = vi.fn();
    exponentialRampToValueAtTime = vi.fn();
}

class FakeGain {
    gain = new FakeParam();
    connect = vi.fn((target: unknown) => target);
}

class FakeOscillator {
    type = 'custom';
    frequency = new FakeParam();
    connect = vi.fn((target: unknown) => target);
    start = vi.fn();
    stop = vi.fn();
}

class FakeAudioContext {
    static instances: FakeAudioContext[] = [];

    state: 'running' | 'suspended' | 'closed' = 'running';
    currentTime = 0;
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
    if (!ctx) throw new Error('No AudioContext was created');
    return ctx;
}

beforeEach(() => {
    FakeAudioContext.instances = [];
    audio.setAudioContextFactory(() => new FakeAudioContext() as unknown as AudioContext);
});

describe('ensureAudio', () => {
    it('creates an AudioContext on first call', () => {
        audio.ensureAudio();

        expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it('returns the same context on later calls', () => {
        const first = audio.ensureAudio();
        const second = audio.ensureAudio();

        expect(second).toBe(first);
        expect(FakeAudioContext.instances).toHaveLength(1);
    });

    it('resumes a suspended context', () => {
        const ctx = audio.ensureAudio() as unknown as FakeAudioContext;
        ctx.state = 'suspended';

        audio.ensureAudio();

        expect(ctx.resume).toHaveBeenCalledOnce();
    });

    it('does not call resume on a running context', () => {
        const ctx = audio.ensureAudio() as unknown as FakeAudioContext;

        audio.ensureAudio();

        expect(ctx.resume).not.toHaveBeenCalled();
    });
});

describe('isAudioRunning', () => {
    it('is false before any context exists', () => {
        expect(audio.isAudioRunning()).toBe(false);
        expect(FakeAudioContext.instances).toHaveLength(0);
    });

    it('is true when the context is running', () => {
        audio.ensureAudio();

        expect(audio.isAudioRunning()).toBe(true);
    });

    it('is false while the context is suspended', () => {
        const ctx = audio.ensureAudio() as unknown as FakeAudioContext;
        ctx.state = 'suspended';
        ctx.resume = vi.fn();

        expect(audio.isAudioRunning()).toBe(false);
    });
});

describe('audioNow', () => {
    it('returns the context currentTime', () => {
        audio.ensureAudio();
        currentCtx().currentTime = 12.5;

        expect(audio.audioNow()).toBe(12.5);
    });

    it('creates the context if none exists yet', () => {
        audio.audioNow();

        expect(FakeAudioContext.instances).toHaveLength(1);
    });
});

describe('scheduleBeep', () => {
    it('creates one oscillator and one gain node', () => {
        audio.scheduleBeep(1);
        const ctx = currentCtx();

        expect(ctx.oscillators).toHaveLength(1);
        expect(ctx.gains).toHaveLength(1);
    })

    it('starts at the scheduled time and stops 90 ms later', () => {
        audio.scheduleBeep(2.5);
        const osc = currentCtx().oscillators[0];

        expect(osc.start).toHaveBeenCalledWith(2.5);
        expect(osc.stop).toHaveBeenCalledWith(2.5 + 0.09);
    })

    it('schedules each beep as its own oscillator', () => {
        audio.scheduleBeep(1);
        audio.scheduleBeep(2);

        expect(currentCtx().oscillators).toHaveLength(2);
    });
});

describe('startFlatline', () => {
    it('starts a sine oscillator at 880 Hz at level 0.25 by default', () => {
        audio.startFlatline();
        const ctx = currentCtx();
        const osc = ctx.oscillators[0];
        const gain = ctx.gains[0];

        expect(osc.type).toBe('sine');
        expect(osc.frequency.value).toBe(880);
        expect(gain.gain.value).toBe(0.25);
        expect(osc.start).toHaveBeenCalledOnce();
    });

    it('does nothing when already running', () => {
        audio.startFlatline();
        audio.startFlatline();

        expect(currentCtx().oscillators).toHaveLength(1);
        expect(currentCtx().oscillators[0].start).toHaveBeenCalledOnce();
    });

    it('creates a new oscillator after it has been stopped', () => {
        audio.startFlatline();
        audio.stopFlatline();
        audio.startFlatline();

        expect(currentCtx().oscillators).toHaveLength(2);
    });
});

describe('stopFlatline', () => {
    it('does nothing when no flatline is running', () => {
        audio.ensureAudio();

        expect(() => audio.stopFlatline()).not.toThrow();
        expect(currentCtx().oscillators).toHaveLength(0);
    });
});