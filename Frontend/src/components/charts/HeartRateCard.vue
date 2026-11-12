<script setup lang="ts">
import { useHeartRate } from '../../composables/useHeartRate'
import { useChannelActive } from '../../composables/useChannelActive'
import MonitorCard from './MonitorCard.vue'

const { bpm } = useHeartRate()
const { active, toggle } = useChannelActive('ecg')

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    toggle()
  }
}
</script>

<template>
  <MonitorCard label="HF" unit="bpm" tone="green">
    <div
        role="button"
        tabindex="0"
        class="flex h-full cursor-pointer items-center rounded-md outline-none transition-opacity focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-white/30"
        :aria-pressed="active"
        :aria-label="active ? 'Stop ECG' : 'Start ECG'"
        @click="toggle"
        @keydown="onKeydown"
    >
      <span
          class="font-extrabold leading-none tabular-nums text-[clamp(56px,7vw,110px)] text-[#22c55e] transition-opacity"
          :class="{ 'opacity-[0.35]': !active }"
      >
        {{ !active ? '--' : bpm ?? '--' }}
      </span>
    </div>
  </MonitorCard>
</template>