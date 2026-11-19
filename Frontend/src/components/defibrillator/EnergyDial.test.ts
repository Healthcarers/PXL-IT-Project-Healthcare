import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import EnergyDial from './EnergyDial.vue'

describe('EnergyDial.vue', () => {
  it('displays the selected energy in J alongside the dial and helper text', () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 150 },
    })

    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('150 J')
    expect(wrapper.text()).toContain('Draai aan de knop om de energie te kiezen')

    const slider = wrapper.get('[role="slider"]')
    expect(slider.attributes('aria-valuenow')).toBe('150')
    expect(slider.attributes('aria-valuetext')).toBe('150 J')
  })

  it('emits updated energy in 10 J increments when clicking + and - buttons', async () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 150 },
    })

    const decreaseBtn = wrapper.get('button[aria-label="Verlaag energie met 10 J"]')
    const increaseBtn = wrapper.get('button[aria-label="Verhoog energie met 10 J"]')

    await increaseBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([160])

    await decreaseBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([140])
  })

  it('disables - at min energy and + at max energy', () => {
    const atMin = mount(EnergyDial, { props: { modelValue: 10, min: 10, max: 360 } })
    expect(atMin.get('button[aria-label="Verlaag energie met 10 J"]').attributes('disabled')).toBeDefined()
    expect(atMin.get('button[aria-label="Verhoog energie met 10 J"]').attributes('disabled')).toBeUndefined()

    const atMax = mount(EnergyDial, { props: { modelValue: 360, min: 10, max: 360 } })
    expect(atMax.get('button[aria-label="Verhoog energie met 10 J"]').attributes('disabled')).toBeDefined()
    expect(atMax.get('button[aria-label="Verlaag energie met 10 J"]').attributes('disabled')).toBeUndefined()
  })

  it('updates energy with keyboard arrow, Home, and End keys', async () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 150, min: 10, max: 360, step: 10 },
    })
    const slider = wrapper.get('[role="slider"]')

    await slider.trigger('keydown', { key: 'ArrowUp' })
    await slider.trigger('keydown', { key: 'ArrowDown' })
    await slider.trigger('keydown', { key: 'End' })
    await slider.trigger('keydown', { key: 'Home' })

    expect(wrapper.emitted('update:modelValue')).toEqual([
      [160],
      [140],
      [360],
      [10],
    ])
  })

  it('rotates and updates value when dragging the dial with the pointer', async () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 150, min: 10, max: 360, step: 10 },
    })
    const slider = wrapper.get('[role="slider"]')

    vi.spyOn(slider.element, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    // Straight up (12 o'clock) corresponds to midpoint angle (0 deg) => ~185 -> snaps to 190 J
    await slider.trigger('pointerdown', { clientX: 50, clientY: 10 })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([190])

    // Drag to 3 o'clock (+90 deg) => ratio (90 - (-135)) / 270 = 5/6 => 10 + 350*5/6 = 301.6 -> snaps to 300 J
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 90, clientY: 50 }))
    window.dispatchEvent(new PointerEvent('pointerup'))

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([300])
  })
})
