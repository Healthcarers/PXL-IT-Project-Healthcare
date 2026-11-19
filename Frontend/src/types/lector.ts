export type EcgRhythm =
  | 'Sinusritme'
  | 'Sinustachycardie'
  | 'Sinusbradycardie'
  | 'Atriumfibrillatie'
  | 'Ventrikeltachycardie'
  | 'Ventrikelfibrillatie'
  | 'Asystolie'

export const ECG_RHYTHMS: readonly EcgRhythm[] = [
  'Sinusritme',
  'Sinustachycardie',
  'Sinusbradycardie',
  'Atriumfibrillatie',
  'Ventrikeltachycardie',
  'Ventrikelfibrillatie',
  'Asystolie',
] as const

export type BloodPressureTarget = 'systolic' | 'diastolic'
export type CapnoRespMode = 'etco2' | 'af'
export type ScenarioPlaybackState = 'running' | 'paused' | 'stopped'

export type ParameterKey =
  | 'heartRate'
  | 'spo2'
  | 'bloodPressure'
  | 'etco2'
  | 'respRate'
  | 'temperature'

export interface ParameterBounds {
  min: number
  max: number
  step: number
  unit: string
  rangeLabel: string
  outOfRangeLabel: string
  errorMessage: string
}

export const PARAMETER_BOUNDS: Record<ParameterKey, ParameterBounds> = {
  heartRate: {
    min: 20,
    max: 200,
    step: 1,
    unit: 'bpm',
    rangeLabel: 'bereik 20–200 bpm',
    outOfRangeLabel: 'buiten bereik 20–200',
    errorMessage:
      'De hartslag moet tussen 20 en 200 bpm liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
  spo2: {
    min: 10,
    max: 100,
    step: 1,
    unit: '%',
    rangeLabel: 'bereik 10–100 %',
    outOfRangeLabel: 'buiten bereik 10–100',
    errorMessage:
      'De SpO₂ moet tussen 10 en 100 % liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
  bloodPressure: {
    min: 0,
    max: 400,
    step: 1,
    unit: 'mmHg',
    rangeLabel: 'NIBP • IBP · 0–400',
    outOfRangeLabel: 'buiten bereik 0–400',
    errorMessage:
      'De bloeddruk moet tussen 0 en 400 mmHg liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
  etco2: {
    min: 0,
    max: 150,
    step: 1,
    unit: 'mmHg',
    rangeLabel: 'bereik 0–150 mmHg',
    outOfRangeLabel: 'buiten bereik 0–150',
    errorMessage:
      'De etCO₂ moet tussen 0 en 150 mmHg liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
  respRate: {
    min: 2,
    max: 40,
    step: 1,
    unit: '/min',
    rangeLabel: 'bereik 2–40 /min',
    outOfRangeLabel: 'buiten bereik 2–40',
    errorMessage:
      'De ademhalingsfrequentie moet tussen 2 en 40 /min liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
  temperature: {
    min: 30.0,
    max: 43.0,
    step: 0.1,
    unit: '°C',
    rangeLabel: 'stap 0,1 °C',
    outOfRangeLabel: 'buiten bereik 30,0–43,0',
    errorMessage:
      'De temperatuur moet tussen 30,0 en 43,0 °C liggen. De waarde is niet doorgestuurd naar de cursisten.',
  },
}

export interface LectorParameters {
  heartRate: number
  spo2: number
  systolicBp: number
  diastolicBp: number
  etco2: number
  respRate: number
  temperature: number
  rhythm: EcgRhythm
}

export function createDefaultLectorParameters(): LectorParameters {
  return {
    heartRate: 75,
    spo2: 98,
    systolicBp: 120,
    diastolicBp: 80,
    etco2: 38,
    respRate: 16,
    temperature: 36.8,
    rhythm: 'Sinusritme',
  }
}
