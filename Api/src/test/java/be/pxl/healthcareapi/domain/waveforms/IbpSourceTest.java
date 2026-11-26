package be.pxl.healthcareapi.domain.waveforms;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.IbpSource;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class IbpSourceTest {

    private final IbpSource src = new IbpSource();
    private final VitalsSnapshot v = VitalsSnapshot.defaults();

    private static VitalsSnapshot withBp(double heartRate, double sys, double dia) {
        return new VitalsSnapshot(heartRate, 98, 15, 38, 1.0, sys, dia, 36.5);
    }

    @Test
    void metadataMatchesContract() {
        assertThat(src.channel()).isEqualTo("ibp");
        assertThat(src.sampleRate()).isEqualTo(125);
        assertThat(src.unit()).isEqualTo("mmHg");
        assertThat(src.yMin()).isEqualTo(0);
        assertThat(src.yMax()).isEqualTo(200);
    }

    @Test
    void periodFollowsHeartRate() {
        assertThat(src.periodMs(withBp(60, 120, 80))).isCloseTo(1000, within(1e-9));
        assertThat(src.periodMs(withBp(120, 120, 80))).isCloseTo(500, within(1e-9));
    }

    @Test
    void systolicPeakMatchesSystolicPressure() {
        VitalsSnapshot snap = withBp(60, 120, 80);

        double peak = src.valueAt(0.15 * src.periodMs(snap), snap);

        assertThat(peak).isCloseTo(120, within(0.5));
    }

    @Test
    void troughMatchesDiastolicPressure() {
        VitalsSnapshot snap = withBp(60, 120, 80);

        double trough = src.valueAt(0.87 * src.periodMs(snap), snap);

        assertThat(trough).isCloseTo(80, within(0.5));
    }

    @Test
    void dicroticNotchSitsAboveDiastolicAndBelowSystolic() {
        VitalsSnapshot snap = withBp(60, 120, 80);
        double period = src.periodMs(snap);

        double systolic = src.valueAt(0.15 * period, snap);
        double notch = src.valueAt(0.345 * period, snap);
        double dicrotic = src.valueAt(0.405 * period, snap);
        double diastolic = src.valueAt(0.87 * period, snap);

        assertThat(notch).isLessThan(systolic);
        assertThat(notch).isLessThan(dicrotic);
        assertThat(notch).isGreaterThan(diastolic);
    }

    @Test
    void valuesStayBetweenDiastolicAndSystolic() {
        VitalsSnapshot snap = withBp(60, 120, 80);

        for (double t = 0; t < src.periodMs(snap); t += 4) {
            assertThat(src.valueAt(t, snap)).isBetween(80.0, 120.0);
        }
    }

    @Test
    void cycleRepeatsEachBeat() {
        assertThat(src.valueAt(250, v))
                .isCloseTo(src.valueAt(250 + src.periodMs(v), v), within(1e-9));
    }

    @Test
    void shapeScalesInTimeWithHeartRate() {
        VitalsSnapshot fast = withBp(120, 120, 80);

        assertThat(src.valueAt(0.345 * src.periodMs(fast), fast))
                .isCloseTo(src.valueAt(0.345 * src.periodMs(v), v), within(1e-9));
    }

    @Test
    void changingVitalsChangesTraceHeight() {
        VitalsSnapshot high = withBp(60, 140, 90);

        assertThat(src.valueAt(0.15 * src.periodMs(high), high)).isCloseTo(140, within(0.5));
        assertThat(src.valueAt(0.87 * src.periodMs(high), high)).isCloseTo(90, within(0.5));
    }

    @Test
    void pressureClampsToDisplayMaximum() {
        VitalsSnapshot extreme = withBp(60, 260, 80);

        assertThat(src.valueAt(0.15 * src.periodMs(extreme), extreme)).isEqualTo(src.yMax());
    }
}