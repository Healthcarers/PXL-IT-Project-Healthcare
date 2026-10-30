import { onMounted, onUnmounted, ref } from "vue";
import axios from "axios";

export interface VitalsResponse {
    heartRate: number;
    spo2: number;
    ampScale: number;
}

const VITALS_URL = "http://localhost:8090/api/vitals";

export function useVitals(intervalMs = 1000) {
    const vitals = ref<VitalsResponse | null>(null);
    let timer: number | undefined;

    async function refresh() {
        try {
            const res = await axios.get(VITALS_URL);
            vitals.value = {
                heartRate: Math.round(res.data.heartRate),
                spo2: Math.round(res.data.spo2),
                ampScale: res.data.ampScale
            };
            console.log(vitals.value)
        } catch {
            vitals.value = null;
        }
    }

    onMounted(() => {
        refresh();
        timer = window.setInterval(refresh, intervalMs);
    });

    onUnmounted(() => {
        if (timer !== undefined) {
            window.clearInterval(timer);
        }
    });

    return { vitals };
}
