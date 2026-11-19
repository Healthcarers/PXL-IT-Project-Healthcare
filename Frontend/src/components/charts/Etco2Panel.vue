<script setup lang="ts">
import { computed } from "vue";
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import MonitorCard from "./MonitorCard.vue";
import SweepChart from "./SweepChart.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const WINDOW_MS = 10000;
const SAMPLE_RATE = 50;

const { points, cursorX } = useSweepWaveform('etco2', WINDOW_MS, SAMPLE_RATE);
const channel = useChannelActive('etco2');

const active = computed<boolean>({
  get: () => (props.preview ? true : channel.active.value),
  set: (value) => {
    if (!props.preview) {
      channel.active.value = value;
    }
  },
});
</script>

<template>
  <MonitorCard label="etCO2" unit="" tone="yellow">
    <SweepChart
        v-model:active="active"
        :points="points"
        :cursor-x="cursorX"
        :window-ms="WINDOW_MS"
        :y-min="-10"
        :y-max="110"
        color="#facc15"
        :show-cursor="true"
        :interactive="!preview"
    />
  </MonitorCard>
</template>

<style scoped>

</style>