type ContextFactory = () => AudioContext;

let createContext: ContextFactory = () => new AudioContext();
let ctx: AudioContext | null = null;
let flatline: { osc: OscillatorNode; gain: GainNode } | null = null;

export function setAudioContextFactory(factory: ContextFactory): void {
    createContext = factory;
    ctx = null;
    flatline = null;
}

export function ensureAudio(): AudioContext {
    if (!ctx) ctx = createContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
}

export function isAudioRunning(): boolean {
    return ctx?.state === 'running';
}

export function audioNow(): number {
    return ensureAudio().currentTime;
}

export function scheduleBeep(at: number, freq = 1000, peak = 0.4): void {
    const c = ensureAudio();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.08);

    osc.connect(gain).connect(c.destination);
    osc.start(at);
    osc.stop(at + 0.09);
}

export function startFlatline(freq = 880, level = 0.25): void {
    if (flatline) return;
    const c = ensureAudio();
    const osc = c.createOscillator();
    const gain = c.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = level;
    osc.connect(gain).connect(c.destination);
    osc.start();
    flatline = { osc, gain };
}

export function stopFlatline(): void {
    if (!flatline || !ctx) return;
    const { osc, gain } = flatline;
    flatline = null;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.05);
    osc.stop(now + 0.06);
}