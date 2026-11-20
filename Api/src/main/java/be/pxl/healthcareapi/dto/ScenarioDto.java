package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.ScenarioStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class ScenarioDto {
    private ScenarioDto() {
    }

    public record Create(
            @NotBlank @Size(max = 255) String name,
            @NotBlank @Size(max = 1000) String description,
            @NotNull VitalsUpdateRequest initialVitals,
            @NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 500) String> feedbackItems,
            ScenarioStatus status
    ) {
        public Create {
            if (status == null) {
                status = ScenarioStatus.PUBLISHED;
            }
        }
    }

    public record Details(
            UUID id, String name, String description, VitalsResponse initialVitals, List<String> feedbackItems,
            ScenarioStatus status
    ) {
    }

    public record Evaluate(@NotEmpty @Size(max = 100) List<@NotNull Boolean> results) {
    }

    public record Evaluation(
            UUID id, UUID scenarioId, UUID evaluatorId, Instant evaluatedAt, List<Boolean> results
    ) {
    }
}
