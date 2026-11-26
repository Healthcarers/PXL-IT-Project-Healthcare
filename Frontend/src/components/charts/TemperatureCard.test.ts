
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import TemperatureCard from './TemperatureCard.vue'
import type { VitalsResponse } from '../../composables/useVitals'

const stubs = vi.hoisted(() => {
  const state: { receive?: (message: VitalsResponse) => void } = {}
  return {
    state,
    subscribe: vi.fn((_topic: string, receive: (message: VitalsResponse) => void) => {
      state.receive = receive
    }),
  }
})

vi.mock('../../services/stompClient.ts', async () => {
  const { ref } = await import('vue')
  return { connected: ref(false), subscribeTopic: stubs.subscribe }
})

const initial = {
  heartRate: 75,
  spo2: 98,
  respRate: 15,
  etco2: 38,
  ampScale: 1,
  sysIbp: 120,
  diasIbp: 80,
  temperature: 38.2,
}

describe('TemperatureCard', () => {
  it('shows live temperature only after activation', async () => {
    const wrapper = mount(TemperatureCard)
    const receive = stubs.state.receive!
    const button = wrapper.get('[role="button"]')

    expect(wrapper.text()).toContain('--')
    expect(stubs.subscribe).toHaveBeenCalledWith(
      '/topic/vitals',
      expect.any(Function),
    )

    receive(initial)
    await nextTick()

    expect(wrapper.text()).not.toContain('38.2')
    expect(button.attributes('aria-pressed')).toBe('false')

    await button.trigger('click')

    expect(wrapper.text()).toContain('38.2')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(wrapper.text()).toContain('°C')

    receive({ ...initial, temperature: 36.5 })
    await nextTick()

    expect(wrapper.text()).toContain('36.5')

    // Temperatuurkaart terug uitschakelen
    await button.trigger('click')
    expect(button.attributes('aria-pressed')).toBe('false')

    wrapper.unmount()
  })

  it('keeps the lecturer preview visible and non-interactive', async () => {
    const wrapper = mount(TemperatureCard, {
      props: { preview: true },
    })
    const receive = stubs.state.receive!

    receive(initial)
    await nextTick()

    expect(wrapper.text()).toContain('38.2')
    expect(wrapper.find('[role="button"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('formats whole temperatures with one decimal place', async () => {
    const wrapper = mount(TemperatureCard)
    const button = wrapper.get('[role="button"]')

    await button.trigger('click')

    stubs.state.receive!({ ...initial, temperature: 36 })
    await nextTick()

    expect(wrapper.text()).toContain('36.0')

    await button.trigger('click')

    wrapper.unmount()
  })
})
