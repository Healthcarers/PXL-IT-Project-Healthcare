import {onUnmounted, shallowRef} from "vue";
import type {Point, WaveformChunk} from "../types/waveform.ts";
import {subscribeTopic} from "../services/stompClient.ts";

export function useWaveform(channel: string, windowMs: number) {
    const points = shallowRef<Point[]>([]);

    const unsubscribe = subscribeTopic<WaveformChunk>(`/topic/waveform/${channel}`, chunk => {
        const incoming: Point[] = chunk.samples.map((y, i) => ({
            x: ((chunk.startIndex + i) / chunk.sampleRate) * 1000,
            y
        }));
        if (incoming.length === 0) return;

        const combined = points.value.concat(incoming);
        const cutoff = combined[combined.length - 1].x - windowMs;
        const firstKeep = combined.findIndex(p => p.x >= cutoff);

        points.value = firstKeep > 0 ? combined.slice(firstKeep): combined;
    });

    onUnmounted(unsubscribe);

    return { points };
}
