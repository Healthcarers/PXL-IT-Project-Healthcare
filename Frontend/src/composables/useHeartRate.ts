import { onMounted, onUnmounted, ref } from "vue";

const VITALS_URL = 'http://localhost:8090/api/vitals';

export function useHeartRate(intervalMs = 1000) {
    const bpm = ref<number | null>(null);
    let timer: number | undefined;

    async function refresh() {
        try {
            const res = await fetch(VITALS_URL)
            if (!res.ok) {
                bpm.value = null;
                return;
            }
            const data: { heartRate: number } = await res.json();
            bpm.value = Math.round(data.heartRate);
        } catch {
            bpm.value = null;
        }
    }

    onMounted(() => {
        refresh();
        timer = window.setInterval(refresh, intervalMs);
    });

    onUnmounted(() => {
        clearInterval(timer);
    });

    return { bpm };
}