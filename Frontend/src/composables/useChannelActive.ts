import {computed, reactive} from "vue";

const channelState = reactive<Record<string, boolean>>({});

export function useChannelActive(channel: string) {
    const active = computed<boolean>({
        get: () => channelState[channel] ?? false,
        set: value => {
            channelState[channel] = value;
        }
    });

    function toggle() {
        active.value = !active.value;
    }

    return { active, toggle };
}