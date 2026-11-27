package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.dto.LoadScenarioRequest;
import be.pxl.healthcareapi.dto.SimulationControlRequest;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.services.RoomSimulationService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/rooms/{code}")
public class RoomSimulationController {
    private final RoomSimulationService simulations;

    public RoomSimulationController(RoomSimulationService simulations) {
        this.simulations = simulations;
    }

    @GetMapping("/vitals")
    public VitalsResponse vitals(@PathVariable String code, @AuthenticationPrincipal Jwt jwt) {
        return simulations.getVitals(code, userId(jwt));
    }

    @GetMapping("/simulation")
    public RoomSimulationService.State get(@PathVariable String code, @AuthenticationPrincipal Jwt jwt) {
        return simulations.get(code, userId(jwt));
    }

    @PutMapping("/simulation/scenario")
    public RoomSimulationService.State load(@PathVariable String code, @AuthenticationPrincipal Jwt jwt,
                                            @Valid @RequestBody LoadScenarioRequest request) {
        return simulations.load(code, userId(jwt), request.scenarioId());
    }

    @PostMapping("/simulation")
    public RoomSimulationService.State control(@PathVariable String code, @AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody SimulationControlRequest request) {
        return simulations.control(code, userId(jwt), request.action());
    }

    private static UUID userId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Ongeldige gebruikers-ID");
        }
    }
}
