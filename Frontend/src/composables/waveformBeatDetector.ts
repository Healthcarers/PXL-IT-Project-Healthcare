export function createBeatDetector(threshold: number, minimumGap: number) {
  let previous = 0
  let lastBeat = -Infinity

  return {
    reset() {
      previous = 0
      lastBeat = -Infinity
    },
    forEachBeat(startIndex: number, samples: number[], onBeat: (index: number) => void) {
      samples.forEach((sample, offset) => {
        const index = startIndex + offset
        const rising = previous < threshold && sample >= threshold
        previous = sample
        if (!rising || index - lastBeat < minimumGap) return
        lastBeat = index
        onBeat(index)
      })
    }
  }
}
