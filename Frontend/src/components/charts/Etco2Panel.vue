<script setup lang="ts">
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import MonitorCard from "./MonitorCard.vue";
import SweepChart from "./SweepChart.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const WINDOW_MS = 10000;
const SAMPLE_RATE = 50;

const { points, cursorX } = useSweepWaveform('etco2', WINDOW_MS, SAMPLE_RATE);
const { active } = useChannelActive('etco2');
</script>

<template>
  <MonitorCard label="etCO2" unit="mmHg" tone="yellow">
    <SweepChart
        v-model:active="active"
        :points="points"
        :cursor-x="cursorX"
        :window-ms="WINDOW_MS"
        :y-min="-10"
        :y-max="60"
        color="#facc15"
        :show-cursor="true"
    />
  </MonitorCard>
</template>

<style scoped>

</style>