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
import {useVitals} from "./useVitals.ts";

const RATE = 250;                             // must match the ECG source sampleRate
const R_THRESHOLD = 0.5;                      // mV, the R peak is about 1.0
const MIN_BEAT_GAP = Math.round(0.25 * RATE); // ignore re-triggers within 250 ms
const OFFSET_WINDOW = 40;                     // about 1.6 s of chunks
const SOUND_LEAD_S = 0;                       // nudge beeps earlier (+) or later (-)
const MAX_LATE_S = 0.05;                      // skip beats more than 50 ms late

const NORMAL_SPO2 = 98;                       // reference point, plays at BEEP_BASE_HZ
const MIN_SPO2 = 70;                          // clamp so extreme values stay audible
const MAX_SPO2 = 100;
const BEEP_BASE_HZ = 880;                     // set this to the current beep frequency

export function spo2ToFrequency(spo2: number, baseHz: number = BEEP_BASE_HZ): number {
    const clamped = Math.min(MAX_SPO2, Math.max(MIN_SPO2, spo2));
    const semitones = clamped - NORMAL_SPO2;   // negative when SpO2 drops
    return baseHz * Math.pow(2, semitones / 12);
}

export function useHeartbeatSound() {
    const { active } = useChannelActive('ecg');
    const { vitals } = useVitals();
    const bpm = computed(() => vitals.value?.heartRate ?? null);

    // Fall back to the normal reading until the first vitals message arrives.
    const spo2 = computed(() => vitals.value?.spo2 ?? NORMAL_SPO2);
    const beepHz = computed(() => spo2ToFrequency(spo2.value));

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
                scheduleBeep(Math.max(t, audioNow()), beepHz.value);
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