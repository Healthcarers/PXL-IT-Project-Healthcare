package be.pxl.healthcareapi.domein.waveforms;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import org.springframework.stereotype.Component;

@Component
public class Spo2Source implements WaveformSource {

    // Systolic peak, as a fraction of the cycle
    private static final double SYS_CENTER = 0.18;
    private static final double SYS_RISE = 0.07;   // steep upstroke
    private static final double SYS_FALL = 0.09;  // quick decline to the notch

    // Diastolic (reflected) wave, as a fraction of the cycle
    private static final double DIC_CENTER = 0.42;
    private static final double DIC_AMP = 0.5;
    private static final double DIC_SIGMA = 0.07;

    // Maps the normalized wave (0..1) onto the display range
    private static final double BASELINE = 0.05;
    private static final double GAIN = 0.85;

    @Override public String channel() { return "spo2"; }
    @Override public int sampleRate() { return 125; }
    @Override public String unit() { return "a.u."; }
    @Override public double yMin() { return 0; }
    @Override public double yMax() { return 1; }

    @Override
    public double periodMs(VitalsSnapshot v) {
        return 60000.0 / v.heartRate();
    }

    @Override
    public double valueAt(double cycleMs, VitalsSnapshot v) {
        double p = cycleMs / periodMs(v);

        double sysOffset = wrap(p - SYS_CENTER);
        double systolic = gaussian(sysOffset, sysOffset < 0 ? SYS_RISE : SYS_FALL);
        double diastolic = DIC_AMP * gaussian(wrap(p - DIC_CENTER), DIC_SIGMA);

        double value = BASELINE + GAIN * v.ampScale() * (systolic + diastolic);
        return Math.min(yMax(), Math.max(yMin(), value));
    }

    private static double gaussian(double d, double sigma) {
        return Math.exp(-(d * d) / (2 * sigma * sigma));
    }

    private static double wrap(double d) {
        return d - Math.rint(d);
    }
}