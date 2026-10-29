import { onUnmounted, shallowRef } from "vue";
import { subscribeTopic } from "../services/stompClient.ts";
import type { WaveformChunk } from "../types/waveform.ts";

export interface SweepPoint {
    x: number
    y: number | null
}

export function useSweepWaveform(
    channel: string,
    windowMs: number,
    sampleRate: number,
    gapMs = 40
) {
    const capacity = Math.round((windowMs * sampleRate) / 1000);
    const gapSamples = Math.round((gapMs * sampleRate) / 1000);

    const values: (number | null)[] = new Array(capacity).fill(null);
    const points = shallowRef<SweepPoint[]>([]);
    const cursorX = shallowRef(0);
    let lastIndex = -1;

    const unsubscribe = subscribeTopic<WaveformChunk>(`/topic/waveform/${channel}`, chunk => {
        for (let i = 0; i < chunk.samples.length; i++) {
            const index = chunk.startIndex + i;
            values[index % capacity] = chunk.samples[i];

            for (let j = 1; j <= gapSamples; j++) {
                values[(index + j) % capacity] = null;
            }
            lastIndex = index;
        }

        if (lastIndex < 0) return;

        const out: SweepPoint[] = new Array(capacity);
        for (let i = 0; i < capacity; i++) {
            out[i] = { x: (i * 1000) / sampleRate, y: values[i] }
        }
        points.value = out;
        cursorX.value = ((lastIndex % capacity) * 1000) / sampleRate;
    });

    onUnmounted(unsubscribe);

    return { points, cursorX };
}