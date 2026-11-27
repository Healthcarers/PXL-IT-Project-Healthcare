package be.pxl.healthcareapi.domein.waveforms;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import org.springframework.stereotype.Component;

/**
 * Invasive blood pressure (IBP) waveform, in mmHg.
 *
 * The trace is built as a normalized wave from 0 to 1, then mapped onto the
 * range between diastolic and systolic pressure. The trough sits at diastolic,
 * the systolic peak at systolic, and the dicrotic notch and wave in between.
 * Because the amplitude comes from the vitals, changing sysIBP or diasIBP
 * changes the trace height directly.
 */
@Component
public class IbpSource implements WaveformSource {

    // Systolic upstroke and decay, as fractions of the cycle
    private static final double SYS_CENTER = 0.15;
    private static final double SYS_RISE = 0.06;
    private static final double SYS_FALL = 0.12;

    // Dicrotic wave after the notch (aortic valve closure)
    private static final double DIC_CENTER = 0.42;
    private static final double DIC_AMP = 0.35;
    private static final double DIC_RISE = 0.05;
    private static final double DIC_FALL = 0.10;

    @Override public String channel() { return "ibp"; }
    @Override public int sampleRate() { return 125; }
    @Override public String unit() { return "mmHg"; }
    @Override public double yMin() { return 0; }
    @Override public double yMax() { return 200; }

    @Override
    public double periodMs(VitalsSnapshot v) {
        return v.heartRate() > 0 ? 60000.0 / v.heartRate() : 1000;
    }

    @Override
    public double valueAt(double cycleMs, VitalsSnapshot v) {
        if (v.heartRate() <= 0) return 0;
        double p = cycleMs / periodMs(v);

        double sysOffset = wrap(p - SYS_CENTER);
        double systolic = gaussian(sysOffset, sysOffset < 0 ? SYS_RISE : SYS_FALL);

        double dicOffset = wrap(p - DIC_CENTER);
        double dicrotic = DIC_AMP * gaussian(dicOffset, dicOffset < 0 ? DIC_RISE : DIC_FALL);

        // Clamp so tiny Gaussian tails never dip below diastolic
        double wave = Math.clamp(systolic + dicrotic, 0.0, 1.0);

        double pressure = v.diasBp() + (v.sysBp() - v.diasBp()) * wave;
        return Math.min(yMax(), Math.max(yMin(), pressure));
    }

    private static double gaussian(double d, double sigma) {
        return Math.exp(-(d * d) / (2 * sigma * sigma));
    }

    private static double wrap(double d) {
        return d - Math.rint(d);
    }
}