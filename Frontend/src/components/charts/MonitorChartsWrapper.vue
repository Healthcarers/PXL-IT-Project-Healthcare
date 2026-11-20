<script setup lang="ts">
import EcgPanel from './EcgPanel.vue'
import Etco2Panel from './Etco2Panel.vue'
import IbpPanel from './IbpPanel.vue'
import SpO2Panel from './SpO2Panel.vue'

withDefaults(defineProps<{
  showDefibrillator?: boolean
  preview?: boolean
}>(), {
  showDefibrillator: false,
  preview: false,
})
</script>

<template>
  <section class="flex min-h-0 flex-col gap-3.5">
    <EcgPanel :preview="preview" class="flex-1" />

    <!-- Keep background waveforms mounted so switching back from defibrillator preserves their ring buffers. -->
    <div
      v-show="!showDefibrillator"
      data-testid="secondary-charts"
      class="flex min-h-0 flex-[3] flex-col gap-3.5"
    >
      <SpO2Panel :preview="preview" class="flex-1" />
      <Etco2Panel :preview="preview" class="flex-1" />
      <IbpPanel :preview="preview" class="flex-1" />
    </div>

    <div
      v-if="showDefibrillator"
      class="flex min-h-0 flex-[3] flex-col"
    >
      <slot name="defibrillator" />
    </div>
  </section>
</template>
