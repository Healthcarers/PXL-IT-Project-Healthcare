<script setup lang="ts">
import { computed } from 'vue'
import { useChannelActive } from '../../composables/useChannelActive'
import { useVitals } from '../../composables/useVitals'
import MonitorCard from './MonitorCard.vue'

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false })
const { vitals } = useVitals()
const { active, toggle } = useChannelActive('temperature')
const isActive = computed(() => props.preview || active.value)

function handleToggle() {
  if (!props.preview) toggle()
}
</script>

<template>
  <MonitorCard label="Temperatuur" unit="°C" tone="white">
    <div
      :role="preview ? undefined : 'button'"
      :tabindex="preview ? undefined : 0"
      :aria-pressed="preview ? undefined : isActive"
      :aria-label="preview ? undefined : (isActive ? 'Stop temperatuur' : 'Start temperatuur')"
      class="flex h-full items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
      :class="{ 'cursor-pointer': !preview }"
      @click="handleToggle"
      @keydown.enter.prevent="handleToggle"
      @keydown.space.prevent="handleToggle"
    >
      <span class="font-extrabold leading-none tabular-nums text-white transition-opacity"
        :class="[preview ? 'text-[56px]' : 'text-[clamp(40px,5vw,72px)]', { 'opacity-[0.35]': !isActive }]">
        {{ isActive && vitals?.temperature != null ? vitals.temperature.toFixed(1) : '--' }}
      </span>
    </div>
  </MonitorCard>
</template>
