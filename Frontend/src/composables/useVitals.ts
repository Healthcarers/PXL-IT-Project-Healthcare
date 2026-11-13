import { onUnmounted, ref } from "vue";
import api from "../services/refreshService.ts";

export interface VitalsResponse {
    heartRate: number;
    spo2: number;
    etco2: number;
    respRate: number;
    ampScale: number;
}

const VITALS_URL = "/vitals";
const POLL_INTERVAL_MS = 1000;

const vitals = ref<VitalsResponse | null>(null);

let timer: number | undefined;
let subscribers = 0;
let inFlight: Promise<void> | null = null;

async function refresh(): Promise<void> {
    if (inFlight) return inFlight;

    inFlight = (async () =>  {
        try {
            const res = await api.get<VitalsResponse>(VITALS_URL);
            vitals.value = {
                heartRate: Math.round(res.data.heartRate),
                spo2: Math.round(res.data.spo2),
                etco2: Math.round(res.data.etco2),
                respRate: Math.round(res.data.respRate),
                ampScale: res.data.ampScale
            };
        } catch {
            vitals.value = null;
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

export function useVitals() {
    acquire();
    onUnmounted(release);

    return { vitals };
}
