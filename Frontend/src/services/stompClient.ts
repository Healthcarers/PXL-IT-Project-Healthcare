import { Client, type StompSubscription } from "@stomp/stompjs";
import { ref } from "vue";

const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8090/ws";

export const connected = ref(false);

type Handler = (body: string) => void;

const handlers = new Map<string, Set<Handler>>();
const subscriptions = new Map<string, StompSubscription>();
let client: Client | null = null;

function subscribeIfNeeded(topic: string) {
    if (!client?.connected || subscriptions.has(topic)) return;
    const sub = client.subscribe(topic, msg => {
        handlers.get(topic)?.forEach(h => h(msg.body));
    });
    subscriptions.set(topic, sub);
}

function ensureClient() {
    if (client) return;
    client = new Client({
        brokerURL: WS_BASE_URL,
        reconnectDelay: 3000,
        onConnect: () => {
            connected.value = true;
            handlers.forEach((_, topic) => subscribeIfNeeded(topic));
        },
        onWebSocketClose: () => {
            connected.value = false;
            subscriptions.clear();
        },
        onStompError: frame => {
            console.error('[stomp]', frame.headers['message'], frame.body);
        }
    });
    client.activate();
}

export function subscribeTopic<T>(topic: string, onMessage: (msg: T) => void): () => void {
    ensureClient();

    const handler: Handler = body => onMessage(JSON.parse(body) as T);

    let set = handlers.get(topic);
    if (!set) {
        set = new Set();
        handlers.set(topic, set);
    }
    set.add(handler);
    subscribeIfNeeded(topic);

    return () => {
        const current = handlers.get(topic);
        if (!current) return;
        current.delete(handler);
        if (current.size === 0) {
            handlers.delete(topic);
            subscriptions.get(topic)?.unsubscribe();
            subscriptions.delete(topic);
        }
    };
}