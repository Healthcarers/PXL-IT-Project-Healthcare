<script setup lang="ts">
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import SweepChart from "./SweepChart.vue";
import MonitorCard from "./MonitorCard.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const WINDOW_MS = 4000;
const SAMPLE_RATE = 250;

const { points, cursorX } = useSweepWaveform('ecg', WINDOW_MS, SAMPLE_RATE);
const { active } = useChannelActive('ecg');
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
          :show-cursor="false"
      />
  </MonitorCard>
</template>