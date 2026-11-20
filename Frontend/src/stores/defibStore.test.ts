import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
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
  })

  it('starts with the default energy value of 150 J', () => {
    const store = useDefibStore()

    expect(store.selectedEnergy).toBe(DEFAULT_DEFIB_ENERGY)
    expect(store.selectedEnergy).toBe(150)
    expect(store.canDecrease).toBe(true)
    expect(store.canIncrease).toBe(true)
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
})
