<script setup lang="ts">
import { computed, ref } from "vue";
import {useVitals} from "../../composables/useVitals.ts";
import MonitorCard from "./MonitorCard.vue";

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const { vitals } = useVitals();
const active = ref<boolean>(false);
const isActive = computed(() => props.preview || active.value);

function toggle(): void {
  if (props.preview) return;
  active.value = !active.value;
}
</script>

<template>
  <MonitorCard label="IBP" tone="red" unit="mmHg">
    <div
      :role="preview ? undefined : 'button'"
      class="flex h-full items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      :class="{ 'cursor-pointer': !preview }"
      :aria-pressed="preview ? undefined : isActive"
      :aria-label="preview ? undefined : (isActive ? 'Stop IBP' : 'Start IBP')"
      @click="toggle"
    >
      <span class="font-extrabold text-[#ff0707] leading-none tabular-nums transition-opacity"
      :class="[
        preview ? 'text-[46px]' : 'text-[clamp(40px,5vw,72px)]',
        { 'opacity-[0.35]': !isActive },
      ]">
      {{ !isActive || vitals?.sysBloodPressure == null ? '--' : `${vitals.sysBloodPressure}/${vitals.diasBloodPressure}` }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>