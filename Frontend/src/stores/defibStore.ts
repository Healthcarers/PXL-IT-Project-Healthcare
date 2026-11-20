import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export const MIN_DEFIB_ENERGY = 10
export const MAX_DEFIB_ENERGY = 360
export const DEFIB_ENERGY_STEP = 10
export const DEFAULT_DEFIB_ENERGY = 150

/** Rounds a joule value to the configured step and clamps it within the allowed defibrillator range. */
export function normalizeDefibEnergy(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DEFIB_ENERGY
  }
  const snapped = Math.round(value / DEFIB_ENERGY_STEP) * DEFIB_ENERGY_STEP
  return Math.min(MAX_DEFIB_ENERGY, Math.max(MIN_DEFIB_ENERGY, snapped))
}

export const useDefibStore = defineStore('defib', () => {
  const selectedEnergy = ref<number>(DEFAULT_DEFIB_ENERGY)

  const canDecrease = computed(() => selectedEnergy.value > MIN_DEFIB_ENERGY)
  const canIncrease = computed(() => selectedEnergy.value < MAX_DEFIB_ENERGY)

  function setEnergy(joules: number) {
    selectedEnergy.value = normalizeDefibEnergy(joules)
  }

  function increaseEnergy(step = DEFIB_ENERGY_STEP) {
    setEnergy(selectedEnergy.value + step)
  }

  function decreaseEnergy(step = DEFIB_ENERGY_STEP) {
    setEnergy(selectedEnergy.value - step)
  }

  function resetEnergy() {
    selectedEnergy.value = DEFAULT_DEFIB_ENERGY
  }

  return {
    selectedEnergy,
    canDecrease,
    canIncrease,
    setEnergy,
    increaseEnergy,
    decreaseEnergy,
    resetEnergy,
  }
})
