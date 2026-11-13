<script setup lang="ts">
import {useVitals} from "../../composables/useVitals.ts";
import MonitorCard from "./MonitorCard.vue";
import {ref} from "vue";

const { vitals } = useVitals();
const active = ref<boolean>(false);

function toggle(): void {
  active.value = !active.value;
}
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
      {{ !active || vitals?.sysBloodPressure == null ? '--' : `${vitals.sysBloodPressure}/${vitals.diasBloodPressure}` }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>