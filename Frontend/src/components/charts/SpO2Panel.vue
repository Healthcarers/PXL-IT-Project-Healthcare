<script setup lang="ts">
import { computed } from "vue";
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import SweepChart from "./SweepChart.vue";
import MonitorCard from "./MonitorCard.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const WINDOW_MS = 4000;
const SAMPLE_RATE = 125;

const { points, cursorX } = useSweepWaveform('spo2', WINDOW_MS, SAMPLE_RATE);
const channel = useChannelActive('spo2');

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
  <MonitorCard label="Pleth" tone="blue">
    <SweepChart
        v-model:active="active"
        :points="points"
        :cursor-x="cursorX"
        :window-ms="WINDOW_MS"
        :y-min="-1"
        :y-max="2"
        color="#38bdf8"
        :show-cursor="true"
        :interactive="!preview"
    />
  </MonitorCard>
</template>