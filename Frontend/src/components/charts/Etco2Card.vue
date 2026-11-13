<script setup lang="ts">
import {useVitals} from "../../composables/useVitals.ts";
import {useChannelActive} from "../../composables/useChannelActive.ts";
import MonitorCard from "./MonitorCard.vue";

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('etco2');
</script>

<template>
  <MonitorCard label="etCO2" tone="yellow" unit="mmHg">
    <div
        role="button"
        class="flex h-full cursor-pointer items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
        :aria-pressed="active"
        :aria-label="active ? 'Stop etCO2' : 'Start etCO2'"
        @click="toggle"
    >
      <span class="font-extrabold text-[#facc15] leading-none tabular-nums text-[clamp(40px,5vw,72px)] transition-opacity"
            :class="{ 'opacity-[0.35]': !active }"
      >
        {{ !active ? '--' : (vitals?.etco2 ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>