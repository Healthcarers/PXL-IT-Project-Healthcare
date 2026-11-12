import { onMounted, onUnmounted, ref } from "vue";
import axios from "axios";

interface VitalsResponse {
    heartRate: number;
    ampScale: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8090";
const VITALS_URL = `${API_BASE_URL}/vitals`;

export function useHeartRate(intervalMs = 1000) {
    const bpm = ref<number | null>(null);
    let timer: number | undefined;

    async function refresh() {
        try {
            const res = await axios.get<VitalsResponse>(VITALS_URL, {
                withCredentials: true
            });
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