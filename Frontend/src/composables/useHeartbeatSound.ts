import { computed, onUnmounted, watch } from 'vue';
import { subscribeTopic } from '../services/stompClient';
import {
    audioNow,
    ensureAudio,
    isAudioRunning,
    scheduleBeep,
    startFlatline,
    stopFlatline
} from '../services/heartbeatAudio';
import type { WaveformChunk } from '../types/waveform';
import { useChannelActive } from './useChannelActive';
import { useHeartRate } from './useHeartRate';

const RATE = 250;                             // must match the ECG source sampleRate
const R_THRESHOLD = 0.5;                      // mV, the R peak is about 1.0
const MIN_BEAT_GAP = Math.round(0.25 * RATE); // ignore re-triggers within 250 ms
const OFFSET_WINDOW = 40;                     // about 1.6 s of chunks
const SOUND_LEAD_S = 0;                       // nudge beeps earlier (+) or later (-)
const MAX_LATE_S = 0.05;                      // skip beats more than 50 ms late

export function useHeartbeatSound() {
    const { active } = useChannelActive('ecg');
    const { bpm } = useHeartRate();

    // Heart rate of 0 is the flatline state. The tone follows the same value.
    const flatline = computed(() => bpm.value === 0);

    const offsets: number[] = [];
    let prev = 0;
    let lastBeat = -Infinity;

    const unsubscribe = subscribeTopic<WaveformChunk>('/topic/waveform/ecg', chunk => {
        const n = chunk.samples.length;
        if (n === 0 || !isAudioRunning()) return;

        // Map sample time to audio time. The smallest recent offset comes from the
        // least-delayed chunk, so network jitter doesn't push beeps late.
        const newestSec = (chunk.startIndex + n - 1) / RATE;
        offsets.push(audioNow() - newestSec);
        if (offsets.length > OFFSET_WINDOW) offsets.shift();
        const base = Math.min(...offsets);

        for (let i = 0; i < n; i++) {
            const idx = chunk.startIndex + i;
            const v = chunk.samples[i];
            const rising = prev < R_THRESHOLD && v >= R_THRESHOLD;
            prev = v;

            if (!rising || idx - lastBeat < MIN_BEAT_GAP) continue;
            lastBeat = idx;

            if (!active.value) continue;

            const t = base + idx / RATE - SOUND_LEAD_S;
            if (t >= audioNow() - MAX_LATE_S) {
                scheduleBeep(Math.max(t, audioNow()));
            }
        }
    });

    watch(
        [active, flatline],
        ([on, isFlat]) => {
            if (on) ensureAudio();
            if (on && isFlat) startFlatline();
            else stopFlatline();
        },
        { immediate: true }
    );

    onUnmounted(() => {
        unsubscribe();
        stopFlatline();
    });
}
