<script setup lang="ts">
import {useVitals} from "../../composables/useVitals.ts";
import {useChannelActive} from "../../composables/useChannelActive.ts";
import MonitorCard from "./MonitorCard.vue";

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('spo2');

</script>

<template>
  <MonitorCard label="SpO2" tone="blue" unit="%">
    <div
      role="button"
      class="flex h-full cursor-pointer items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      :aria-pressed="active"
      :aria-label="active ? 'Stop SpO2' : 'Start SpO2'"
      @click="toggle"
    >
      <span class="font-extrabold text-[#38bdf8] leading-none tabular-nums text-[clamp(40px,5vw,72px)] transition-opacity"
            :class="{ 'opacity-[0.35]': !active }"
      >
        {{ !active ? '--' : (vitals?.spo2 ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>