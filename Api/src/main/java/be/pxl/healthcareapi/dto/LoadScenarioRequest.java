package be.pxl.healthcareapi.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record LoadScenarioRequest(@NotNull UUID scenarioId) {
}
