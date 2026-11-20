package be.pxl.healthcareapi.dto;

import be.pxl.healthcareapi.domein.Scenario;

import java.util.UUID;

public record RoomScenarioResponse(UUID id, String name, VitalsResponse initialVitals) {
    public static RoomScenarioResponse from(Scenario scenario) {
        return new RoomScenarioResponse(scenario.getId(), scenario.getName(),
                VitalsResponse.from(scenario.getInitialVitals()));
    }
}
