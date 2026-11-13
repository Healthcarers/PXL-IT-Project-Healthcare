export interface WaveformChunk {
    channel: string
    startIndex: number
    sampleRate: number
    samples: number[]
}

export interface Point {
    x: number
    y: number
}