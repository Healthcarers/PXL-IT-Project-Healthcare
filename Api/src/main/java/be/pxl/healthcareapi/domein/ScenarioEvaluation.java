package be.pxl.healthcareapi.domein;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "scenario_evaluations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ScenarioEvaluation {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "scenario_id", nullable = false)
    private Scenario scenario;

    @Column(nullable = false)
    private UUID evaluatorId;

    @Column(nullable = false)
    private Instant evaluatedAt;

    @ElementCollection
    @CollectionTable(name = "scenario_evaluation_results", joinColumns = @JoinColumn(name = "evaluation_id"))
    @OrderColumn(name = "item_position")
    @Column(name = "met", nullable = false)
    private List<Boolean> results = new ArrayList<>();

    public ScenarioEvaluation(Scenario scenario, UUID evaluatorId, List<Boolean> results) {
        this.scenario = scenario;
        this.evaluatorId = evaluatorId;
        this.evaluatedAt = Instant.now();
        this.results = new ArrayList<>(results);
    }
}
