<script setup lang="ts">
import { computed } from 'vue';
import { useVitals } from '../../composables/useVitals';
import { useChannelActive } from '../../composables/useChannelActive';
import MonitorCard from './MonitorCard.vue';

const props = withDefaults(defineProps<{
  preview?: boolean;
}>(), {
  preview: false,
});

const { vitals } = useVitals();
const { active, toggle } = useChannelActive('ecg');
const isActive = computed(() => props.preview || active.value);

function handleToggle() {
  if (props.preview) return;
  toggle();
}
</script>

<template>
  <MonitorCard label="HF" unit="bpm" tone="green">
    <div
        :role="preview ? undefined : 'button'"
        class="flex h-full items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
        :class="{ 'cursor-pointer': !preview }"
        :aria-pressed="preview ? undefined : isActive"
        :aria-label="preview ? undefined : (isActive ? 'Stop ECG' : 'Start ECG')"
        @click="handleToggle"
        :tabIndex="preview ? undefined : 0"
        @keydown="handleToggle"
    >
      <span
          class="font-extrabold leading-none tabular-nums text-[#22c55e] transition-opacity"
          :class="[
            preview ? 'text-[56px]' : 'text-[clamp(40px,5vw,72px)]',
            { 'opacity-[0.35]': !isActive },
          ]"
      >
        {{ !isActive ? '--' : (vitals?.heartRate ?? '--') }}
      </span>
    </div>
  </MonitorCard>
</template>