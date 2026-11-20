package be.pxl.healthcareapi.controllers;

import be.pxl.healthcareapi.dto.ScenarioDto;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.services.ScenarioService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/scenarios")
public class ScenarioController {
    private final ScenarioService scenarioService;

    public ScenarioController(ScenarioService scenarioService) {
        this.scenarioService = scenarioService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioDto.Details create(@Valid @RequestBody ScenarioDto.Create request) {
        return scenarioService.create(request);
    }

    @GetMapping
    public List<ScenarioDto.Details> list() {
        return scenarioService.list();
    }

    @GetMapping("/{scenarioId}")
    public ScenarioDto.Details get(@PathVariable UUID scenarioId) {
        return scenarioService.get(scenarioId);
    }

    @PutMapping("/{scenarioId}")
    public ScenarioDto.Details updateDraft(@PathVariable UUID scenarioId,
                                           @Valid @RequestBody ScenarioDto.Create request) {
        return scenarioService.updateDraft(scenarioId, request);
    }

    @DeleteMapping("/{scenarioId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID scenarioId) {
        scenarioService.delete(scenarioId);
    }

    @PostMapping("/{scenarioId}/evaluations")
    @ResponseStatus(HttpStatus.CREATED)
    public ScenarioDto.Evaluation evaluate(@PathVariable UUID scenarioId, @AuthenticationPrincipal Jwt jwt,
                                           @Valid @RequestBody ScenarioDto.Evaluate request) {
        return scenarioService.evaluate(scenarioId, evaluatorId(jwt), request);
    }

    @GetMapping("/{scenarioId}/evaluations/{evaluationId}")
    public ScenarioDto.Evaluation getEvaluation(@PathVariable UUID scenarioId, @PathVariable UUID evaluationId,
                                                @AuthenticationPrincipal Jwt jwt) {
        return scenarioService.getEvaluation(scenarioId, evaluationId, evaluatorId(jwt));
    }

    private static UUID evaluatorId(Jwt jwt) {
        String subject = jwt.getSubject();
        if (subject == null) {
            throw new BadRequestException("Ongeldige gebruikers-ID");
        }
        try {
            return UUID.fromString(subject);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Ongeldige gebruikers-ID");
        }
    }
}
