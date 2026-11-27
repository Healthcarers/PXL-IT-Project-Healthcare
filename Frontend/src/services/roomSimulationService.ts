import api from './refreshService'
import type { RoomScenario } from '../types/room'
import type { VitalsResponse } from '../composables/useVitals'

export type SimulationAction = 'START' | 'PAUSE' | 'RESTART'
export interface RoomSimulation {
  scenario: RoomScenario | null
  status: 'READY' | 'RUNNING' | 'PAUSED'
  elapsedMillis: number
  vitals: VitalsResponse
}

function path(code: string) {
  return `/rooms/${encodeURIComponent(code)}/simulation`
}

export const roomSimulationService = {
  async get(code: string) {
    return (await api.get<RoomSimulation>(path(code))).data
  },
  async load(code: string, scenarioId: string) {
    return (await api.put<RoomSimulation>(`${path(code)}/scenario`, { scenarioId })).data
  },
  async control(code: string, action: SimulationAction) {
    return (await api.post<RoomSimulation>(path(code), { action })).data
  },
}
