<script setup lang="ts">
import { ref } from 'vue'
import { connected } from '../services/stompClient.ts'
import PatientMonitorGrid from '../components/charts/PatientMonitorGrid.vue'
import DefibrillatorPanel from '../components/defibrillator/DefibrillatorPanel.vue'

const showDefibrillator = ref(false)

function toggleDefibrillator() {
  showDefibrillator.value = !showDefibrillator.value
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col box-border bg-[#050506] text-white">
    <div class="flex h-11 shrink-0 items-center justify-between gap-4 border-b border-[#1a1a1d] px-5">
      <div class="flex items-center gap-2 text-xs text-[#8b8b94]">
        <span
          class="size-2.5 rounded-full"
          :class="connected ? 'bg-green-500' : 'bg-[#555]'"
          :title="connected ? 'Connected' : 'Disconnected'"
        />
        <span>{{ connected ? 'Live verbonden' : 'Niet verbonden' }}</span>
      </div>

      <button
        type="button"
        data-testid="toggle-defibrillator"
        class="cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors"
        :class="showDefibrillator
          ? 'border border-[#383842] bg-[#141418] text-white hover:bg-[#1e1e24]'
          : 'bg-[#ef4444] text-white hover:bg-[#dc2626]'"
        @click="toggleDefibrillator"
      >
        {{ showDefibrillator ? 'Terug naar monitor' : 'Defibrillator' }}
      </button>
    </div>

    <PatientMonitorGrid :show-defibrillator="showDefibrillator">
      <template #defibrillator>
        <DefibrillatorPanel />
      </template>
    </PatientMonitorGrid>
  </div>
</template>
