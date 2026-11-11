import { onMounted, onUnmounted, ref } from "vue";
import axios from "axios";

interface VitalsResponse {
    heartRate: number;
    ampScale: number;
}

const VITALS_URL = "http://localhost:8090/api/vitals";

export function useHeartRate(intervalMs = 1000) {
    const bpm = ref<number | null>(null);
    let timer: number | undefined;

    async function refresh() {
        try {
            const res = await axios.get<VitalsResponse>(VITALS_URL);
            bpm.value = Math.round(res.data.heartRate);
        } catch {
            bpm.value = null;
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

    return { bpm };
}