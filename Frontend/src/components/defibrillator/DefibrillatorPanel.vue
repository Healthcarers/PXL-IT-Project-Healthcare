<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useDefibStore } from '../../stores/defibStore.ts'
import EnergyDial from './EnergyDial.vue'

const defibStore = useDefibStore()
const { selectedEnergy } = storeToRefs(defibStore)
</script>

<template>
  <div class="flex min-h-0 flex-1 flex-col rounded-xl border border-[#232327] bg-[#111113] px-5 py-4">
    <div class="shrink-0">
      <h2 class="text-base font-bold tracking-[0.02em] text-white">
        Defibrillatie
      </h2>
      <p class="mt-0.5 text-xs text-[#8b8b94]">
        Energie
      </p>
    </div>

    <div class="flex min-h-0 flex-1 items-center py-4">
      <EnergyDial
        :model-value="selectedEnergy"
        @update:model-value="defibStore.setEnergy"
      />
    </div>
  </div>
</template>
