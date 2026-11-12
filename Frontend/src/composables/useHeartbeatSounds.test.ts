import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { WaveformChunk } from '../types/waveform';
import { useHeartbeatSound } from './useHeartbeatSound';

const stubs = vi.hoisted(() => ({
    handler: null as null | ((chunk: WaveformChunk) => void),
    unsubscribe: vi.fn(),
    subscribeTopic: vi.fn(),
    unmountHooks: [] as Array<() => void>,
    useChannelActive: vi.fn(),
    useHeartRate: vi.fn(),
    audio: {
        audioNow: vi.fn(),
        ensureAudio: vi.fn(),
        isAudioRunning: vi.fn(),
        scheduleBeep: vi.fn(),
        startFlatline: vi.fn(),
        stopFlatline: vi.fn()
    }
}));

vi.mock('vue', async importOriginal => {
    const actual = await importOriginal<typeof import('vue')>();
    return {
        ...actual,
        onUnmounted: (fn: () => void) => {
            stubs.unmountHooks.push(fn);
        }
    };
});

vi.mock('../services/stompClient', () => ({
    subscribeTopic: stubs.subscribeTopic
}));

vi.mock('../services/heartbeatAudio', () => stubs.audio);

vi.mock('./useChannelActive', () => ({
    useChannelActive: stubs.useChannelActive
}));

vi.mock('./useHeartRate', () => ({
    useHeartRate: stubs.useHeartRate
}));

const RATE = 250;
const CHUNK = 10;
const LATENCY = 0.05;

let active = ref(true);
let bpm = ref<number | null>(75);

function deliver(startIndex: number, samples: number[], latencyS = LATENCY) {
    const newestSec = (startIndex + samples.length - 1) / RATE;
    stubs.audio.audioNow.mockReturnValue(newestSec + latencyS);
    stubs.handler!({ channel: 'ecg', startIndex, sampleRate: RATE, samples });
}

function spikeAt(position: number, length = CHUNK): number[] {
    const samples = new Array<number>(length).fill(0);
    samples[position] = 1.0;
    return samples;
}

function streamSpikes(totalSamples: number, spikeIndices: number[], latencyS = LATENCY) {
    for (let start = 0; start < totalSamples; start += CHUNK) {
        const samples = Array.from({ length: CHUNK }, (_, i) =>
            spikeIndices.includes(start + i) ? 1.0 : 0
        );
        deliver(start, samples, latencyS);
    }
}

const beepCount = () => stubs.audio.scheduleBeep.mock.calls.length;

function mountComposable() {
    useHeartbeatSound();
}

beforeEach(() => {
    vi.clearAllMocks();
    stubs.unmountHooks.length = 0;
    stubs.handler = null;

    stubs.subscribeTopic.mockImplementation((_topic: string, cb: (c: WaveformChunk) => void) => {
        stubs.handler = cb;
        return stubs.unsubscribe;
    });
    stubs.audio.isAudioRunning.mockReturnValue(true);
    stubs.audio.audioNow.mockReturnValue(0);

    active = ref(true);
    bpm = ref<number | null>(75);
    stubs.useChannelActive.mockReturnValue({ active });
    stubs.useHeartRate.mockReturnValue({ bpm });
});

describe('subscription', () => {
    it('subscribes to the ECG topic on setup', () => {
        mountComposable();

        expect(stubs.subscribeTopic).toHaveBeenCalledWith(
            '/topic/waveform/ecg',
            expect.any(Function)
        );
    });
});

describe('peak detection', () => {
    it('schedules one beep for a single R-wave spike', () => {
        mountComposable();

        deliver(0, spikeAt(4));

        expect(beepCount()).toBe(1);
    });

    it('ignores peaks below the 0.5 mV threshold', () => {
        mountComposable();
        const samples = new Array(CHUNK).fill(0);
        samples[3] = 0.49;

        deliver(0, samples);

        expect(beepCount()).toBe(0);
    });
});

describe('gating', () => {
    it('does not schedule beats while the ECG is inactive', () => {
        active.value = false;
        mountComposable();

        streamSpikes(20, [5]);

        expect(beepCount()).toBe(0);
    });

    it('does not process chunks while audio is not running', () => {
        stubs.audio.isAudioRunning.mockReturnValue(false);
        mountComposable();

        deliver(0, spikeAt(4));

        expect(beepCount()).toBe(0);
        expect(stubs.audio.audioNow).not.toHaveBeenCalled();
    });

    it('ignores empty chunks', () => {
        mountComposable();

        deliver(0, []);

        expect(beepCount()).toBe(0);
    });
});

describe('flatline switching', () => {
    it('ensures audio is ready when the ECG is active on setup', () => {
        mountComposable();

        expect(stubs.audio.ensureAudio).toHaveBeenCalled();
    });

    it('starts the flatline tone when heart rate is 0 and the ECG is active', () => {
        bpm.value = 0;
        mountComposable();

        expect(stubs.audio.startFlatline).toHaveBeenCalledOnce();
    });

    it('stops the flatline when heart rate rises above 0', async () => {
        bpm.value = 0;
        mountComposable();
        stubs.audio.stopFlatline.mockClear();

        bpm.value = 75;
        await nextTick();

        expect(stubs.audio.stopFlatline).toHaveBeenCalledOnce();
    });

    it('stops the flatline when the ECG is turned off', async () => {
        bpm.value = 0;
        mountComposable();
        stubs.audio.stopFlatline.mockClear();

        active.value = false;
        await nextTick();

        expect(stubs.audio.stopFlatline).toHaveBeenCalledOnce();
    });

    it('does not start the tone when the ECG is inactive', () => {
        active.value = false;
        bpm.value = 0;
        mountComposable();

        expect(stubs.audio.startFlatline).not.toHaveBeenCalled();
        expect(stubs.audio.stopFlatline).toHaveBeenCalled();
    });

    it('starts the tone when the ECG is turned on during flatline', async () => {
        active.value = false;
        bpm.value = 0;
        mountComposable();
        stubs.audio.startFlatline.mockClear();

        active.value = true;
        await nextTick();

        expect(stubs.audio.startFlatline).toHaveBeenCalledOnce();
    });

    it('does not start the tone when heart rate is missing', () => {
        bpm.value = null;
        mountComposable();

        expect(stubs.audio.startFlatline).not.toHaveBeenCalled();
    });
});

describe('cleanup', () => {
    it('unsubscribes and stops the flatline on unmount', () => {
        mountComposable();
        stubs.audio.stopFlatline.mockClear();

        stubs.unmountHooks.forEach(hook => hook());

        expect(stubs.unsubscribe).toHaveBeenCalledOnce();
        expect(stubs.audio.stopFlatline).toHaveBeenCalledOnce();
    });
});
