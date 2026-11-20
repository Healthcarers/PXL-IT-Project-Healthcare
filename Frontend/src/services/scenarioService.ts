import type { VitalsResponse } from '../composables/useVitals'
import api from './refreshService'

export type ScenarioStatus = 'DRAFT' | 'PUBLISHED'

export interface ScenarioInput {
  name: string
  description: string
  initialVitals: VitalsResponse
  feedbackItems: string[]
  status: ScenarioStatus
}

export interface Scenario extends ScenarioInput {
  id: string
}

export const scenarioService = {
  async list() {
    return (await api.get<Scenario[]>('/scenarios')).data
  },
  async get(id: string) {
    return (await api.get<Scenario>(`/scenarios/${encodeURIComponent(id)}`)).data
  },
  async remove(id: string) {
    await api.delete(`/scenarios/${id}`)
  },
  async save(scenario: ScenarioInput, draftId?: string) {
    return draftId
      ? (await api.put<Scenario>(`/scenarios/${draftId}`, scenario)).data
      : (await api.post<Scenario>('/scenarios', scenario)).data
  },
}
