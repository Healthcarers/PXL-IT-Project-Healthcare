package be.pxl.healthcareapi.domein;

import jakarta.persistence.Embeddable;

@Embeddable
public record VitalsSnapshot(double heartRate, double spo2, double respRate, double etco2, double ampScale,
                             double sysIbp, double diasIbp, Double temperature) {
    public static final double DEFAULT_TEMPERATURE = 36.5;

    public VitalsSnapshot {
        // Existing persisted scenarios have no temperature until their column is populated.
        if (temperature == null) temperature = DEFAULT_TEMPERATURE;
    }

    public static VitalsSnapshot defaults() {
        return new VitalsSnapshot(75, 98, 15, 38, 1.0, 120, 80, DEFAULT_TEMPERATURE);
    }
}
