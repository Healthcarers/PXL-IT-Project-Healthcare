import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { startChargeSound, stopChargeSound } from '../services/defibAudio.ts'

export const MIN_DEFIB_ENERGY = 10
export const MAX_DEFIB_ENERGY = 360
export const DEFIB_ENERGY_STEP = 10
export const DEFAULT_DEFIB_ENERGY = 150
export const CHARGE_DURATION_MS = 2200
export const CHARGE_TICK_MS = 50

export type DefibChargeStatus = 'idle' | 'charging' | 'charged'

/** Rounds a joule value to the configured step and clamps it within the allowed defibrillator range. */
export function normalizeDefibEnergy(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_DEFIB_ENERGY
  }
  const snapped = Math.round(value / DEFIB_ENERGY_STEP) * DEFIB_ENERGY_STEP
  return Math.min(MAX_DEFIB_ENERGY, Math.max(MIN_DEFIB_ENERGY, snapped))
}

export const useDefibStore = defineStore('defib', () => {
  const selectedEnergy = ref<number | null>(DEFAULT_DEFIB_ENERGY)
  const chargeStatus = ref<DefibChargeStatus>('idle')
  const chargeProgress = ref<number>(0)
  const chargedEnergy = ref<number | null>(null)

  let chargeTimer: ReturnType<typeof setInterval> | null = null
  let chargeStartMs = 0

  const hasSelectedEnergy = computed(
    () => selectedEnergy.value !== null && Number.isFinite(selectedEnergy.value)
  )
  const canDecrease = computed(
    () => selectedEnergy.value !== null && selectedEnergy.value > MIN_DEFIB_ENERGY
  )
  const canIncrease = computed(
    () => selectedEnergy.value === null || selectedEnergy.value < MAX_DEFIB_ENERGY
  )
  const isCharging = computed(() => chargeStatus.value === 'charging')
  const isCharged = computed(() => chargeStatus.value === 'charged')
  const canCharge = computed(() => hasSelectedEnergy.value && chargeStatus.value === 'idle')

  function clearChargeTimer() {
    if (chargeTimer !== null) {
      clearInterval(chargeTimer)
      chargeTimer = null
    }
  }

  /** Cancels any active charge or clears an existing charge state and stops the charge tone. */
  function cancelCharge() {
    clearChargeTimer()
    stopChargeSound()
    chargeStatus.value = 'idle'
    chargeProgress.value = 0
    chargedEnergy.value = null
  }

  function setEnergy(joules: number | null) {
    if (joules === null) {
      selectedEnergy.value = null
      cancelCharge()
      return
    }
    const next = normalizeDefibEnergy(joules)
    if (next !== selectedEnergy.value) {
      selectedEnergy.value = next
      cancelCharge()
    }
  }

  function clearEnergy() {
    setEnergy(null)
  }

  function increaseEnergy(step = DEFIB_ENERGY_STEP) {
    if (selectedEnergy.value === null) {
      setEnergy(MIN_DEFIB_ENERGY)
      return
    }
    setEnergy(selectedEnergy.value + step)
  }

  function decreaseEnergy(step = DEFIB_ENERGY_STEP) {
    if (selectedEnergy.value === null) return
    setEnergy(selectedEnergy.value - step)
  }

  function resetEnergy() {
    cancelCharge()
    selectedEnergy.value = DEFAULT_DEFIB_ENERGY
  }

  /** Starts charging the defibrillator to the currently selected energy and plays the charge sweep. */
  function startCharge(): boolean {
    if (!canCharge.value || selectedEnergy.value === null) {
      return false
    }

    clearChargeTimer()
    const targetEnergy = selectedEnergy.value
    chargeStatus.value = 'charging'
    chargeProgress.value = 0
    chargedEnergy.value = null
    chargeStartMs = Date.now()

    startChargeSound(CHARGE_DURATION_MS)

    chargeTimer = setInterval(() => {
      const elapsed = Date.now() - chargeStartMs
      const progress = Math.min(100, Math.round((elapsed / CHARGE_DURATION_MS) * 100))
      chargeProgress.value = progress

      if (elapsed >= CHARGE_DURATION_MS) {
        clearChargeTimer()
        chargeProgress.value = 100
        chargeStatus.value = 'charged'
        chargedEnergy.value = targetEnergy
      }
    }, CHARGE_TICK_MS)

    return true
  }

  return {
    selectedEnergy,
    chargeStatus,
    chargeProgress,
    chargedEnergy,
    hasSelectedEnergy,
    canDecrease,
    canIncrease,
    isCharging,
    isCharged,
    canCharge,
    setEnergy,
    clearEnergy,
    increaseEnergy,
    decreaseEnergy,
    resetEnergy,
    startCharge,
    cancelCharge,
  }
})
