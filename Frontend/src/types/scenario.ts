import type { VitalsResponse } from "./vitals";

export type ScenarioStatus = "DRAFT" | "PUBLISHED";

export interface ScenarioInput {
  name: string;
  description: string;
  initialVitals: VitalsResponse;
  feedbackItems: string[];
  status: ScenarioStatus;
}

export interface Scenario extends ScenarioInput {
  id: string;
}
