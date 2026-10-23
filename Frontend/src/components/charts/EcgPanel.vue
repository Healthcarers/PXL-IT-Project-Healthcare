<script setup lang="ts">
import {useWaveform} from "../../composables/useWaveform.ts";
import WaveformChart from "./WaveformChart.vue";

const WINDOW_MS = 4000;
const { points } = useWaveform('ecg', WINDOW_MS);
</script>

<template>
  <div class="panel">
    <WaveformChart
      :points="points"
      :window-ms="WINDOW_MS"
      :y-min="-1"
      :y-max="2"
      color="#22c55e"
      grid-color="rgba(255, 60, 60, 0.18)"
      :grid-step-x="200"
      :grid-step-y="0.5"
    />
  </div>
</template>

<style scoped>
.panel {
  flex: 1;
  min-height: 0;
}
</style>