package be.pxl.healthcareapi.repositories;

import be.pxl.healthcareapi.domein.ScenarioEvaluation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ScenarioEvaluationRepository extends JpaRepository<ScenarioEvaluation, UUID> {
    Optional<ScenarioEvaluation> findByIdAndScenario_IdAndEvaluatorId(UUID id, UUID scenarioId, UUID evaluatorId);

    void deleteByScenario_Id(UUID scenarioId);
}
