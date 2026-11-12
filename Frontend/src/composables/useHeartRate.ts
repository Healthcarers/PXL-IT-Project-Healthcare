import { onUnmounted, ref } from "vue";
import api from "../services/refreshService";

interface VitalsResponse {
    heartRate: number;
    ampScale: number;
}

const VITALS_URL = "/vitals";
const POLL_INTERVAL_MS = 1000;

const bpm = ref<number | null>(null);

let timer: number | undefined;
let subscribers = 0;
let inFlight: Promise<void> | null = null;

async function refresh(): Promise<void> {
    if (inFlight) return inFlight;

    inFlight = (async () => {
        try {
            const res = await api.get<VitalsResponse>(VITALS_URL);
            bpm.value = Math.round(res.data.heartRate);
        } catch {
            bpm.value = null;
        } finally {
            inFlight = null;
        }
    })();

    return inFlight;
}

function acquire() {
    subscribers++;
    if (subscribers === 1) {
        void refresh();
        timer = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    }
}

function release() {
    subscribers--;
    if (subscribers === 0 && timer !== undefined) {
        window.clearInterval(timer);
        timer = undefined;
    }
}

export function useHeartRate() {
    acquire();
    onUnmounted(release);

    return { bpm };
}