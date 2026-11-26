export function createRequestGuard() {
  let generation = 0
  let request = 0

  return {
    reset() {
      generation++
    },
    begin() {
      const requestGeneration = generation
      const requestId = ++request
      return { isCurrent: () => requestGeneration === generation && requestId === request }
    },
    invalidate() {
      request++
    }
  }
}
