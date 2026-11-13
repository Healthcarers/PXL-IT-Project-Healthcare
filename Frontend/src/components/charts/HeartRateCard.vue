<script setup lang="ts">
import { useVitals } from '../../composables/useVitals';
import { useChannelActive } from '../../composables/useChannelActive';
import MonitorCard from './MonitorCard.vue';

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('ecg');

</script>

<template>
  <MonitorCard label="HF" unit="bpm" tone="green">
    <div
        role="button"
        class="flex h-full cursor-pointer items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
        :aria-pressed="active"
        :aria-label="active ? 'Stop ECG' : 'Start ECG'"
        @click="toggle"
        tabIndex="0"
        @keydown="toggle"
    >
      <span
          class="font-extrabold leading-none tabular-nums text-[clamp(56px,7vw,110px)] text-[#22c55e] transition-opacity"
          :class="{ 'opacity-[0.35]': !active }"
      >
        {{ !active ? '--' : (vitals?.heartRate ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>