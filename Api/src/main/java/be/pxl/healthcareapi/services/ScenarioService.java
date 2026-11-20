package be.pxl.healthcareapi.services;

import be.pxl.healthcareapi.domein.Scenario;
import be.pxl.healthcareapi.domein.ScenarioEvaluation;
import be.pxl.healthcareapi.domein.ScenarioStatus;
import be.pxl.healthcareapi.dto.ScenarioDto;
import be.pxl.healthcareapi.dto.VitalsResponse;
import be.pxl.healthcareapi.exception.BadRequestException;
import be.pxl.healthcareapi.exception.NotFoundException;
import be.pxl.healthcareapi.repositories.ScenarioEvaluationRepository;
import be.pxl.healthcareapi.repositories.ScenarioRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(readOnly = true)
public class ScenarioService {
    private final ScenarioRepository scenarioRepository;
    private final ScenarioEvaluationRepository evaluationRepository;

    public ScenarioService(ScenarioRepository scenarioRepository, ScenarioEvaluationRepository evaluationRepository) {
        this.scenarioRepository = scenarioRepository;
        this.evaluationRepository = evaluationRepository;
    }

    @Transactional
    public ScenarioDto.Details create(ScenarioDto.Create request) {
        Scenario scenario = new Scenario(
                request.name().strip(), request.description().strip(),
                VitalsService.initialSnapshot(request.initialVitals()),
                cleanFeedbackItems(request), request.status());
        return toDetails(scenarioRepository.save(scenario));
    }

    @Transactional
    public ScenarioDto.Details updateDraft(UUID id, ScenarioDto.Create request) {
        Scenario scenario = findScenarioForUpdate(id);
        scenario.updateDraft(request.name().strip(), request.description().strip(),
                VitalsService.initialSnapshot(request.initialVitals()), cleanFeedbackItems(request), request.status());
        return toDetails(scenario);
    }

    @Transactional
    public void delete(UUID id) {
        Scenario scenario = findScenarioForUpdate(id);
        evaluationRepository.deleteByScenario_Id(id);
        scenarioRepository.delete(scenario);
    }

    public List<ScenarioDto.Details> list() {
        return scenarioRepository.findAll(Sort.by("name", "id")).stream().map(ScenarioService::toDetails).toList();
    }

    public ScenarioDto.Details get(UUID id) {
        return toDetails(findScenario(id));
    }

    @Transactional
    public ScenarioDto.Evaluation evaluate(UUID id, UUID evaluatorId, ScenarioDto.Evaluate request) {
        Scenario scenario = findScenarioForUpdate(id);
        if (scenario.getStatus() != ScenarioStatus.PUBLISHED) {
            throw new IllegalStateException("Publiceer het scenario voordat je het beoordeelt.");
        }
        List<Boolean> results = request.results();
        if (results.size() != scenario.getFeedbackItems().size()) {
            throw new BadRequestException("Geef precies een beoordeling per feedbackitem.");
        }
        return toEvaluation(evaluationRepository.save(new ScenarioEvaluation(scenario, evaluatorId, results)));
    }

    public ScenarioDto.Evaluation getEvaluation(UUID scenarioId, UUID evaluationId, UUID evaluatorId) {
        return evaluationRepository.findByIdAndScenario_IdAndEvaluatorId(evaluationId, scenarioId, evaluatorId)
                .map(ScenarioService::toEvaluation)
                .orElseThrow(() -> new NotFoundException("Evaluatie niet gevonden: " + evaluationId));
    }

    private Scenario findScenario(UUID id) {
        return scenarioRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Scenario niet gevonden: " + id));
    }

    private Scenario findScenarioForUpdate(UUID id) {
        return scenarioRepository.findForUpdate(id)
                .orElseThrow(() -> new NotFoundException("Scenario niet gevonden: " + id));
    }

    private static ScenarioDto.Details toDetails(Scenario scenario) {
        return new ScenarioDto.Details(scenario.getId(), scenario.getName(), scenario.getDescription(),
                VitalsResponse.from(scenario.getInitialVitals()), List.copyOf(scenario.getFeedbackItems()),
                scenario.getStatus());
    }

    private static List<String> cleanFeedbackItems(ScenarioDto.Create request) {
        return request.feedbackItems().stream().map(String::strip).toList();
    }

    private static ScenarioDto.Evaluation toEvaluation(ScenarioEvaluation evaluation) {
        return new ScenarioDto.Evaluation(evaluation.getId(), evaluation.getScenario().getId(),
                evaluation.getEvaluatorId(), evaluation.getEvaluatedAt(), List.copyOf(evaluation.getResults()));
    }
}
