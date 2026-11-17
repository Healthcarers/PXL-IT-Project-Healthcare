package be.pxl.healthcareapi.domein.waveforms;

import be.pxl.healthcareapi.domein.VitalsSnapshot;

public interface WaveformSource {
    String channel();
    int sampleRate();
    String unit();
    double yMin();
    double yMax();

    double periodMs(VitalsSnapshot vitals);

    double valueAt(double cycleMs, VitalsSnapshot vitals);
}
