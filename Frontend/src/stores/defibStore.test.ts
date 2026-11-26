import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as defibAudio from '../services/defibAudio.ts'
import {
  CHARGE_DURATION_MS,
  DEFAULT_DEFIB_ENERGY,
  DEFIB_ENERGY_STEP,
  MAX_DEFIB_ENERGY,
  MIN_DEFIB_ENERGY,
  normalizeDefibEnergy,
  useDefibStore,
} from './defibStore.ts'

describe('defibStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    const store = useDefibStore()
    store.cancelCharge()
    vi.useRealTimers()
  })

  it('starts with the default energy value of 150 J and idle charge state', () => {
    const store = useDefibStore()

    expect(store.selectedEnergy).toBe(DEFAULT_DEFIB_ENERGY)
    expect(store.selectedEnergy).toBe(150)
    expect(store.hasSelectedEnergy).toBe(true)
    expect(store.canDecrease).toBe(true)
    expect(store.canIncrease).toBe(true)
    expect(store.chargeStatus).toBe('idle')
    expect(store.chargeProgress).toBe(0)
    expect(store.chargedEnergy).toBeNull()
    expect(store.canCharge).toBe(true)
  })

  it('increases and decreases energy in steps of 10 J', () => {
    const store = useDefibStore()

    store.increaseEnergy()
    expect(store.selectedEnergy).toBe(160)

    store.decreaseEnergy()
    store.decreaseEnergy()
    expect(store.selectedEnergy).toBe(140)
  })

  it('clamps energy at minimum and maximum bounds', () => {
    const store = useDefibStore()

    store.setEnergy(MIN_DEFIB_ENERGY)
    expect(store.canDecrease).toBe(false)
    store.decreaseEnergy()
    expect(store.selectedEnergy).toBe(MIN_DEFIB_ENERGY)

    store.setEnergy(MAX_DEFIB_ENERGY)
    expect(store.canIncrease).toBe(false)
    store.increaseEnergy()
    expect(store.selectedEnergy).toBe(MAX_DEFIB_ENERGY)
  })

  it('snaps arbitrary values to the nearest step and handles invalid numbers', () => {
    expect(normalizeDefibEnergy(144)).toBe(140)
    expect(normalizeDefibEnergy(146)).toBe(150)
    expect(normalizeDefibEnergy(-50)).toBe(MIN_DEFIB_ENERGY)
    expect(normalizeDefibEnergy(999)).toBe(MAX_DEFIB_ENERGY)
    expect(normalizeDefibEnergy(Number.NaN)).toBe(DEFAULT_DEFIB_ENERGY)
    expect(DEFIB_ENERGY_STEP).toBe(10)
  })

  it('resets back to the default energy', () => {
    const store = useDefibStore()
    store.setEnergy(220)

    store.resetEnergy()

    expect(store.selectedEnergy).toBe(DEFAULT_DEFIB_ENERGY)
  })

  it('refuses to charge when no energy is selected (null)', () => {
    const startSoundSpy = vi.spyOn(defibAudio, 'startChargeSound')
    const store = useDefibStore()

    store.clearEnergy()
    expect(store.selectedEnergy).toBeNull()
    expect(store.hasSelectedEnergy).toBe(false)
    expect(store.canDecrease).toBe(false)
    expect(store.canIncrease).toBe(true)
    expect(store.canCharge).toBe(false)

    expect(store.startCharge()).toBe(false)
    expect(store.chargeStatus).toBe('idle')
    expect(startSoundSpy).not.toHaveBeenCalled()

    store.increaseEnergy()
    expect(store.selectedEnergy).toBe(MIN_DEFIB_ENERGY)
    expect(store.canCharge).toBe(true)
  })

  it('charges over time with sound and resets charge when energy changes or cancelled', () => {
    vi.useFakeTimers()
    const startSoundSpy = vi.spyOn(defibAudio, 'startChargeSound')
    const stopSoundSpy = vi.spyOn(defibAudio, 'stopChargeSound')
    const store = useDefibStore()

    expect(store.startCharge()).toBe(true)
    expect(store.chargeStatus).toBe('charging')
    expect(store.isCharging).toBe(true)
    expect(store.canCharge).toBe(false)
    expect(startSoundSpy).toHaveBeenCalledOnce()
    expect(startSoundSpy).toHaveBeenCalledWith(CHARGE_DURATION_MS)

    // Cannot start a second charge while already charging
    expect(store.startCharge()).toBe(false)

    vi.advanceTimersByTime(CHARGE_DURATION_MS / 2)
    expect(store.chargeProgress).toBeGreaterThan(0)
    expect(store.chargeProgress).toBeLessThan(100)
    expect(store.chargeStatus).toBe('charging')

    vi.advanceTimersByTime(CHARGE_DURATION_MS / 2)
    expect(store.chargeProgress).toBe(100)
    expect(store.chargeStatus).toBe('charged')
    expect(store.isCharged).toBe(true)
    expect(store.chargedEnergy).toBe(150)

    // Changing energy discharges and stops any sound
    store.setEnergy(200)
    expect(store.chargeStatus).toBe('idle')
    expect(store.chargeProgress).toBe(0)
    expect(store.chargedEnergy).toBeNull()
    expect(stopSoundSpy).toHaveBeenCalled()
  })
})
