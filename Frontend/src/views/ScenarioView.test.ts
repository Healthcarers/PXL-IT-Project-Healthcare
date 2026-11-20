import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ScenarioView from './ScenarioView.vue'
import { scenarioService, type Scenario } from '../services/scenarioService'

vi.mock('../services/scenarioService', () => ({
  scenarioService: { save: vi.fn(), get: vi.fn() },
}))

const draft: Scenario = {
  id: 'scenario-1',
  name: 'Monitorsimulatie',
  description: 'Oefenen met de trainingsmonitor.',
  initialVitals: {
    heartRate: 105, spo2: 98, etco2: 38, respRate: 15, ampScale: 1,
    sysIbp: 120, diasIbp: 80,
  },
  feedbackItems: ['Monitor gecontroleerd'],
  status: 'DRAFT',
}

describe('ScenarioView', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('slaat de ingevulde waarden op als concept en publiceert daarna hetzelfde scenario', async () => {
    vi.mocked(scenarioService.save).mockResolvedValueOnce(draft)
      .mockResolvedValueOnce({ ...draft, status: 'PUBLISHED' })
    const wrapper = mount(ScenarioView, { global: { stubs: ['RouterLink'] } })
    await wrapper.get('#scenario-name').setValue(draft.name)
    await wrapper.get('#scenario-description').setValue(draft.description)
    await wrapper.get('#vital-heartRate').setValue('105')
    await wrapper.get('#new-feedback').setValue(draft.feedbackItems[0])
    await wrapper.get('#new-feedback').trigger('keydown.enter')
    await wrapper.get('form').trigger('submit', { submitter: wrapper.get('#save-draft').element })
    await flushPromises()

    const { id, ...input } = draft
    expect(scenarioService.save).toHaveBeenNthCalledWith(1, input, undefined)
    expect(wrapper.get('[role="status"]').text()).toContain('opgeslagen als concept')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(scenarioService.save).toHaveBeenNthCalledWith(2, { ...input, status: 'PUBLISHED' }, id)
    expect(wrapper.get('[role="status"]').text()).toContain('gepubliceerd')
  })

  it('opent een opgeslagen concept en vereist minimaal één feedbackitem', async () => {
    vi.mocked(scenarioService.get).mockResolvedValue(draft)
    const wrapper = mount(ScenarioView, {
      props: { scenarioId: draft.id }, global: { stubs: ['RouterLink'] },
    })
    await flushPromises()

    expect(scenarioService.get).toHaveBeenCalledExactlyOnceWith(draft.id)
    expect(wrapper.get<HTMLInputElement>('#scenario-name').element.value).toBe(draft.name)
    expect(wrapper.get<HTMLInputElement>('#vital-heartRate').element.value).toBe('105')
    await wrapper.get('[aria-label^="Verwijder feedbackitem"]').trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('minstens één feedbackitem')
    expect(scenarioService.save).not.toHaveBeenCalled()
  })

  it('toont een gepubliceerd scenario zonder bewerk- of publicatieacties', async () => {
    vi.mocked(scenarioService.get).mockResolvedValue({ ...draft, status: 'PUBLISHED' })
    const wrapper = mount(ScenarioView, {
      props: { scenarioId: draft.id }, global: { stubs: ['RouterLink'] },
    })
    await flushPromises()

    expect(wrapper.get('h1').text()).toBe('Gepubliceerd scenario')
    expect(wrapper.get<HTMLFieldSetElement>('fieldset').element.disabled).toBe(true)
    expect(wrapper.find('button[type="submit"]').exists()).toBe(false)
  })
})
