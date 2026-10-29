<script setup lang="ts">
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import SweepChart from "./SweepChart.vue";
import MonitorCard from "./MonitorCard.vue";

const WINDOW_MS = 4000;
const SAMPLE_RATE = 250;

const { points, cursorX } = useSweepWaveform('ecg', WINDOW_MS, SAMPLE_RATE);
</script>

<template>
  <MonitorCard label="ECG II" color="#22c55e">
      <SweepChart
          :points="points"
          :cursor-x="cursorX"
          :window-ms="WINDOW_MS"
          :y-min="-1"
          :y-max="2"
          color="#22c55e"
          :show-cursor="false"
      />
  </MonitorCard>
</template>

<style scoped>
.panel {
  display: flex;
  flex: 1;
  min-height: 0;
  height: 100%;
}

.chart {
  flex: 1;
  min-width: 0;
  height: 100%;
}
</style>