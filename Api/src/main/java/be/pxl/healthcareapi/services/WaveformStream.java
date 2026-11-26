package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.WaveformSource;

final class WaveformStream {
    private final WaveformSource source;
    private long nextIndex;
    private double cycleMs;

    WaveformStream(WaveformSource source) {
        this.source = source;
    }

    WaveformSource source() { return source; }
    long nextIndex() { return nextIndex; }

    void startAt(long index) { nextIndex = index; }

    double nextSample(VitalsSnapshot vitals) {
        double period = source.periodMs(vitals);
        cycleMs %= period;
        double value = Math.round(source.valueAt(cycleMs, vitals) * 1000) / 1000.0;
        cycleMs += 1000.0 / source.sampleRate();
        nextIndex++;
        return value;
    }
}
