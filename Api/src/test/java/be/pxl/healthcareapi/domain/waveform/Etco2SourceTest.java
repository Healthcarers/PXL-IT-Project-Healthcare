package be.pxl.healthcareapi.domain.waveform;


import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.domein.waveforms.Etco2Source;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

class Etco2SourceTest {
    private final Etco2Source src = new Etco2Source();
    private final VitalsSnapshot v = new VitalsSnapshot(75, 98, 15, 38, 1.0);

    @Test
    void metadataMatchesContract() {
        assertThat(src.channel()).isEqualTo("etco2");
        assertThat(src.sampleRate()).isEqualTo(50);
        assertThat(src.unit()).isEqualTo("mmHg");
        assertThat(src.yMin()).isZero();
        assertThat(src.yMax()).isEqualTo(50);
    }

    @Test
    void periodFollowsRespirationRate() {
        assertThat(src.periodMs(v)).isCloseTo(4000.0, within(1e-9)); // 60000 / 15
    }

    @Test
    void valuesStayWithinDisplayRange() {
        for (double t = 0; t < src.periodMs(v); t += 10) {
            assertThat(src.valueAt(t, v)).isBetween(src.yMin(), src.yMax());
        }
    }

    @Test
    void inspiratoryBaselineIsZero() {
        double p = src.periodMs(v);
        assertThat(src.valueAt(0.10 * p, v)).isCloseTo(0.0, within(1e-9));
        assertThat(src.valueAt(0.20 * p, v)).isCloseTo(0.0, within(1e-9));
    }

    @Test
    void plateauFollowsEtco2Value() {
        VitalsSnapshot high = new VitalsSnapshot(75, 98, 15, 38, 1.0);
        double p = src.periodMs(high);
        assertThat(src.valueAt(0.70 * p, high)).isBetween(36.0, 42.0);
    }

    @Test
    void cycleRepeatsEachBreath() {
        double p = src.periodMs(v);
        assertThat(src.valueAt(1234, v))
                .isCloseTo(src.valueAt(1234 + p, v), within(1e-9));
    }
}