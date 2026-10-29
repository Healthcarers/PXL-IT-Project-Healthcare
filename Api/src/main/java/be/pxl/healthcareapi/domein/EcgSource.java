package be.pxl.healthcareapi.domein;

import org.springframework.stereotype.Component;

@Component
public class EcgSource implements WaveformSource {

    /** PR interval at 60 bpm, from the P peak to the R peak. */
    private static final double PR_REF_MS = 160;

    /** R peak to T peak at 60 bpm. */
    private static final double RT_REF_MS = 180;

    /** Widths of P and T at 60 bpm. The QRS width is fixed because it doesn't change with rate. */
    private static final double P_SIGMA_REF_MS = 25;
    private static final double T_SIGMA_REF_MS = 45;

    private static final double MIN_P_SIGMA_MS = 12;
    private static final double MIN_T_SIGMA_MS = 15;

    private record Wave(double centerMs, double sigmaMs, double amp) {}

    @Override public String channel() { return "ecg"; }
    @Override public int sampleRate() { return 250; }
    @Override public String unit() { return "mV"; }
    @Override public double yMin() { return -1; }
    @Override public double yMax() { return 2; }

    @Override
    public double periodMs(VitalsSnapshot v) {
        return 60000.0 / v.heartRate();
    }

    @Override
    public double valueAt(double cycleMs, VitalsSnapshot v) {
        double period = periodMs(v);

        // k is 1.0 at 60 bpm and shrinks as the period shrinks.
        double k = Math.sqrt(period / 1000.0);

        // The P wave is centered at cycle position 0. Everything else is placed relative to it.
        Wave p = new Wave(0,
                Math.max(MIN_P_SIGMA_MS, P_SIGMA_REF_MS * k),
                0.15);

        double rCenter = PR_REF_MS * k;
        Wave q = new Wave(rCenter - 20, 8, -0.15);
        Wave r = new Wave(rCenter, 10, 1.0);
        Wave s = new Wave(rCenter + 20, 8, -0.25);

        Wave t = new Wave(
                rCenter + RT_REF_MS * k,
                Math.max(MIN_T_SIGMA_MS, T_SIGMA_REF_MS * k),
                0.3);

        double sum = 0;
        for (Wave w : new Wave[]{p, q, r, s, t}) {
            sum += gaussian(cycleMs, period, w.centerMs(), w.sigmaMs(), w.amp());
        }
        return sum * v.ampScale();
    }

    private static double gaussian(double t, double period, double center, double sigma, double amp) {
        double d = circularDistance(t, center, period);
        return amp * Math.exp(-(d * d) / (2 * sigma * sigma));
    }

    /** Signed distance from c to t, wrapped into [-period/2, period/2). */
    private static double circularDistance(double t, double c, double period) {
        double d = (t - c) % period;
        if (d < -period / 2) d += period;
        if (d >= period / 2) d -= period;
        return d;
    }
}