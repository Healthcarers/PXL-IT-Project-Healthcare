import type { VitalsResponse } from "./vitals";

export type EcgRhythm =
  | "Sinusritme"
  | "Sinustachycardie"
  | "Sinusbradycardie"
  | "Atriumfibrillatie"
  | "Ventrikeltachycardie"
  | "Ventrikelfibrillatie"
  | "Asystolie";

export const ECG_RHYTHMS: readonly EcgRhythm[] = [
  "Sinusritme",
  "Sinustachycardie",
  "Sinusbradycardie",
  "Atriumfibrillatie",
  "Ventrikeltachycardie",
  "Ventrikelfibrillatie",
  "Asystolie",
] as const;

export type BloodPressureTarget = "sysIbp" | "diasIbp";
export type CapnoRespMode = "etco2" | "respRate";
export type ScenarioPlaybackState = "running" | "paused" | "stopped";

export type ParameterKey =
  | "heartRate"
  | "spo2"
  | "sysIbp"
  | "diasIbp"
  | "etco2"
  | "respRate"
  | "temperature";

export interface ParameterBounds {
  min: number;
  max: number;
  step: number;
  unit: string;
  rangeLabel: string;
  outOfRangeLabel: string;
  errorMessage: string;
}

const IBP_BOUNDS: ParameterBounds = {
  min: 0,
  max: 200,
  step: 1,
  unit: "mmHg",
  rangeLabel: "NIBP • IBP · 0–200",
  outOfRangeLabel: "buiten bereik 0–200",
  errorMessage:
    "De bloeddruk moet tussen 0 en 200 mmHg liggen. De waarde is niet doorgestuurd naar de cursisten.",
};

export const PARAMETER_BOUNDS: Record<ParameterKey, ParameterBounds> = {
  heartRate: {
    min: 0,
    max: 220,
    step: 1,
    unit: "bpm",
    rangeLabel: "bereik 0–220 bpm",
    outOfRangeLabel: "buiten bereik 0–220",
    errorMessage:
      "De hartslag moet tussen 0 en 220 bpm liggen. De waarde is niet doorgestuurd naar de cursisten.",
  },
  spo2: {
    min: 50,
    max: 100,
    step: 1,
    unit: "%",
    rangeLabel: "bereik 50–100 %",
    outOfRangeLabel: "buiten bereik 50–100",
    errorMessage:
      "De SpO₂ moet tussen 50 en 100 % liggen. De waarde is niet doorgestuurd naar de cursisten.",
  },
  sysIbp: IBP_BOUNDS,
  diasIbp: IBP_BOUNDS,
  etco2: {
    min: 0,
    max: 100,
    step: 1,
    unit: "mmHg",
    rangeLabel: "bereik 0–100 mmHg",
    outOfRangeLabel: "buiten bereik 0–100",
    errorMessage:
      "De etCO₂ moet tussen 0 en 100 mmHg liggen. De waarde is niet doorgestuurd naar de cursisten.",
  },
  respRate: {
    min: 0,
    max: 60,
    step: 1,
    unit: "/min",
    rangeLabel: "bereik 0–60 /min",
    outOfRangeLabel: "buiten bereik 0–60",
    errorMessage:
      "De ademhalingsfrequentie moet tussen 0 en 60 /min liggen. De waarde is niet doorgestuurd naar de cursisten.",
  },
  temperature: {
    min: 30.0,
    max: 43.0,
    step: 0.1,
    unit: "°C",
    rangeLabel: "stap 0,1 °C",
    outOfRangeLabel: "buiten bereik 30,0–43,0",
    errorMessage:
      "De temperatuur moet tussen 30,0 en 43,0 °C liggen. De waarde is niet doorgestuurd naar de cursisten.",
  },
};

export interface DefaultParameters extends Pick<
  VitalsResponse,
  "heartRate" | "spo2" | "etco2" | "respRate" | "sysIbp" | "diasIbp"
> {
  temperature: number;
  rhythm: EcgRhythm;
}

export const DEFAULT_PARAMETERS: Parameters = {
  heartRate: 75,
  spo2: 98,
  ampScale: 1,
  sysIbp: 120,
  diasIbp: 80,
  etco2: 38,
  respRate: 16,
  temperature: 36.8,
  rhythm: "Sinusritme",
};

export interface Parameters extends VitalsResponse {
  temperature: number;
  rhythm: EcgRhythm;
}

