package be.pxl.healthcareapi.domain.waveform;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.Spo2Source;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class Spo2SourceTest {

    private final Spo2Source src = new Spo2Source();
    private final VitalsSnapshot v = new VitalsSnapshot(60, 98, 15, 38, 1.0, 120, 80);

    @Test
    void metadataMatchesContract() {
        assertThat(src.channel()).isEqualTo("spo2");
        assertThat(src.sampleRate()).isEqualTo(125);
        assertThat(src.unit()).isEqualTo("a.u.");
        assertThat(src.yMin()).isEqualTo(0);
        assertThat(src.yMax()).isEqualTo(1);
    }

    @Test
    void periodFollowsHeartRate() {
        assertThat(src.periodMs(v)).isCloseTo(1000, within(1e-9));
        assertThat(src.periodMs(new VitalsSnapshot(120, 98, 15, 38, 1.0, 120, 80))).isCloseTo(500, within(1e-9));
    }

    @Test
    void valuesStayWithinDisplayRange() {
        for (double t = 0; t < src.periodMs(v); t += 4) {
            assertThat(src.valueAt(t, v)).isBetween(src.yMin(), src.yMax());
        }
    }

    @Test
    void valuesStayWithinDisplayRangeAtHighAmpScale() {
        VitalsSnapshot highGain = new VitalsSnapshot(60, 98, 15, 38, 3.0, 120, 80);

        for (double t = 0; t < src.periodMs(highGain); t += 4) {
            assertThat(src.valueAt(t, highGain)).isBetween(src.yMin(), src.yMax());
        }
    }

    @Test
    void systolicPeakOccursNearExpectedPosition() {
        assertThat(findPeakMs(v)).isCloseTo(0.18 * src.periodMs(v), within(10.0));
    }

    @Test
    void dicroticNotchSitsBetweenSystolicPeakAndDiastolicWave() {
        double period = src.periodMs(v);
        double systolic = src.valueAt(0.18 * period, v);
        double notch = src.valueAt(0.34 * period, v);
        double diastolic = src.valueAt(0.42 * period, v);

        assertThat(notch).isLessThan(systolic);
        assertThat(notch).isLessThan(diastolic);
    }

    @Test
    void cycleRepeatsEachBeat() {
        assertThat(src.valueAt(250, v))
                .isCloseTo(src.valueAt(250 + src.periodMs(v), v), within(1e-9));
    }

    @Test
    void shapeScalesInTimeWithHeartRate() {
        VitalsSnapshot fast = new VitalsSnapshot(120, 98, 15, 38, 1.0, 120, 80);

        assertThat(src.valueAt(0.34 * src.periodMs(fast), fast))
                .isCloseTo(src.valueAt(0.34 * src.periodMs(v), v), within(1e-9));
    }

    @Test
    void ampScaleChangesPeakHeight() {
        VitalsSnapshot half = new VitalsSnapshot(60, 98, 15, 38, 0.5, 120, 80);
        double peakTime = 0.18 * src.periodMs(v);

        double full = src.valueAt(peakTime, v) - 0.05;
        double scaled = src.valueAt(peakTime, half) - 0.05;

        assertThat(scaled).isCloseTo(full * 0.5, within(0.01));
    }

    @Test
    void highAmpScaleClipsPeakAtDisplayMaximum() {
        VitalsSnapshot highGain = new VitalsSnapshot(60, 98, 15, 38, 3.0, 120, 80);

        assertThat(src.valueAt(0.18 * src.periodMs(highGain), highGain))
                .isEqualTo(src.yMax());
    }

    private double findPeakMs(VitalsSnapshot snap) {
        double bestTime = 0;
        double bestValue = Double.NEGATIVE_INFINITY;
        for (double t = 0; t < src.periodMs(snap); t += 1) {
            double value = src.valueAt(t, snap);
            if (value > bestValue) {
                bestValue = value;
                bestTime = t;
            }
        }
        return bestTime;
    }
}