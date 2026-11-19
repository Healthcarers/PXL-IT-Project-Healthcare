<script setup lang="ts">
import { computed } from "vue";
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import SweepChart from "./SweepChart.vue";
import MonitorCard from "./MonitorCard.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";
import {useHeartbeatSound} from "../../composables/useHeartbeatSound.ts";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const WINDOW_MS = 4000;
const SAMPLE_RATE = 250;

const { points, cursorX } = useSweepWaveform('ecg', WINDOW_MS, SAMPLE_RATE);
const channel = useChannelActive('ecg');

const active = computed<boolean>({
  get: () => (props.preview ? true : channel.active.value),
  set: (value) => {
    if (!props.preview) {
      channel.active.value = value;
    }
  },
});

if (!props.preview) {
  useHeartbeatSound();
}
</script>

<template>
  <MonitorCard label="ECG II" color="#22c55e" tone="green">
      <SweepChart
          v-model:active="active"
          :points="points"
          :cursor-x="cursorX"
          :window-ms="WINDOW_MS"
          :y-min="-1"
          :y-max="2"
          color="#22c55e"
          :show-cursor="true"
          :interactive="!preview"
      />
  </MonitorCard>
</template>