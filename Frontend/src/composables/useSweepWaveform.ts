import { shallowRef, watch } from "vue";
import { subscribeTopic } from "../services/stompClient.ts";
import type { WaveformChunk } from "../types/waveform.ts";
import { monitorTopic, useMonitorRoom } from "./useMonitorRoom";
import { createSweepBuffer } from './sweepBuffer';

export interface SweepPoint {
    x: number;
    y: number | null;
}

export function useSweepWaveform(
    channel: string,
    windowMs: number,
    sampleRate: number,
    gapMs = 40
) {
    const capacity = Math.round((windowMs * sampleRate) / 1000);
    const gapSamples = Math.round((gapMs * sampleRate) / 1000);

    const buffer = createSweepBuffer(capacity, sampleRate, gapSamples);
    const points = shallowRef<SweepPoint[]>([]);
    const cursorX = shallowRef(0);
    const room = useMonitorRoom();

    watch(room, (code, _, onCleanup) => {
        buffer.reset();
        points.value = [];
        cursorX.value = 0;
        const unsubscribe = subscribeTopic<WaveformChunk>(monitorTopic(code, `waveform/${channel}`), chunk => {
            buffer.add(chunk.startIndex, chunk.samples);
            if (!buffer.hasSamples()) return;
            points.value = buffer.points();
            cursorX.value = buffer.cursorX();
        });
        onCleanup(unsubscribe);
    }, { immediate: true });

    return { points, cursorX };
}
