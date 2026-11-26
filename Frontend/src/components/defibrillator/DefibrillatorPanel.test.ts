import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as defibAudio from '../../services/defibAudio.ts'
import { CHARGE_DURATION_MS, useDefibStore } from '../../stores/defibStore.ts'
import DefibrillatorPanel from './DefibrillatorPanel.vue'

describe('DefibrillatorPanel.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    useDefibStore().cancelCharge()
    vi.useRealTimers()
  })

  it('renders LADEN button, disabled SCHOK button, progress bar and default status', () => {
    const wrapper = mount(DefibrillatorPanel)

    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('150 J')
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: niet geladen')

    const progress = wrapper.get('[role="progressbar"]')
    expect(progress.attributes('aria-valuenow')).toBe('0')

    const chargeBtn = wrapper.get('[data-testid="charge-button"]')
    expect(chargeBtn.text()).toBe('LADEN')
    expect(chargeBtn.attributes('disabled')).toBeUndefined()

    const shockBtn = wrapper.get('[data-testid="shock-button"]')
    expect(shockBtn.text()).toBe('SCHOK')
    expect(shockBtn.attributes('disabled')).toBeDefined()
  })

  it('disables LADEN when no energy is selected (null)', async () => {
    const store = useDefibStore()
    store.clearEnergy()

    const wrapper = mount(DefibrillatorPanel)
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('-- J')
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: geen energie geselecteerd')

    const chargeBtn = wrapper.get('[data-testid="charge-button"]')
    expect(chargeBtn.attributes('disabled')).toBeDefined()

    await chargeBtn.trigger('click')
    expect(store.chargeStatus).toBe('idle')
  })

  it('charges on LADEN click, plays ascending sound, updates progress and disables SCHOK', async () => {
    vi.useFakeTimers()
    const startSoundSpy = vi.spyOn(defibAudio, 'startChargeSound')

    const wrapper = mount(DefibrillatorPanel)
    const chargeBtn = wrapper.get('[data-testid="charge-button"]')
    const shockBtn = wrapper.get('[data-testid="shock-button"]')

    await chargeBtn.trigger('click')
    expect(startSoundSpy).toHaveBeenCalledOnce()
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: aan het laden...')
    expect(chargeBtn.text()).toBe('LADEN...')
    expect(chargeBtn.attributes('disabled')).toBeDefined()
    expect(shockBtn.attributes('disabled')).toBeDefined()

    await vi.advanceTimersByTimeAsync(CHARGE_DURATION_MS)
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: geladen (150 J)')
    expect(wrapper.get('[role="progressbar"]').attributes('aria-valuenow')).toBe('100')
    expect(shockBtn.attributes('disabled')).toBeDefined()

    // Changing energy afterwards resets charge status so user can re-charge
    await wrapper.get('button[aria-label="Verhoog energie met 10 J"]').trigger('click')
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: niet geladen')
    expect(chargeBtn.attributes('disabled')).toBeUndefined()
  })
})
