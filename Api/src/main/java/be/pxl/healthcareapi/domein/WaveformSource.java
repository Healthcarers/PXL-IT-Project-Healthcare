package be.pxl.healthcareapi.domein;

public interface WaveformSource {
    String channel();
    int sampleRate();
    String unit();
    double yMin();
    double yMax();

    double periodMs(VitalsSnapshot vitals);

    double valueAt(double cycleMs, VitalsSnapshot vitals);
}
