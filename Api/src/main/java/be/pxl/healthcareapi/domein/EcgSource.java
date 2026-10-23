package be.pxl.healthcareapi.domein;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EcgSource implements WaveformSource {
    private static final double REFERENCE_RR_MS = 1000;

    private record Wave(double centerMs, double widthMs, double amp) {}

    private static final List<Wave> FIXED_WAVES = List.of(
            new Wave(160, 25, 0.15),  // P
            new Wave(300, 8, -0.15),  // Q
            new Wave(320, 10, 1.0),   // R
            new Wave(340, 8, -0.25)   // S
    );

    private static final double T_CENTER_MS = 500;
    private static final double T_WIDTH_MS = 45;
    private static final double T_AMP = 0.3;

    @Override public String channel() { return "ecg"; }
    @Override public int sampleRate() { return 250; }
    @Override public String unit() { return "mV"; }
    @Override public double yMin() { return -1; }
    @Override public double yMax() { return 2; }

    @Override
    public double periodMs(VitalsSnapshot vitals) {
        return 60000.0 / vitals.heartRate();
    }

    @Override
    public double valueAt(double cycleMs, VitalsSnapshot vitals) {
        double qtFactor = Math.sqrt(periodMs(vitals) / REFERENCE_RR_MS);

        double sum = 0;
        for (Wave wave : FIXED_WAVES) {
            sum += gaussian(cycleMs, wave.centerMs(), wave.widthMs(), wave.amp());
        }
        sum += gaussian(cycleMs, T_CENTER_MS * qtFactor, T_WIDTH_MS * qtFactor, T_AMP);

        return sum * vitals.ampScale();
    }

    private static double gaussian(double t, double center,double width, double amp) {
        double d = t - center;
        return amp * Math.exp(-(d * d) / (2 * width * width));
    }
}
