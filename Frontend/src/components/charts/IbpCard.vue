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
const { active, toggle } = useChannelActive('ibp');
const isActive = computed(() => props.preview || active.value);

function handleToggle(): void {
  if (props.preview) return;
  toggle();
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
      @click="handleToggle"
    >
      <span class="font-extrabold text-[#ff0707] leading-none tabular-nums transition-opacity"
      :class="[
        preview ? 'text-[46px]' : 'text-[clamp(40px,5vw,72px)]',
        { 'opacity-[0.35]': !isActive },
      ]">
        {{ !isActive || vitals?.sysBp == null || vitals?.diasBp == null ? '--' : `${vitals.sysBp}/${vitals.diasBp}` }}
      </span>
    </div>
  </MonitorCard>
</template>

<style scoped>

</style>
