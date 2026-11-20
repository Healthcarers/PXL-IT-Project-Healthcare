package be.pxl.healthcareapi.domein;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "scenarios")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Scenario {
    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 1000)
    private String description;

    @Embedded
    private VitalsSnapshot initialVitals;

    @Enumerated(EnumType.STRING)
    private ScenarioStatus status;

    @ElementCollection
    @CollectionTable(name = "scenario_feedback_items", joinColumns = @JoinColumn(name = "scenario_id"))
    @OrderColumn(name = "item_position")
    @Column(name = "item_text", nullable = false, length = 500)
    private List<String> feedbackItems = new ArrayList<>();

    public Scenario(String name, String description, VitalsSnapshot initialVitals, List<String> feedbackItems,
                    ScenarioStatus status) {
        this.name = name;
        this.description = description;
        this.initialVitals = initialVitals;
        this.feedbackItems = new ArrayList<>(feedbackItems);
        this.status = status;
    }

    public ScenarioStatus getStatus() {
        return status == null ? ScenarioStatus.PUBLISHED : status;
    }

    public void updateDraft(String name, String description, VitalsSnapshot initialVitals,
                            List<String> feedbackItems, ScenarioStatus status) {
        if (getStatus() != ScenarioStatus.DRAFT) {
            throw new IllegalStateException("Een gepubliceerd scenario kan niet worden aangepast.");
        }
        this.name = name;
        this.description = description;
        this.initialVitals = initialVitals;
        this.feedbackItems.clear();
        this.feedbackItems.addAll(feedbackItems);
        this.status = status;
    }
}
