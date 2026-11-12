package be.pxl.healthcareapi.domain.waveform;

import be.pxl.healthcareapi.domein.waveforms.EcgSource;
import be.pxl.healthcareapi.domein.VitalsSnapshot;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

public class EcgSourceTest {
    private final EcgSource ecg = new EcgSource();

    private static VitalsSnapshot vitals(double bpm) {
        return new VitalsSnapshot(bpm, 98, 1);
    }

    private double peakOverCycle(VitalsSnapshot vitals) {
        double peak = Double.NEGATIVE_INFINITY;
        double period = ecg.periodMs(vitals);
        for (double t = 0; t < period; t += 1) {
            peak = Math.max(peak, ecg.valueAt(t, vitals));
        }
        return peak;
    }

    @Test
    void metadataMatchesContract() {
        assertThat(ecg.channel()).isEqualTo("ecg");
        assertThat(ecg.sampleRate()).isEqualTo(250);
        assertThat(ecg.unit()).isEqualTo("mV");
        assertThat(ecg.yMin()).isEqualTo(-1);
        assertThat(ecg.yMax()).isEqualTo(2);
    }

    @Test
    void periodIsDerivedFromHeartRate() {
        assertThat(ecg.periodMs(vitals(60))).isEqualTo(1000.0);
        assertThat(ecg.periodMs(vitals(120))).isEqualTo(500.0);
    }

    @ParameterizedTest
    @ValueSource(doubles = {60, 90, 120, 150})
    void rPeakHeightStaysNearOneAtNormalRate(double bpm) {
        assertThat(peakOverCycle(vitals(bpm))).isCloseTo(1.0, within(0.05));
    }

    @Test
    void ampScaleScalesEveryPointLinearly() {
        VitalsSnapshot base = new VitalsSnapshot(75, 98, 1.0);
        VitalsSnapshot doubled = new VitalsSnapshot(75, 98, 2.0);

        for (double t = 0; t < 1000; t += 37) {
            assertThat(ecg.valueAt(t, doubled))
                    .isCloseTo(2 * ecg.valueAt(t, base), within(1e-9));
        }
    }

    @Test
    void cycleIsPeriodic() {
        VitalsSnapshot v = vitals(90);
        double period = ecg.periodMs(v);

        for (double t = 0; t < period; t += 25) {
            assertThat(ecg.valueAt(t + period, v))
                    .isCloseTo(ecg.valueAt(t, v), within(1e-9));
        }
    }

    @Test
    void baselineBetweenTWaveAndNextPWaveAt200Bpm() {
        assertThat(ecg.valueAt(240, vitals(200))).isLessThan(0.05);
    }

    @Test
    void flatlineWhenHeartRateIsZero() {
        VitalsSnapshot flat = new VitalsSnapshot(0, 1.0);
        for (double t = 0; t < 2000; t += 25) {
            assertThat(ecg.valueAt(t, flat)).isEqualTo(0.0);
        }
    }
}
