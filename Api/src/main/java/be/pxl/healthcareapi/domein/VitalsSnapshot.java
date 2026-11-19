package be.pxl.healthcareapi.domein;

import jakarta.persistence.Embeddable;

@Embeddable
public record VitalsSnapshot(double heartRate, double spo2, double respRate, double etco2, double ampScale, double sysBloodPressure, double diasBloodPressure) {
    public static VitalsSnapshot defaults() {
        return new  VitalsSnapshot(75, 98, 15, 38, 1.0, 120, 80);
    }
}
