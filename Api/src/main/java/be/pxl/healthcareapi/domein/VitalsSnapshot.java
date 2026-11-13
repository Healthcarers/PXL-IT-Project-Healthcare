package be.pxl.healthcareapi.domein;

public record VitalsSnapshot(double heartRate, double spo2, double ampScale) {
    public static VitalsSnapshot defaults() {
        return new  VitalsSnapshot(75, 98, 1.0);
    }
}
