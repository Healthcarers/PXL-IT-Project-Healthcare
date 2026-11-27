<script setup lang="ts">
import { computed } from "vue";
import {useVitals} from "../../composables/useVitals.ts";
import {useChannelActive} from "../../composables/useChannelActive.ts";
import MonitorCard from "./MonitorCard.vue";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('spo2');
const isActive = computed(() => props.preview || active.value);

function handleToggle() {
  if (props.preview) return;
  toggle();
}
</script>

<template>
  <MonitorCard label="SpO2" tone="blue" unit="%">
    <div
      :role="preview ? undefined : 'button'"
      class="flex h-full items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      :class="{ 'cursor-pointer': !preview }"
      :aria-pressed="preview ? undefined : isActive"
      :aria-label="preview ? undefined : (isActive ? 'Stop SpO2' : 'Start SpO2')"
      @click="handleToggle"
    >
      <span class="font-extrabold text-[#38bdf8] leading-none tabular-nums transition-opacity"
            :class="[
              preview ? 'text-[56px]' : 'text-[clamp(24px,4.5vh,64px)]',
              { 'opacity-[0.35]': !isActive },
            ]"
      >
        {{ !isActive ? '--' : (vitals?.spo2 ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>