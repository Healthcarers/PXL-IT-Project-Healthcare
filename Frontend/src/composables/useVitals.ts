import { ref, watch } from "vue";
import api from "../services/refreshService.ts";
import { connected, subscribeTopic } from "../services/stompClient.ts";
import type { VitalsResponse } from "../types/vitals";

const VITALS_URL = "/vitals";
const VITALS_TOPIC = "/topic/vitals";
const vitals = ref<VitalsResponse | null>(null);
let started = false;

function normalize(v: VitalsResponse): VitalsResponse {
    return {
        heartRate: Math.round(v.heartRate),
        spo2: Math.round(v.spo2),
        etco2: Math.round(v.etco2),
        respRate: Math.round(v.respRate),
        ampScale: v.ampScale,
        sysIbp: Math.round(v.sysIbp),
        diasIbp: Math.round(v.diasIbp),
    };
}

function start(): void {
    if (started) return;
    started = true;

    subscribeTopic<VitalsResponse>(VITALS_TOPIC, msg => {
       vitals.value = normalize(msg);
    });

    watch(connected, async isConnected => {
        if (!isConnected) return;
        let previous = vitals.value;
        try {
            const res = await api.get<VitalsResponse>(VITALS_URL);
            vitals.value = normalize(res.data);
        } catch {
            vitals.value = previous;
        }
    }, { immediate: true });
}

export function useVitals() {
    start();
    return { vitals };
}
