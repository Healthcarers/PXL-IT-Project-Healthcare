package be.pxl.healthcareapi.domein.waveforms;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import org.springframework.stereotype.Component;

@Component
public class Etco2Source implements WaveformSource {
    private static final double PHASE_I_START = 0.30;
    private static final double PHASE_II_START = 0.36;
    private static final double PLATEAU_START = 0.46;
    private static final double DOWNSTROKE_START = 0.92;

    private static final double PHASE_I_LEVEL = 0.08;    // fraction of ETCO2 reached at end of phase I
    private static final double PLATEAU_SLOPE = 0.03;    // alveolar upslope across the plateau
    private static final double CARDIOGENIC_MMHG = 0.6;  // heartbeat oscillation on the plateau

    @Override public String channel() { return "etco2"; }
    @Override public int sampleRate() { return 50; }
    @Override public String unit() { return "mmHg"; }
    @Override public double yMin() { return 0; }
    @Override public double yMax() { return 100; }

    @Override
    public double periodMs(VitalsSnapshot v) {
        return v.respRate() > 0 ? 60000.0 / v.respRate() : 1000;
    }

    @Override
    public double valueAt(double cycleMs, VitalsSnapshot v) {
        if (v.respRate() <= 0) return 0;

        double e = v.etco2();
        double p = cycleMs / periodMs(v);
        p -= Math.floor(p);

        if (p < PHASE_I_START) {
            return 0.0;
        }
        if (p < PHASE_II_START) {
            double t = (p - PHASE_I_START) / (PHASE_II_START - PHASE_I_START);
            return e * PHASE_I_LEVEL * smoothstep(t);
        }
        if (p < PLATEAU_START) {
            double t = (p - PHASE_II_START) / (PLATEAU_START - PHASE_II_START);
            double base = e * PHASE_I_LEVEL;
            return base + (e - base) * smoothstep(t);
        }
        if (p < DOWNSTROKE_START) {
            double t = (p - PLATEAU_START) / (DOWNSTROKE_START - PLATEAU_START);
            double plateau = e * (1 + PLATEAU_SLOPE * t);
            int beatsPerBreath = v.respRate() > 0 ? Math.max(1, (int) Math.round(v.heartRate() / v.respRate())) : 1;
            double ripple = CARDIOGENIC_MMHG
                    * Math.sin(2 * Math.PI * beatsPerBreath * p)
                    * Math.sin(Math.PI * t);
            return Math.max(plateau + ripple, 0.0);
        }
        double t = (p - DOWNSTROKE_START) / (1.0 - DOWNSTROKE_START);
        double start = e * (1 + PLATEAU_SLOPE);
        return start * (1 - smoothstep(t));
    }

    private static double smoothstep(double t) {
        double x = Math.clamp(t, 0, 1);
        return x * x * (3 - 2 * x);
    }
}
