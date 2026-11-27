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
const { active, toggle } = useChannelActive('etco2');
const isActive = computed(() => props.preview || active.value);

function handleToggle() {
  if (props.preview) return;
  toggle();
}
</script>

<template>
  <MonitorCard label="etCO2" tone="yellow" unit="mmHg">
    <div
        :role="preview ? undefined : 'button'"
        class="flex h-full items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
        :class="{ 'cursor-pointer': !preview }"
        :aria-pressed="preview ? undefined : isActive"
        :aria-label="preview ? undefined : (isActive ? 'Stop etCO2' : 'Start etCO2')"
        @click="handleToggle"
    >
      <span class="font-extrabold text-[#facc15] leading-none tabular-nums transition-opacity"
            :class="[
              preview ? 'text-[56px]' : 'text-[clamp(24px,4.5vh,64px)]',
              { 'opacity-[0.35]': !isActive },
            ]"
      >
        {{ !isActive ? '--' : (vitals?.etco2 ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>