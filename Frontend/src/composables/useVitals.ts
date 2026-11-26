
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
    const error = ref("");

    watch(
        [room, connected],
        async ([code], _, onCleanup) => {
            let active = true;
            let receivedMessage = false;

            vitals.value = null;
            error.value = "";

            const unsubscribe = subscribeTopic<VitalsResponse>(
                monitorTopic(code, "vitals"),
                (msg) => {
                    if (!active) return;

                    receivedMessage = true;
                    vitals.value = msg;
                    error.value = "";
                }
            );

            onCleanup(() => {
                active = false;
                unsubscribe();
            });

            if (!connected.value) return;

            try {
                const path = code
                    ? `/rooms/${encodeURIComponent(code)}/vitals`
                    : "/vitals";

                const response = await api.get<VitalsResponse>(path);

                if (active && !receivedMessage) {
                    vitals.value = response.data;
                    error.value = "";
                }
            } catch (cause) {
                if (active && !receivedMessage) {
                    error.value =
                        "De monitorwaarden konden niet worden opgehaald.";

                    console.error(error.value, cause);
                }
            }
        },
        { immediate: true }
    );

    return { vitals, error };
}
