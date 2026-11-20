package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.services.RoomSimulationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
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
                                            @Valid @RequestBody Load request) {
        return simulations.load(code, userId(jwt), request.scenarioId());
    }

    @PostMapping("/simulation")
    public RoomSimulationService.State control(@PathVariable String code, @AuthenticationPrincipal Jwt jwt,
                                               @Valid @RequestBody Control request) {
        return simulations.control(code, userId(jwt), request.action());
    }

    public record Load(@NotNull UUID scenarioId) {}
    public record Control(@NotNull RoomSimulationService.Action action) {}

    private static UUID userId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Ongeldige gebruikers-ID");
        }
    }
}
