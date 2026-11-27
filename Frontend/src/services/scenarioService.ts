import api from "./refreshService";
import type { Scenario, ScenarioInput } from "../types/scenario";

export type { Scenario, ScenarioInput } from "../types/scenario";

export const scenarioService = {
  async list() {
    return (await api.get<Scenario[]>("/scenarios")).data;
  },

  async get(id: string) {
    return (await api.get<Scenario>(`/scenarios/${encodeURIComponent(id)}`))
      .data;
  },

  async remove(id: string) {
    await api.delete(`/scenarios/${id}`);
  },

  async save(scenario: ScenarioInput, draftId?: string) {
    return draftId
      ? (await api.put<Scenario>(`/scenarios/${draftId}`, scenario)).data
      : (await api.post<Scenario>("/scenarios", scenario)).data;
  },
};
