import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import * as defibAudio from '../services/defibAudio.ts'
import { CHARGE_DURATION_MS, useDefibStore } from '../stores/defibStore.ts'
import CursistDashboard from './CursistDashboard.vue'

vi.mock('../services/stompClient.ts', () => ({
  connected: ref(true),
  subscribeTopic: vi.fn(() => vi.fn()),
}))

vi.mock('../composables/useVitals.ts', () => ({
  useVitals: () => ({ vitals: ref(null) }),
}))

vi.mock('../composables/useHeartbeatSound.ts', () => ({
  useHeartbeatSound: vi.fn(),
}))

vi.mock('../components/charts/SweepChart.vue', () => ({
  default: defineComponent({
    render: () => h('div', { 'data-testid': 'sweep-chart' }),
  }),
}))

describe('CursistDashboard.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  afterEach(() => {
    useDefibStore().cancelCharge()
    vi.useRealTimers()
  })

  it('toggles between monitor and defibrillator view while preserving selected joules', async () => {
    const wrapper = mount(CursistDashboard)
    await vi.dynamicImportSettled()
    await flushPromises()

    const toggleBtn = wrapper.get('[data-testid="toggle-defibrillator"]')
    expect(toggleBtn.text()).toBe('Defibrillator')
    expect(wrapper.find('[data-testid="energy-value"]').exists()).toBe(false)

    await toggleBtn.trigger('click')
    expect(toggleBtn.text()).toBe('Terug naar monitor')
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('150 J')

    await wrapper.get('button[aria-label="Verhoog energie met 10 J"]').trigger('click')
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')

    // Return to monitor and reopen defibrillator; chosen energy stays 160 J
    await toggleBtn.trigger('click')
    expect(toggleBtn.text()).toBe('Defibrillator')
    await toggleBtn.trigger('click')
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')

    wrapper.unmount()
  })

  it('keeps charging when returning to monitor and cancels charge on dashboard unmount', async () => {
    vi.useFakeTimers()
    const stopSoundSpy = vi.spyOn(defibAudio, 'stopChargeSound')
    const wrapper = mount(CursistDashboard)
    await vi.dynamicImportSettled()
    await flushPromises()

    const toggleBtn = wrapper.get('[data-testid="toggle-defibrillator"]')
    await toggleBtn.trigger('click')
    await wrapper.get('[data-testid="charge-button"]').trigger('click')

    // Returning to monitor keeps charging in background
    await toggleBtn.trigger('click')
    await vi.advanceTimersByTimeAsync(CHARGE_DURATION_MS)
    await toggleBtn.trigger('click')
    expect(wrapper.get('[data-testid="charge-status"]').text()).toBe('Status: geladen (150 J)')

    // Leaving the dashboard unmounts CursistDashboard and resets charge state + stops sound
    wrapper.unmount()
    expect(useDefibStore().chargeStatus).toBe('idle')
    expect(stopSoundSpy).toHaveBeenCalled()
  })
})
