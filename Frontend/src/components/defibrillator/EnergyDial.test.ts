import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, ref } from 'vue'
import EnergyDial from './EnergyDial.vue'

describe('EnergyDial.vue', () => {
  afterEach(() => {
    vi.useRealTimers()
  })
  it('displays the selected energy in J alongside the dial and tick value labels', () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 160 },
    })

    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')

    const tickLabels = wrapper.findAll('[data-testid="dial-tick-label"]')
    expect(tickLabels.map(el => el.text())).toEqual(['10', '60', '110', '160', '210', '260', '310', '360'])
    expect(tickLabels[3].attributes('fill')).toBe('#facc15')
    expect(tickLabels[0].attributes('fill')).toBe('#a1a1aa')

    const slider = wrapper.get('[role="slider"]')
    expect(slider.attributes('aria-valuenow')).toBe('160')
    expect(slider.attributes('aria-valuetext')).toBe('160 J')
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

  it('does not change energy via keyboard or wheel events on the dial', async () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: 150, min: 10, max: 360, step: 10 },
    })
    const slider = wrapper.get('[role="slider"]')
    expect(slider.attributes('tabindex')).toBeUndefined()

    await slider.trigger('keydown', { key: 'ArrowUp' })
    await slider.trigger('wheel', { deltaY: -100 })

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('repeats + and - steps while pressed, ignores trailing clicks when spamming, and stops on release or limit', async () => {
    vi.useFakeTimers()

    const Host = defineComponent({
      components: { EnergyDial },
      setup() {
        const value = ref(150)
        return { value }
      },
      template: '<EnergyDial v-model="value" :min="10" :max="200" :step="10" />',
    })

    const wrapper = mount(Host)
    const increaseBtn = wrapper.get('button[aria-label="Verhoog energie met 10 J"]')
    const decreaseBtn = wrapper.get('button[aria-label="Verlaag energie met 10 J"]')

    // Rapid spamming / delayed trailing browser click after pointerup must only count once per tap
    await increaseBtn.trigger('pointerdown', { pointerType: 'touch', button: 0 })
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')
    await vi.advanceTimersByTimeAsync(40)
    window.dispatchEvent(new PointerEvent('pointerup'))
    await vi.advanceTimersByTimeAsync(60)
    await increaseBtn.trigger('click')
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('160 J')

    // Second rapid tap 50ms later steps once to 170 J without double incrementing
    await vi.advanceTimersByTimeAsync(50)
    await increaseBtn.trigger('pointerdown', { pointerType: 'touch', button: 0 })
    window.dispatchEvent(new PointerEvent('pointerup'))
    await increaseBtn.trigger('click', { detail: 1 })
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('170 J')

    // Holding + waits full 500ms before auto-repeating every 120ms up to max (200 J)
    await increaseBtn.trigger('pointerdown', { pointerType: 'touch', button: 0 })
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('180 J')
    await vi.advanceTimersByTimeAsync(499)
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('180 J')
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(120 * 2)
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('200 J')
    window.dispatchEvent(new PointerEvent('pointerup'))

    // Holding - decreases repeatedly and stops on pointerleave
    await decreaseBtn.trigger('pointerdown', { pointerType: 'mouse', button: 0 })
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('190 J')
    await vi.advanceTimersByTimeAsync(500 + 120 * 2)
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('170 J')
    await decreaseBtn.trigger('pointerleave')
    await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('170 J')

    wrapper.unmount()
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

  it('does not wrap between 360 J and 10 J when dragging past the bottom gap', async () => {
    const Host = defineComponent({
      components: { EnergyDial },
      setup() {
        const value = ref(150)
        return { value }
      },
      template: '<EnergyDial v-model="value" :min="10" :max="360" :step="10" />',
    })

    const wrapper = mount(Host)
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

    // Start at 3 o'clock (300 J) and drag clockwise past 4:30 (360 J) across 6 o'clock to 7:30
    await slider.trigger('pointerdown', { clientX: 90, clientY: 50 })
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('300 J')

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 85, clientY: 85 }))
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('360 J')

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 65, clientY: 80 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 35, clientY: 80 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 15, clientY: 85 }))
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('360 J')
    window.dispatchEvent(new PointerEvent('pointerup'))

    // Dragging counter-clockwise past 10 J across 6 o'clock stays clamped at 10 J
    await slider.trigger('pointerdown', { clientX: 10, clientY: 50 })
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 15, clientY: 85 }))
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('10 J')

    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 35, clientY: 80 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 65, clientY: 80 }))
    window.dispatchEvent(new PointerEvent('pointermove', { clientX: 85, clientY: 85 }))
    await flushPromises()
    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('10 J')
    window.dispatchEvent(new PointerEvent('pointerup'))

    wrapper.unmount()
  })

  it('displays -- J when modelValue is null and selects min energy on + click', async () => {
    const wrapper = mount(EnergyDial, {
      props: { modelValue: null, min: 10, max: 360, step: 10 },
    })

    expect(wrapper.get('[data-testid="energy-value"]').text()).toBe('-- J')
    expect(wrapper.get('button[aria-label="Verlaag energie met 10 J"]').attributes('disabled')).toBeDefined()

    const increaseBtn = wrapper.get('button[aria-label="Verhoog energie met 10 J"]')
    expect(increaseBtn.attributes('disabled')).toBeUndefined()
    await increaseBtn.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([10])
  })
})
