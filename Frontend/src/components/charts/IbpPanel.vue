<script setup lang="ts">

import MonitorCard from "./MonitorCard.vue";
import SweepChart from "./SweepChart.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";

const WINDOW_MS = 4000;
const SAMPLE_RATE = 125;

const { active } = useChannelActive('ibp');
const { points, cursorX } = useSweepWaveform('ibp', WINDOW_MS, SAMPLE_RATE);
</script>

<template>
  <MonitorCard label="Ibp" unit="" tone="red">
    <SweepChart
      v-model:active="active"
      :points="points"
      :cursor-x="cursorX"
      :window-ms="WINDOW_MS"
      :y-min="-10"
      :y-max="210"
      :show-cursor="true"
      color="#ff0707"
    />
  </MonitorCard>
</template>

<style scoped>

</style>