import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WaveformChunk } from '../types/waveform.ts';
import { useSweepWaveform } from './useSweepWaveform';

const stubs = vi.hoisted(() => ({
    handler: null as null | ((chunk: WaveformChunk) => void),
    topic: '',
    unsubscribe: vi.fn(),
    subscribeTopic: vi.fn(),
    unmountHooks: [] as Array<() => void>
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

vi.mock('../services/stompClient.ts', () => ({
    subscribeTopic: stubs.subscribeTopic
}));

const WINDOW_MS = 160;
const RATE = 250;
const CAPACITY = 40;
const GAP = 10;

beforeEach(() => {
    vi.clearAllMocks();
    stubs.unmountHooks.length = 0;
    stubs.handler = null;
    stubs.subscribeTopic.mockImplementation((topic: string, cb: (c: WaveformChunk) => void) => {
        stubs.topic = topic;
        stubs.handler = cb;
        return stubs.unsubscribe;
    });
});

function mount(channel = 'ecg') {
    return useSweepWaveform(channel, WINDOW_MS, RATE);
}

function deliver(startIndex: number, samples: number[]) {
    stubs.handler!({ channel: 'ecg', startIndex, sampleRate: RATE, samples });
}

const ys = (points: { value: { y: number | null }[] }) => points.value.map(p => p.y);

describe('subscription', () => {
    it('subscribes to the topic for the given channel', () => {
        mount('ecg');

        expect(stubs.topic).toBe('/topic/waveform/ecg');
    });

    it('starts with no points and a cursor at zero', () => {
        const { points, cursorX } = mount();

        expect(points.value).toEqual([]);
        expect(cursorX.value).toBe(0);
    });
});

describe('ring buffer', () => {
    it('places each sample at its index modulo the capacity', () => {
        const { points } = mount();

        deliver(0, [1, 2, 3]);

        expect(ys(points).slice(0, 3)).toEqual([1, 2, 3]);
    });

    it('emits a point for every slot in the window', () => {
        const { points } = mount();

        deliver(0, [1]);

        expect(points.value).toHaveLength(CAPACITY);
    });

    it('overwrites the oldest slot when the index wraps past the capacity', () => {
        const { points } = mount();
        deliver(0, new Array(CAPACITY).fill(1));

        deliver(CAPACITY, [99]);

        expect(points.value[0].y).toBe(99);
        expect(points.value[1].y).toBe(null);
    });

    it('keeps a full sweep of values until the cursor reaches them', () => {
        const { points } = mount();
        deliver(0, new Array(CAPACITY).fill(1));

        deliver(CAPACITY, [7]);

        expect(points.value[11].y).toBe(1);
        expect(points.value[39].y).toBe(1);
    });
});

describe('sweep erase gap', () => {
    it('clears the gapSamples slots ahead of the newest sample', () => {
        const { points } = mount();
        deliver(0, new Array(CAPACITY).fill(1));

        deliver(CAPACITY, [7]);

        for (let i = 1; i <= GAP; i++) {
            expect(points.value[i].y).toBe(null);
        }
    });

    it('wraps the gap past the end of the buffer', () => {
        const { points } = mount();
        deliver(0, new Array(35).fill(1));

        deliver(35, [5]);

        expect(points.value[36].y).toBe(null);
        expect(points.value[39].y).toBe(null);
        expect(points.value[0].y).toBe(null);
        expect(points.value[5].y).toBe(null);
        expect(points.value[6].y).toBe(1);
    });

    it('lets later samples overwrite the gap as the cursor advances', () => {
        const { points } = mount();
        deliver(0, [1, 2, 3]);

        expect(points.value[3].y).toBe(null);
        deliver(3, [4]);
        expect(points.value[3].y).toBe(4);
        expect(points.value[4].y).toBe(null);
    });
});

describe('unsubscribe on unmount', () => {
    it('calls the unsubscribe function returned by subscribeTopic', () => {
        mount();

        stubs.unmountHooks.forEach(hook => hook());

        expect(stubs.unsubscribe).toHaveBeenCalledOnce();
    });

    it('does not unsubscribe before the component unmounts', () => {
        mount();

        expect(stubs.unsubscribe).not.toHaveBeenCalled();
    });
});
