import type { SweepPoint } from './useSweepWaveform'

export function createSweepBuffer(capacity: number, sampleRate: number, gapSamples: number) {
  const values: (number | null)[] = new Array(capacity).fill(null)
  let lastIndex = -1

  return {
    reset() {
      values.fill(null)
      lastIndex = -1
    },
    add(startIndex: number, samples: number[]) {
      samples.forEach((sample, offset) => {
        const index = startIndex + offset
        values[index % capacity] = sample
        for (let gap = 1; gap <= gapSamples; gap++) values[(index + gap) % capacity] = null
        lastIndex = index
      })
    },
    points(): SweepPoint[] {
      return values.map((value, index) => ({ x: (index * 1000) / sampleRate, y: value }))
    },
    cursorX() {
      return lastIndex < 0 ? 0 : ((lastIndex % capacity) * 1000) / sampleRate
    },
    hasSamples() {
      return lastIndex >= 0
    }
  }
}
