<script setup lang="ts">
import { useHeartRate } from '../../composables/useHeartRate'
import MonitorCard from './MonitorCard.vue'

const { bpm } = useHeartRate();
</script>

<template>
  <MonitorCard label="HF" unit="bpm" color="#22c55e">
    <div class="value-row">
      <span class="value">{{ bpm ?? '--' }}</span>
    </div>
  </MonitorCard>
</template>

<style scoped>
.value-row {
  height: 100%;
  display: flex;
  align-items: center;
}

.value {
  font-size: clamp(56px, 7vw, 110px);
  font-weight: 800;
  line-height: 1;
  color: #22c55e;
  font-variant-numeric: tabular-nums;
}
</style>