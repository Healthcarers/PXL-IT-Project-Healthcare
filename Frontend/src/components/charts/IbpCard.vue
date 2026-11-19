<script setup lang="ts">
import {useVitals} from "../../composables/useVitals.ts";
import MonitorCard from "./MonitorCard.vue";
import {useChannelActive} from "../../composables/useChannelActive.ts";

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('ibp');
</script>

<template>
  <MonitorCard label="IBP" tone="red" unit="mmHg">
    <div
      role="button"
      class="flex h-full cursor-pointer items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      :aria-pressed="active"
      :aria-label="active ? 'Stop IBP' : 'Start IBP'"
      @click="toggle"
    >
      <span class="font-extrabold text-[#ff0707] leading-none tabular-nums text-[clamp(40px,5vw,72px)] transition-opacity"
      :class="{ 'opacity-[0.35]': !active }">
        {{ !active || vitals?.sysIbp == null || vitals?.diasIbp == null ? '--' : `${vitals.sysIbp}/${vitals.diasIbp}` }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>