import { ref, watch } from "vue";
import api from "../services/refreshService.ts";
import { connected, subscribeTopic } from "../services/stompClient.ts";
import { monitorTopic, useMonitorRoom } from "./useMonitorRoom";

export interface VitalsResponse {
    heartRate: number;
    spo2: number;
    etco2: number;
    respRate: number;
    ampScale: number;
    sysIbp: number;
    diasIbp: number;
}

export function useVitals() {
    const room = useMonitorRoom();
    const vitals = ref<VitalsResponse | null>(null);
    const error = ref('');
    watch([room, connected], async ([code], _, onCleanup) => {
        let active = true;
        let receivedMessage = false;
        vitals.value = null;
        const unsubscribe = subscribeTopic<VitalsResponse>(monitorTopic(code, 'vitals'), msg => {
            if (!active) return;
            receivedMessage = true;
            vitals.value = msg;
            error.value = '';
        });
        onCleanup(() => {
            active = false;
            unsubscribe();
        });
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
            const path = code ? `/rooms/${encodeURIComponent(code)}/vitals` : '/vitals';
            const res = await api.get<VitalsResponse>(path);
            if (active && !receivedMessage) {
                vitals.value = res.data;
                error.value = '';
            }
        } catch (cause) {
            if (active && !receivedMessage) {
                error.value = 'De monitorwaarden konden niet worden opgehaald.';
                console.error(error.value, cause);
            }
        }
    }, { immediate: true });
    return { vitals, error };
}
