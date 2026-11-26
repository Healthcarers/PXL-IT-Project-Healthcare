package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repositories.VitalsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class VitalsServiceTest {
    @Mock
    VitalsRepository repository;

    @Mock
    SimpMessagingTemplate messaging;

    private final VitalsSnapshot current = new VitalsSnapshot(75, 98, 15, 38, 1.0, 120, 80, 36.5);

    private VitalsService service() {
        return new VitalsService(repository, messaging);
    }

    private void applyUpdatesTo(VitalsSnapshot base) {
        when(repository.update(any())).thenAnswer(inv -> {
            UnaryOperator<VitalsSnapshot> change = inv.getArgument(0);
            return change.apply(base);
        });
    }

    @Test
    void getReturnsCurrentSnapshot() {
        when(repository.current()).thenReturn(current);
        assertThat(service().get()).isEqualTo(current);
    }

    @Test
    void partialUpdateKeepsUnchangedFields() {
        applyUpdatesTo(current);

        VitalsSnapshot result = service().update(new VitalsUpdateRequest(120.0, null, null, null, null, null, null, null));

        assertThat(result).isEqualTo(new VitalsSnapshot(120, 98, 15, 38, 1.0, 120, 80, 36.5));
    }

    @Test
    void updateAllFieldsWhenProvided() {
        applyUpdatesTo(current);

        VitalsSnapshot result = service().update(new VitalsUpdateRequest(95.0, 98.0, 14.0, 40.0, 1.5, 120.0, 80.0, null));

        assertThat(result).isEqualTo(new VitalsSnapshot(95, 98, 14, 40, 1.5, 120, 80, 36.5));
    }

    @Test
    void rejectsHeartRateOutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(999.0, 98.0, 15.0, 38.0, 1.0, 120.0, 80.0, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsSpo2OutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(90.0, 120.0, null, null, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsEtco2OutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(90.0, 98.0, null, 120.0, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsRespRateOutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(90.0, null,  100.0, null, null, null, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void heartRateZeroIsAcceptedForFlatline() {
        applyUpdatesTo(current);
        VitalsSnapshot result = service().update(new VitalsUpdateRequest(0.0, 98.0, null, null, null, null, null, null));
        assertThat(result.heartRate()).isEqualTo(0);
    }

    @Test
    void respRateZeroIsAcceptedForFlatline() {
        applyUpdatesTo(current);
        VitalsSnapshot result = service().update(new VitalsUpdateRequest(90.0, 98.0, 0.0, null, null, null, null, null));
        assertThat(result.respRate()).isEqualTo(0);
    }

    @Test
    void rejectsSysBloodPressureOutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(null, null,  null, null, null, 500.0, null, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void rejectsDiasBloodPressureOutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(null, null,  null, null, null, null, 500.0, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void successfulUpdatePublishesVitals() {
        applyUpdatesTo(current);

        service().update(new VitalsUpdateRequest(90.0, null, null, null, null, null, null, null));

        verify(messaging).convertAndSend(eq("/topic/vitals"), any(VitalsResponse.class));
    }

    @Test
    void temperatureUpdatesAreValidatedAndBroadcastWithoutChangingOtherValues() {
        applyUpdatesTo(current);
        var result = service().update(new VitalsUpdateRequest(null, null, null, null, null, null, null, 38.2));
        assertThat(result).isEqualTo(new VitalsSnapshot(75, 98, 15, 38, 1, 120, 80, 38.2));
        var sent = ArgumentCaptor.forClass(VitalsResponse.class);
        verify(messaging).convertAndSend(eq("/topic/vitals"), sent.capture());
        assertThat(sent.getValue().temperature()).isEqualTo(38.2);
    }

    @Test
    void invalidTemperatureIsRejectedWithoutBroadcasting() {
        applyUpdatesTo(current);
        for (double value : new double[]{19.9, 45.1, Double.NaN, Double.POSITIVE_INFINITY}) {
            assertThatThrownBy(() -> service().update(
                    new VitalsUpdateRequest(null, null, null, null, null, null, null, value)))
                    .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("temperature");
        }
        verifyNoInteractions(messaging);
    }

    @Test
    void temperatureRangeIncludesBothBoundaries() {
        applyUpdatesTo(current);
        for (double value : new double[]{20, 45}) {
            assertThat(service().update(new VitalsUpdateRequest(null, null, null, null, null, null, null, value))
                    .temperature()).isEqualTo(value);
        }
    }

    @Test
    void scenarioInvasiveBloodPressureRangeDoesNotRelaxLiveUpdateLimits() {
        var request = new VitalsUpdateRequest(75.0, 98.0, 15.0, 38.0, 1.0, 250.0, 80.0, null);

        assertThat(VitalsService.initialSnapshot(request))
                .isEqualTo(new VitalsSnapshot(75, 98, 15, 38, 1.0, 250, 80, 36.5));
        verifyNoInteractions(repository, messaging);

        applyUpdatesTo(current);
        assertThatThrownBy(() -> service().update(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("sysIbp");
        verifyNoInteractions(messaging);
    }
}
