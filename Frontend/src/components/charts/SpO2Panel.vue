<script setup lang="ts">
import {useSweepWaveform} from "../../composables/useSweepWaveform.ts";
import SweepChart from "./SweepChart.vue";
import MonitorCard from "./MonitorCard.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const WINDOW_MS = 4000;
const SAMPLE_RATE = 125;

const { points, cursorX } = useSweepWaveform('spo2', WINDOW_MS, SAMPLE_RATE);
const { active } = useChannelActive('spo2');
</script>

<template>
  <MonitorCard label="Pleth" color="#22c55e" tone="blue">
    <SweepChart
        v-model:active="active"
        :points="points"
        :cursor-x="cursorX"
        :window-ms="WINDOW_MS"
        :y-min="-1"
        :y-max="2"
        color="#38bdf8"
        :show-cursor="false"
    />
  </MonitorCard>
</template>