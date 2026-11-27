package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.dto.RoomScenarioResponse;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.domein.VitalsSnapshot;

import java.util.function.LongSupplier;

final class RoomSimulationSession {
    RoomScenarioResponse scenario;
    VitalsSnapshot initial;
    VitalsSnapshot vitals;
    RoomSimulationService.Status status = RoomSimulationService.Status.READY;
    long elapsed;
    long startedAt;

    RoomSimulationSession(RoomScenarioResponse scenario, VitalsSnapshot initial) {
        this.scenario = scenario;
        this.initial = initial;
        this.vitals = initial;
    }

    long elapsedMillis(LongSupplier clock) {
        return elapsed + (status == RoomSimulationService.Status.RUNNING
                ? Math.max(0, clock.getAsLong() - startedAt) : 0);
    }

    synchronized RoomSimulationService.State state(LongSupplier clock) {
        return new RoomSimulationService.State(scenario, status, elapsedMillis(clock), VitalsResponse.from(vitals));
    }
}
