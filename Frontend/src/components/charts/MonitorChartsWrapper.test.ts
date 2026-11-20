import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import MonitorChartsWrapper from './MonitorChartsWrapper.vue'

function stubPanel(testId: string, label: string) {
  return defineComponent({
    props: {
      preview: {
        type: Boolean,
        default: false,
      },
    },
    render() {
      return h('div', { 'data-testid': testId, 'data-preview': String(this.preview) }, label)
    },
  })
}

vi.mock('./EcgPanel.vue', () => ({ default: stubPanel('ecg-panel', 'ECG') }))
vi.mock('./SpO2Panel.vue', () => ({ default: stubPanel('spo2-panel', 'SpO2') }))
vi.mock('./Etco2Panel.vue', () => ({ default: stubPanel('etco2-panel', 'EtCO2') }))
vi.mock('./IbpPanel.vue', () => ({ default: stubPanel('ibp-panel', 'IBP') }))

describe('MonitorChartsWrapper.vue', () => {
  it('shows all 4 waveform panels in monitor mode', () => {
    const wrapper = mount(MonitorChartsWrapper, {
      attachTo: document.body,
      props: { showDefibrillator: false },
      slots: {
        defibrillator: '<div data-testid="defib-slot">Defib</div>',
      },
    })

    expect(wrapper.get('[data-testid="ecg-panel"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="secondary-charts"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="spo2-panel"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="etco2-panel"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="ibp-panel"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-testid="defib-slot"]').exists()).toBe(false)

    wrapper.unmount()
  })

  it('keeps background waveform panels mounted via v-show while displaying defibrillator slot', () => {
    const wrapper = mount(MonitorChartsWrapper, {
      attachTo: document.body,
      props: { showDefibrillator: true },
      slots: {
        defibrillator: '<div data-testid="defib-slot">Defib</div>',
      },
    })

    expect(wrapper.get('[data-testid="ecg-panel"]').isVisible()).toBe(true)
    expect(wrapper.get('[data-testid="defib-slot"]').isVisible()).toBe(true)

    // Panels stay mounted in DOM while their container is hidden (display: none)
    expect(wrapper.find('[data-testid="spo2-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="etco2-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="ibp-panel"]').exists()).toBe(true)
    expect((wrapper.get('[data-testid="secondary-charts"]').element as HTMLElement).style.display).toBe('none')
    expect(wrapper.get('[data-testid="secondary-charts"]').isVisible()).toBe(false)
    expect(wrapper.get('[data-testid="spo2-panel"]').isVisible()).toBe(false)

    wrapper.unmount()
  })

  it('forwards preview prop to all waveform panels', () => {
    const wrapper = mount(MonitorChartsWrapper, {
      props: { preview: true, showDefibrillator: false },
    })

    for (const testId of ['ecg-panel', 'spo2-panel', 'etco2-panel', 'ibp-panel']) {
      expect(wrapper.get(`[data-testid="${testId}"]`).attributes('data-preview')).toBe('true')
    }

    wrapper.unmount()
  })
})
