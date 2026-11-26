<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useDefibStore } from '../../stores/defibStore.ts'
import EnergyDial from './EnergyDial.vue'

const defibStore = useDefibStore()
const {
  selectedEnergy,
  chargeStatus,
  chargedEnergy,
  hasSelectedEnergy,
  isCharging,
  canCharge,
} = storeToRefs(defibStore)

const statusLabel = computed(() => {
  if (chargeStatus.value === 'charging') {
    return 'Status: aan het laden...'
  }
  if (chargeStatus.value === 'charged') {
    return `Status: geladen (${chargedEnergy.value} J)`
  }
  if (!hasSelectedEnergy.value) {
    return 'Status: geen energie geselecteerd'
  }
  return 'Status: niet geladen'
})
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col justify-between gap-4 rounded-xl border border-[#232327] bg-[#111113] px-5 py-4">
    <div class="shrink-0">
      <h2 class="text-base font-bold tracking-[0.02em] text-white">
        Defibrillatie
      </h2>
    </div>

    <div class="flex min-h-0 flex-1 items-center py-2">
      <EnergyDial
        :model-value="selectedEnergy"
        @update:model-value="defibStore.setEnergy"
      />
    </div>

    <div class="shrink-0 space-y-3">
      <p
        data-testid="charge-status"
        class="text-sm font-medium"
        :class="chargeStatus === 'charged' ? 'text-[#facc15]' : 'text-[#d4d4d8]'"
      >
        {{ statusLabel }}
      </p>

      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          data-testid="charge-button"
          :disabled="!canCharge"
          class="min-h-12 touch-none select-none cursor-pointer rounded-xl bg-[#facc15] px-4 py-3 text-base font-extrabold tracking-wide text-[#111113] transition-colors hover:bg-[#fde047] disabled:cursor-not-allowed disabled:bg-[#facc15]/30 disabled:text-[#111113]/50"
          @click="defibStore.startCharge()"
        >
          {{ isCharging ? 'LADEN...' : 'LADEN' }}
        </button>

        <button
          type="button"
          data-testid="shock-button"
          disabled
          class="min-h-12 touch-none select-none cursor-not-allowed rounded-xl bg-[#5c191b] px-4 py-3 text-base font-extrabold tracking-wide text-white/45 opacity-75"
        >
          SCHOK
        </button>
      </div>
    </div>
  </div>
</template>
