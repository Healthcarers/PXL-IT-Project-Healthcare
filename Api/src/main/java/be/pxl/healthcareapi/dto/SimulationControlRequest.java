package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.services.RoomSimulationService;
import jakarta.validation.constraints.NotNull;

public record SimulationControlRequest(@NotNull RoomSimulationService.Action action) {
}
