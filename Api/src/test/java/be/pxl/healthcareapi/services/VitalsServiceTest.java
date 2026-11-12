package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.VitalsSnapshot;
import be.pxl.healthcareapi.dto.VitalsUpdateRequest;
import be.pxl.healthcareapi.repos.VitalsRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.function.UnaryOperator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class VitalsServiceTest {
    @Mock
    VitalsRepository repository;

    private final VitalsSnapshot current = new VitalsSnapshot(75, 98, 1.0);

    private VitalsService service() {
        return new VitalsService(repository);
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

        VitalsSnapshot result = service().update(new VitalsUpdateRequest(120.0, 98.0, null));

        assertThat(result).isEqualTo(new VitalsSnapshot(120, 98, 1.0));
    }

    @Test
    void updateAllFieldsWhenProvided() {
        applyUpdatesTo(current);

        VitalsSnapshot result = service().update(new VitalsUpdateRequest(95.0, 98.0, 1.5));

        assertThat(result).isEqualTo(new VitalsSnapshot(95, 98, 1.5));
    }

    @Test
    void rejectsHeartRateOutOfRange() {
        applyUpdatesTo(current);

        assertThatThrownBy(() -> service().update(new VitalsUpdateRequest(999.0, 98.0, null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void heartRateZeroIsAcceptedForFlatline() {
        applyUpdatesTo(current);
        VitalsSnapshot result = service().update(new VitalsUpdateRequest(0.0, null));
        assertThat(result.heartRate()).isEqualTo(0);
    }
}
