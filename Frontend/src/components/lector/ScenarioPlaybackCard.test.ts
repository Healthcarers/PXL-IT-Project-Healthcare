// @vitest-environment happy-dom
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import ScenarioPlaybackCard from './ScenarioPlaybackCard.vue'
import { roomSimulationService, type RoomSimulation } from '../../services/roomSimulationService'
import { scenarioService, type Scenario } from '../../services/scenarioService'

vi.mock('../../services/roomSimulationService', () => ({
  roomSimulationService: { get: vi.fn(), load: vi.fn(), control: vi.fn() },
}))
vi.mock('../../services/scenarioService', () => ({ scenarioService: { list: vi.fn() } }))
vi.mock('../../services/stompClient', () => ({ connected: ref(true), subscribeTopic: vi.fn(() => vi.fn()) }))

const vitals = { heartRate: 132, spo2: 89, respRate: 26, etco2: 48, ampScale: 1.4, sysIbp: 275, diasIbp: 160 }
const scenario: Scenario = {
  id: 'scenario-1', name: 'Acute oefening', description: 'Oefening', status: 'PUBLISHED',
  initialVitals: vitals, feedbackItems: ['Evaluatie'],
}
function state(status: RoomSimulation['status'] = 'READY', elapsedMillis = 0): RoomSimulation {
  return { scenario, status, elapsedMillis, vitals }
}
let wrapper: ReturnType<typeof mount<typeof ScenarioPlaybackCard>>
function button(text: string) {
  const found = wrapper.findAll('button').find(candidate => candidate.text() === text)
  if (!found) throw new Error(`Missing button: ${text}`)
  return found
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.resetAllMocks()
  vi.mocked(roomSimulationService.get).mockResolvedValue(state())
})
afterEach(() => {
  wrapper?.unmount()
  vi.useRealTimers()
})

describe('room scenario controls', () => {
  it('starts, pauses, resumes and only restarts the elapsed timer after confirmation', async () => {
    wrapper = mount(ScenarioPlaybackCard, { props: { code: 'ABC123' } })
    await flushPromises()
    expect(wrapper.text()).toContain('Acute oefening')
    expect(wrapper.findAll('button').map(candidate => candidate.text()))
      .toEqual(['Start', 'Herstarten', 'Nieuw scenario laden'])
    const toggle = button('Start')
    expect(toggle.classes()).toContain('start')
    vi.mocked(roomSimulationService.control).mockResolvedValueOnce(state('RUNNING'))
    await toggle.trigger('click')
    await flushPromises()
    expect(toggle.text()).toBe('Pauze')
    expect(toggle.classes()).toContain('pause')
    expect(toggle.classes()).not.toContain('start')
    expect(button('Pauze').element).toBe(toggle.element)
    await vi.advanceTimersByTimeAsync(2250)
    expect(wrapper.get('[aria-label="Verstreken scenariotijd"]').text()).toBe('00:02')

    vi.mocked(roomSimulationService.control).mockResolvedValueOnce(state('PAUSED', 2250))
    await button('Pauze').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('[aria-label="Verstreken scenariotijd"]').text()).toBe('00:02')
    expect(toggle.text()).toBe('Start')
    expect(toggle.classes()).toContain('start')
    expect(toggle.classes()).not.toContain('pause')
    expect(button('Start').element).toBe(toggle.element)
    expect(toggle.attributes('disabled')).toBeUndefined()

    vi.mocked(roomSimulationService.control).mockResolvedValueOnce(state('RUNNING', 2250))
    await button('Start').trigger('click')
    await flushPromises()
    await vi.advanceTimersByTimeAsync(1000)
    expect(wrapper.get('[aria-label="Verstreken scenariotijd"]').text()).toBe('00:03')
    vi.mocked(roomSimulationService.control).mockResolvedValueOnce(state('RUNNING'))
    await button('Herstarten').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('Wil je het scenario herstarten?')
    expect(roomSimulationService.control).toHaveBeenCalledTimes(3)
    await button('Ja, herstarten').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.get('[aria-label="Verstreken scenariotijd"]').text()).toBe('00:00')
    expect(vi.mocked(roomSimulationService.control).mock.calls.map(call => call[1]))
      .toEqual(['START', 'PAUSE', 'START', 'RESTART'])
    expect(roomSimulationService.control).toHaveBeenLastCalledWith('ABC123', 'RESTART')
  })

  it('does not restart on cancellation and dismisses confirmation on room close or switch', async () => {
    wrapper = mount(ScenarioPlaybackCard, { props: { code: 'ABC123' } })
    await flushPromises()
    await button('Herstarten').trigger('click')
    await button('Annuleren').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(roomSimulationService.control).not.toHaveBeenCalled()

    await button('Herstarten').trigger('click')
    await wrapper.setProps({ disabled: true })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await wrapper.setProps({ disabled: false })
    await button('Herstarten').trigger('click')
    await wrapper.setProps({ code: 'DEF456' })
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(roomSimulationService.control).not.toHaveBeenCalled()
  })

  it('loads only a published selection and waits for Start to apply its values', async () => {
    const next = { ...scenario, id: 'scenario-2', name: 'Nieuwe oefening' }
    vi.mocked(scenarioService.list).mockResolvedValue([scenario, next, { ...scenario, id: 'draft', status: 'DRAFT' }])
    vi.mocked(roomSimulationService.load).mockResolvedValue({ ...state(), scenario: next })
    wrapper = mount(ScenarioPlaybackCard, { props: { code: 'ABC123' } })
    await flushPromises()
    await button('Nieuw scenario laden').trigger('click')
    await flushPromises()
    expect(wrapper.findAll('option').map(option => option.attributes('value'))).not.toContain('draft')
    await wrapper.get('select').setValue('scenario-2')
    await button('Laden').trigger('click')
    await flushPromises()
    expect(roomSimulationService.load).toHaveBeenCalledWith('ABC123', 'scenario-2')
    expect(roomSimulationService.control).not.toHaveBeenCalled()
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Nieuwe oefening')
  })

  it('reports failed commands without showing success and disables controls on room close', async () => {
    vi.mocked(roomSimulationService.control).mockRejectedValue(new Error('Offline'))
    wrapper = mount(ScenarioPlaybackCard, { props: { code: 'ABC123' } })
    await flushPromises()
    await button('Start').trigger('click')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('mislukt')
    expect(wrapper.text()).toContain('Klaar om te starten')
    await wrapper.setProps({ disabled: true })
    expect(button('Start').attributes('disabled')).toBeDefined()
    expect(button('Nieuw scenario laden').attributes('disabled')).toBeDefined()
  })
})
