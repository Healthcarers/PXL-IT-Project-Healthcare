package be.pxl.healthcareapi.domein;

public record VitalsSnapshot(double heartRate, double spo2, double respRate, double etco2, double ampScale) {
    public static VitalsSnapshot defaults() {
        return new  VitalsSnapshot(75, 98, 15, 38, 1.0);
    }
}
